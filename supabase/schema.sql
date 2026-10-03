-- ============================================================
--  Reggimento Arditi — schema del database Supabase
--  Incolla tutto in: Supabase → SQL Editor → New query → Run
-- ============================================================

-- ---------- PROFILI ----------
create table if not exists public.profili (
  id uuid primary key references auth.users on delete cascade,
  discord_id text,
  discord_nome text,
  nome text,
  avatar_url text,
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'membro', 'riserva', 'congedato')),
  grado int not null default 0 check (grado between 0 and 21),
  ruolo text,
  specializzazioni text[] not null default '{}',
  permessi text[] not null default '{}',
  punti_usati int not null default 0,
  creato_il timestamptz not null default now()
);

-- Permessi: 'admin' include tutti gli altri
create or replace function public.ha_permesso(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profili
    where id = auth.uid() and stato = 'membro' and ('admin' = any(permessi) or p = any(permessi))
  );
$$;

create or replace function public.is_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profili where id = auth.uid() and stato = 'membro');
$$;

-- Crea il profilo al primo login con Discord
create or replace function public.nuovo_utente() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := new.raw_user_meta_data;
begin
  insert into public.profili (id, discord_id, discord_nome, nome, avatar_url)
  values (
    new.id,
    m->>'provider_id',
    coalesce(m->'custom_claims'->>'global_name', m->>'full_name', m->>'name'),
    coalesce(m->'custom_claims'->>'global_name', m->>'full_name', m->>'name'),
    m->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.nuovo_utente();

-- Un membro può cambiare solo il proprio nome/avatar; gradi, ruoli, stato e punti
-- solo chi ha il permesso 'membri'; i permessi solo l'admin.
create or replace function public.proteggi_profilo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if; -- SQL Editor / service role
  if current_setting('arditi.promozione', true) = '1' then return new; end if; -- promozione automatica
  if not public.ha_permesso('membri') then
    new.stato := old.stato; new.grado := old.grado; new.ruolo := old.ruolo;
    new.specializzazioni := old.specializzazioni; new.punti_usati := old.punti_usati;
  end if;
  if not public.ha_permesso('admin') then
    new.permessi := old.permessi;
  end if;
  new.id := old.id; new.discord_id := old.discord_id;
  return new;
end $$;

drop trigger if exists proteggi_profilo on public.profili;
create trigger proteggi_profilo before update on public.profili
  for each row execute function public.proteggi_profilo();

alter table public.profili enable row level security;
-- L'organico è pubblico: chiunque vede i membri effettivi
drop policy if exists "profili_lettura" on public.profili;
create policy "profili_lettura" on public.profili for select
  using (stato = 'membro' or id = auth.uid() or public.is_membro());
drop policy if exists "profili_modifica" on public.profili;
create policy "profili_modifica" on public.profili for update
  using (id = auth.uid() or public.ha_permesso('membri'));
drop policy if exists "profili_elimina" on public.profili;
create policy "profili_elimina" on public.profili for delete
  using (public.ha_permesso('admin'));

-- ---------- EVENTI ----------
create table if not exists public.eventi (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  tipo text not null default 'milsim' check (tipo in ('milsim', 'addestramento', 'missione', 'riunione', 'altro')),
  inizio timestamptz not null,
  fine timestamptz,
  descrizione text,
  server text,
  campagna_id uuid,
  esito text check (esito in ('compiuta', 'fallita')),
  creato_da uuid default auth.uid() references public.profili on delete set null,
  creato_il timestamptz not null default now()
);
alter table public.eventi enable row level security;
drop policy if exists "eventi_lettura" on public.eventi;
create policy "eventi_lettura" on public.eventi for select using (public.is_membro());
drop policy if exists "eventi_scrittura" on public.eventi;
create policy "eventi_scrittura" on public.eventi for all
  using (public.ha_permesso('eventi')) with check (public.ha_permesso('eventi'));

-- ---------- PARTECIPANTI ----------
create table if not exists public.partecipanti (
  evento_id uuid not null references public.eventi on delete cascade,
  utente_id uuid not null references public.profili on delete cascade,
  stato text not null default 'iscritto' check (stato in ('iscritto', 'presente', 'assente')),
  creato_il timestamptz not null default now(),
  primary key (evento_id, utente_id)
);
alter table public.partecipanti enable row level security;
drop policy if exists "part_lettura" on public.partecipanti;
create policy "part_lettura" on public.partecipanti for select using (public.is_membro());
drop policy if exists "part_iscrizione" on public.partecipanti;
create policy "part_iscrizione" on public.partecipanti for insert with check (
  public.ha_permesso('eventi')
  or (utente_id = auth.uid() and public.is_membro() and stato = 'iscritto')
);
drop policy if exists "part_modifica" on public.partecipanti;
create policy "part_modifica" on public.partecipanti for update
  using (public.ha_permesso('eventi')) with check (public.ha_permesso('eventi'));
drop policy if exists "part_ritiro" on public.partecipanti;
create policy "part_ritiro" on public.partecipanti for delete using (
  public.ha_permesso('eventi') or (utente_id = auth.uid() and stato = 'iscritto')
);

-- ---------- DOCUMENTI ----------
create table if not exists public.documenti (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references public.eventi on delete cascade,
  titolo text not null,
  percorso text not null,
  caricato_da uuid default auth.uid() references public.profili on delete set null,
  creato_il timestamptz not null default now()
);
alter table public.documenti enable row level security;
drop policy if exists "doc_lettura" on public.documenti;
create policy "doc_lettura" on public.documenti for select using (public.is_membro());
drop policy if exists "doc_scrittura" on public.documenti;
create policy "doc_scrittura" on public.documenti for all
  using (public.ha_permesso('eventi')) with check (public.ha_permesso('eventi'));

-- Bucket privato per i file (briefing, ORBAT, mappe…)
insert into storage.buckets (id, name, public, file_size_limit)
values ('documenti', 'documenti', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "file_lettura_membri" on storage.objects;
create policy "file_lettura_membri" on storage.objects for select
  using (bucket_id = 'documenti' and public.is_membro());
drop policy if exists "file_caricamento" on storage.objects;
create policy "file_caricamento" on storage.objects for insert
  with check (bucket_id = 'documenti' and (public.ha_permesso('eventi') or public.ha_permesso('campagna')));
drop policy if exists "file_eliminazione" on storage.objects;
create policy "file_eliminazione" on storage.objects for delete
  using (bucket_id = 'documenti' and (public.ha_permesso('eventi') or public.ha_permesso('campagna')));

-- ---------- COMUNICAZIONI ----------
create table if not exists public.comunicazioni (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  testo text not null,
  priorita text not null default 'normale' check (priorita in ('normale', 'importante', 'urgente')),
  autore uuid default auth.uid() references public.profili on delete set null,
  creato_il timestamptz not null default now()
);
alter table public.comunicazioni enable row level security;
drop policy if exists "com_lettura" on public.comunicazioni;
create policy "com_lettura" on public.comunicazioni for select using (public.is_membro());
drop policy if exists "com_scrittura" on public.comunicazioni;
create policy "com_scrittura" on public.comunicazioni for all
  using (public.ha_permesso('comunicazioni')) with check (public.ha_permesso('comunicazioni'));

-- ---------- SERVER ----------
create table if not exists public.server (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'pvp' check (tipo in ('privato', 'pvp', 'altro')),
  ip text not null,
  porta int,
  descrizione text,
  battlemetrics_id text,
  ordine int not null default 10,
  creato_il timestamptz not null default now()
);
alter table public.server enable row level security;
drop policy if exists "server_lettura" on public.server;
create policy "server_lettura" on public.server for select using (public.is_membro());
drop policy if exists "server_scrittura" on public.server;
create policy "server_scrittura" on public.server for all
  using (public.ha_permesso('server')) with check (public.ha_permesso('server'));

-- ---------- CONTENUTI: tutti i testi del sito modificabili dagli amministratori ----------
create table if not exists public.contenuti (
  chiave text primary key,
  testo text not null default ''
);
alter table public.contenuti enable row level security;
drop policy if exists "cont_lettura" on public.contenuti;
create policy "cont_lettura" on public.contenuti for select using (true);
drop policy if exists "cont_scrittura" on public.contenuti;
create policy "cont_scrittura" on public.contenuti for all
  using (public.ha_permesso('admin')) with check (public.ha_permesso('admin'));

-- ---------- CAMPAGNE ----------
create table if not exists public.campagne (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  sottotitolo text,
  stato text not null default 'pianificata' check (stato in ('pianificata', 'attiva', 'conclusa')),
  briefing text not null default '',
  mappa text not null default '',       -- URL immagine satellitare
  copertina text not null default '',   -- URL immagine di copertina
  ordine int not null default 10,
  creato_il timestamptz not null default now()
);
alter table public.campagne enable row level security;
drop policy if exists "camp_lettura" on public.campagne;
create policy "camp_lettura" on public.campagne for select using (public.is_membro());
drop policy if exists "camp_scrittura" on public.campagne;
create policy "camp_scrittura" on public.campagne for all
  using (public.ha_permesso('campagna')) with check (public.ha_permesso('campagna'));

-- Collega gli eventi alle campagne
alter table public.eventi drop constraint if exists eventi_campagna_fk;
alter table public.eventi add constraint eventi_campagna_fk
  foreign key (campagna_id) references public.campagne on delete set null;

-- Pagine personalizzate di ogni campagna (Fazioni, Regole, Intelligence…)
create table if not exists public.campagna_pagine (
  id uuid primary key default gen_random_uuid(),
  campagna_id uuid not null references public.campagne on delete cascade,
  titolo text not null,
  testo text not null default '',
  ordine int not null default 10,
  creato_il timestamptz not null default now()
);
alter table public.campagna_pagine enable row level security;
drop policy if exists "cpag_lettura" on public.campagna_pagine;
create policy "cpag_lettura" on public.campagna_pagine for select using (public.is_membro());
drop policy if exists "cpag_scrittura" on public.campagna_pagine;
create policy "cpag_scrittura" on public.campagna_pagine for all
  using (public.ha_permesso('campagna')) with check (public.ha_permesso('campagna'));

-- Settori sulla mappa della campagna
create table if not exists public.settori (
  id uuid primary key default gen_random_uuid(),
  campagna_id uuid not null references public.campagne on delete cascade,
  nome text not null,
  stato text not null default 'sconosciuto' check (stato in ('alleato', 'conteso', 'nemico', 'sconosciuto')),
  x numeric not null default 50 check (x between 0 and 100),
  y numeric not null default 50 check (y between 0 and 100),
  raggio numeric not null default 5 check (raggio between 0 and 50),
  descrizione text,
  creato_il timestamptz not null default now()
);
alter table public.settori enable row level security;
drop policy if exists "set_lettura" on public.settori;
create policy "set_lettura" on public.settori for select using (public.is_membro());
drop policy if exists "set_scrittura" on public.settori;
create policy "set_scrittura" on public.settori for all
  using (public.ha_permesso('campagna')) with check (public.ha_permesso('campagna'));

-- Bucket pubblico per mappe satellitari e copertine
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('immagini', 'immagini', true, 20971520, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;
drop policy if exists "img_caricamento" on storage.objects;
create policy "img_caricamento" on storage.objects for insert
  with check (bucket_id = 'immagini' and public.ha_permesso('campagna'));
drop policy if exists "img_eliminazione" on storage.objects;
create policy "img_eliminazione" on storage.objects for delete
  using (bucket_id = 'immagini' and public.ha_permesso('campagna'));

-- Documenti riservati delle campagne (allegati nel bucket privato "documenti")
create table if not exists public.campagna_documenti (
  id uuid primary key default gen_random_uuid(),
  campagna_id uuid not null references public.campagne on delete cascade,
  titolo text not null,
  classificazione text not null default 'riservato' check (classificazione in ('riservato', 'riservatissimo', 'segreto', 'segretissimo')),
  protocollo text,
  data_documento text,
  testo text not null default '',
  file text not null default '',
  creato_il timestamptz not null default now()
);
alter table public.campagna_documenti enable row level security;
drop policy if exists "cdoc_lettura" on public.campagna_documenti;
create policy "cdoc_lettura" on public.campagna_documenti for select using (public.is_membro());
drop policy if exists "cdoc_scrittura" on public.campagna_documenti;
create policy "cdoc_scrittura" on public.campagna_documenti for all
  using (public.ha_permesso('campagna')) with check (public.ha_permesso('campagna'));

-- Articoli di giornale delle campagne (roleplay)
create table if not exists public.campagna_articoli (
  id uuid primary key default gen_random_uuid(),
  campagna_id uuid not null references public.campagne on delete cascade,
  testata text not null,
  titolo text not null,
  sommario text,
  autore text,
  data_articolo text,
  immagine text not null default '',
  testo text not null default '',
  creato_il timestamptz not null default now()
);
alter table public.campagna_articoli enable row level security;
drop policy if exists "cart_lettura" on public.campagna_articoli;
create policy "cart_lettura" on public.campagna_articoli for select using (public.is_membro());
drop policy if exists "cart_scrittura" on public.campagna_articoli;
create policy "cart_scrittura" on public.campagna_articoli for all
  using (public.ha_permesso('campagna')) with check (public.ha_permesso('campagna'));

-- ---------- SOCIAL (pubblici, modificabili dagli amministratori) ----------
create table if not exists public.social (
  id uuid primary key default gen_random_uuid(),
  piattaforma text not null default 'altro',
  nome text,
  url text not null,
  descrizione text,
  ordine int not null default 10,
  creato_il timestamptz not null default now()
);
alter table public.social enable row level security;
drop policy if exists "soc_lettura" on public.social;
create policy "soc_lettura" on public.social for select using (true);
drop policy if exists "soc_scrittura" on public.social;
create policy "soc_scrittura" on public.social for all
  using (public.ha_permesso('admin')) with check (public.ha_permesso('admin'));
insert into public.social (piattaforma, nome, url, descrizione, ordine)
select 'discord', 'Server Discord', 'https://discord.gg/sebbFmjhze', 'La base operativa del Reggimento.', 1
where not exists (select 1 from public.social);

-- ---------- LISTA MOD (scritta solo dalla funzione "mod-workshop") ----------
create table if not exists public.mods (
  id text primary key,                 -- ID del Workshop
  nome text not null,
  autore text,
  versione text,
  dimensione bigint,
  aggiornata_il timestamptz,
  immagine text,
  url text,
  principale boolean not null default true,   -- false = aggiunta come dipendenza
  dipendenza_di text[] not null default '{}'
);
alter table public.mods enable row level security;
drop policy if exists "mods_lettura" on public.mods;
create policy "mods_lettura" on public.mods for select using (public.is_membro());

create table if not exists public.mods_changelog (
  id uuid primary key default gen_random_uuid(),
  data timestamptz not null default now(),
  iniziale boolean not null default false,
  totale_prima bigint not null default 0,
  totale_dopo bigint not null default 0,
  aggiunte jsonb not null default '[]',
  rimosse jsonb not null default '[]',
  aggiornate jsonb not null default '[]'
);
alter table public.mods_changelog enable row level security;
drop policy if exists "modlog_lettura" on public.mods_changelog;
create policy "modlog_lettura" on public.mods_changelog for select using (public.is_membro());

-- ---------- PUNTI MANUALI E PROMOZIONE AUTOMATICA ----------
create table if not exists public.punti_manuali (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references public.profili on delete cascade,
  punti int not null check (punti <> 0),
  motivo text,
  assegnato_da uuid default auth.uid() references public.profili on delete set null,
  creato_il timestamptz not null default now()
);
alter table public.punti_manuali enable row level security;
drop policy if exists "pm_lettura" on public.punti_manuali;
create policy "pm_lettura" on public.punti_manuali for select using (public.is_membro());
drop policy if exists "pm_scrittura" on public.punti_manuali;
create policy "pm_scrittura" on public.punti_manuali for all
  using (public.ha_permesso('membri')) with check (public.ha_permesso('membri'));

-- Punti totali di un membro. ATTENZIONE: se cambi i valori in js/config.js (CONFIG.PUNTI)
-- aggiornali anche qui.
create or replace function public.punti_totali(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((
    select sum(case
      when e.tipo in ('addestramento', 'milsim') then 1
      when e.tipo = 'missione' and e.esito = 'compiuta' then 2
      when e.tipo = 'missione' and e.esito = 'fallita' then 1
      else 0 end)
    from public.partecipanti p join public.eventi e on e.id = p.evento_id
    where p.utente_id = uid and p.stato = 'presente'), 0)
  + coalesce((select sum(punti) from public.punti_manuali where utente_id = uid), 0);
$$;

-- Ogni 20 punti grado il membro sale di un grado (fino a Capitano = 21)
create or replace function public.promozione_automatica(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g int; usati int; disponibili int;
begin
  select grado, punti_usati into g, usati from public.profili where id = uid and stato = 'membro';
  if not found then return; end if;
  disponibili := public.punti_totali(uid) - usati;
  if disponibili < 20 or g >= 21 then return; end if;
  while disponibili >= 20 and g < 21 loop
    g := g + 1; usati := usati + 20; disponibili := disponibili - 20;
  end loop;
  perform set_config('arditi.promozione', '1', true);
  update public.profili set grado = g, punti_usati = usati where id = uid;
  perform set_config('arditi.promozione', '0', true);
end $$;

create or replace function public.trg_promozione_partecipanti() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.promozione_automatica(coalesce(new.utente_id, old.utente_id));
  return null;
end $$;
drop trigger if exists promozione_partecipanti on public.partecipanti;
create trigger promozione_partecipanti after insert or update or delete on public.partecipanti
  for each row execute function public.trg_promozione_partecipanti();

create or replace function public.trg_promozione_punti() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.promozione_automatica(coalesce(new.utente_id, old.utente_id));
  return null;
end $$;
drop trigger if exists promozione_punti on public.punti_manuali;
create trigger promozione_punti after insert or update or delete on public.punti_manuali
  for each row execute function public.trg_promozione_punti();

create or replace function public.trg_promozione_eventi() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select utente_id from public.partecipanti where evento_id = new.id and stato = 'presente' loop
    perform public.promozione_automatica(r.utente_id);
  end loop;
  return null;
end $$;
drop trigger if exists promozione_eventi on public.eventi;
create trigger promozione_eventi after update of esito, tipo on public.eventi
  for each row execute function public.trg_promozione_eventi();

-- ---------- CANDIDATURE ----------
create table if not exists public.candidature (
  id uuid primary key default gen_random_uuid(),
  discord_nome text not null check (char_length(discord_nome) <= 60),
  eta int check (eta between 13 and 99),
  disponibilita text check (char_length(disponibilita) <= 200),
  esperienza text check (char_length(esperienza) <= 1000),
  ruolo_preferito text,
  motivazione text check (char_length(motivazione) <= 2000),
  provenienza text check (char_length(provenienza) <= 200),
  stato text not null default 'nuova' check (stato in ('nuova', 'in_valutazione', 'accettata', 'rifiutata')),
  creato_il timestamptz not null default now()
);
alter table public.candidature enable row level security;
drop policy if exists "cand_invio" on public.candidature;
create policy "cand_invio" on public.candidature for insert to anon, authenticated
  with check (stato = 'nuova');
drop policy if exists "cand_gestione" on public.candidature;
create policy "cand_gestione" on public.candidature for all
  using (public.ha_permesso('reclutamento')) with check (public.ha_permesso('reclutamento'));

-- ---------- TESTI INIZIALI ----------
insert into public.contenuti (chiave, testo) values
('chi-siamo', 'Il **Reggimento Arditi** è un gruppo milsim italiano su **Arma Reforger**.

### Cosa facciamo
- **Milsim** settimanali sul nostro server privato
- **Addestramenti** su tattiche, radio, soccorso e mezzi
- **Campagne persistenti**, dove ogni missione cambia la situazione sul campo
- Partite **PvP** sui server pubblici, in squadra')
on conflict (chiave) do nothing;

-- Prima campagna (solo se non ne esiste ancora nessuna)
insert into public.campagne (titolo, sottotitolo, stato, briefing, ordine)
select 'Campagna Gogland', 'Isola di Gogland', 'attiva', 'Scrivi qui il briefing della campagna.', 1
where not exists (select 1 from public.campagne);

-- ---------- PERMESSI DI ACCESSO ALLE TABELLE ----------
-- I progetti Supabase recenti non concedono più l'accesso in automatico.
-- Chi vede o modifica cosa resta deciso dalle regole (policy) definite sopra.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant insert on public.candidature to anon;
grant execute on all functions in schema public to anon, authenticated;
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant insert, update, delete on tables to authenticated;
-- Accesso completo per le funzioni lato server (mod-workshop, candidatura-discord)
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;

// Supabase Edge Function "mod-workshop"
// Legge le mod dal Workshop di Arma Reforger (nome, versione, peso, dipendenze),
// salva la lista nella tabella "mods" e registra le differenze in "mods_changelog".
//
// Chiamate:
//   { azione: "salva", testo: "<link o ID, uno per riga>" }  → dal sito (permesso "mod" o "admin")
//   { azione: "aggiorna" }                                   → dal sito, oppure da GitHub Actions con header x-cron-secret
//
// Segreti: CRON_SECRET (obbligatorio per il controllo automatico), DISCORD_WEBHOOK_MODS (facoltativo), SITE_URL (facoltativo)
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const risposta = (dati: unknown, status = 200) =>
  new Response(JSON.stringify(dati), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Mod = {
  id: string; nome: string; autore: string | null; versione: string | null; dimensione: number | null;
  aggiornata_il: string | null; immagine: string | null; url: string; principale: boolean; dipendenza_di: string[];
};

// ---------- Lettura dal Workshop ----------
async function leggiMod(id: string): Promise<Mod & { deps: string[] }> {
  const r = await fetch(`https://reforger.armaplatform.com/workshop/${id}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (ReggimentoArditi mod-list bot)' },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('dati non trovati nella pagina');
  const a = JSON.parse(m[1])?.props?.pageProps?.asset;
  if (!a?.id) throw new Error('mod non trovata');
  let immagine: string | null = null;
  const p = a.previews?.[0];
  if (p) {
    const thumbs = p.thumbnails?.['image/jpeg'] as { url: string; width: number }[] | undefined;
    immagine = thumbs?.length ? [...thumbs].sort((x, y) => x.width - y.width)[0].url : p.url ?? null;
  }
  return {
    id: String(a.id).toUpperCase(),
    nome: a.name,
    autore: a.author?.username ?? null,
    versione: a.currentVersionNumber ?? null,
    dimensione: Number(a.currentVersionSize) || null,
    aggiornata_il: a.updatedAt ?? null,
    immagine,
    url: `https://reforger.armaplatform.com/workshop/${a.id}`,
    principale: true,
    dipendenza_di: [],
    deps: (a.dependencies ?? []).map((d: { asset: { id: string } }) => String(d.asset.id).toUpperCase()),
  };
}

function estraiId(testo: string): string[] {
  const out: string[] = [];
  for (const riga of String(testo || '').split(/\r?\n/)) {
    for (const m of riga.split('#')[0].matchAll(/\b([0-9A-Fa-f]{16})\b/g)) {
      const id = m[1].toUpperCase();
      if (!out.includes(id)) out.push(id);
    }
  }
  return out;
}

// Risolve le mod richieste e tutte le loro dipendenze (4 richieste in parallelo)
async function risolvi(principali: string[], precedenti: Map<string, Mod>) {
  const mods = new Map<string, Mod>();
  const dipDi = new Map<string, Set<string>>();
  const errori: string[] = [];
  let coda = [...principali];
  while (coda.length) {
    const lotto = coda.splice(0, 4).filter((id) => !mods.has(id));
    const letti = await Promise.all(lotto.map(async (id) => {
      try { return await leggiMod(id); } catch (e) {
        errori.push(id);
        console.error(id, e);
        const p = precedenti.get(id); // in caso di errore teniamo i dati precedenti
        return { ...(p ?? { id, nome: `Mod ${id} (non trovata)`, autore: null, versione: '?', dimensione: null, aggiornata_il: null, immagine: null, url: `https://reforger.armaplatform.com/workshop/${id}`, dipendenza_di: [] }), principale: true, deps: [] as string[] };
      }
    }));
    for (const m of letti) {
      mods.set(m.id, m);
      for (const d of m.deps) {
        if (!principali.includes(d)) {
          if (!dipDi.has(d)) dipDi.set(d, new Set());
          dipDi.get(d)!.add(m.nome);
        }
        if (!mods.has(d) && !coda.includes(d)) coda.push(d);
      }
    }
  }
  const lista: Mod[] = [...mods.values()].map(({ deps: _deps, ...m }: Mod & { deps?: string[] }) => ({
    ...m,
    principale: principali.includes(m.id),
    dipendenza_di: [...(dipDi.get(m.id) ?? [])],
  }));
  lista.sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));
  if (errori.length === lista.length) throw new Error('Impossibile leggere il Workshop in questo momento. Riprova più tardi.');
  return { lista, errori };
}

// ---------- Confronto e changelog ----------
const totale = (l: Mod[]) => l.reduce((s, m) => s + (Number(m.dimensione) || 0), 0);
function confronta(prima: Mod[], dopo: Mod[]) {
  const pById = new Map(prima.map((m) => [m.id, m]));
  const nById = new Map(dopo.map((m) => [m.id, m]));
  const breve = (m: Mod) => ({ id: m.id, nome: m.nome, versione: m.versione, dimensione: Number(m.dimensione) || 0 });
  const aggiunte = dopo.filter((m) => !pById.has(m.id)).map(breve);
  const rimosse = prima.filter((m) => !nById.has(m.id)).map(breve);
  const aggiornate = dopo.filter((m) => pById.has(m.id) && pById.get(m.id)!.versione !== m.versione).map((m) => ({
    id: m.id, nome: m.nome, da: pById.get(m.id)!.versione, a: m.versione,
    dimensione_da: Number(pById.get(m.id)!.dimensione) || 0, dimensione_a: Number(m.dimensione) || 0,
  }));
  if (prima.length && !aggiunte.length && !rimosse.length && !aggiornate.length) return null;
  return { data: new Date().toISOString(), iniziale: prima.length === 0, totale_prima: totale(prima), totale_dopo: totale(dopo), aggiunte, rimosse, aggiornate };
}

async function notificaDiscord(voce: NonNullable<ReturnType<typeof confronta>>) {
  const hook = Deno.env.get('DISCORD_WEBHOOK_MODS');
  if (!hook || voce.iniziale) return;
  const mb = (b: number) => `${Math.round(b / 1048576).toLocaleString('it-IT')} MB`;
  const righe = [
    ...voce.aggiunte.map((m) => `🟢 **${m.nome}** ${m.versione ?? ''} (${mb(m.dimensione)})`),
    ...voce.rimosse.map((m) => `🔴 ~~${m.nome}~~`),
    ...voce.aggiornate.map((m) => `🟡 **${m.nome}** ${m.da} → ${m.a}`),
  ].slice(0, 30);
  const sito = Deno.env.get('SITE_URL');
  await fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Reggimento Arditi - Mod',
      embeds: [{ title: 'Aggiornamento lista mod', url: sito ? `${sito}#/mod` : undefined, color: 7702858,
        description: `${righe.join('\n')}\n\n**Peso totale:** ${mb(voce.totale_prima)} → ${mb(voce.totale_dopo)}` }],
    }),
  }).catch((e) => console.error('Discord', e));
}

// ---------- Richiesta ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));

    // Autorizzazione: segreto del controllo automatico, oppure utente con permesso "mod"/"admin"
    const cron = Deno.env.get('CRON_SECRET');
    const daCron = !!cron && req.headers.get('x-cron-secret') === cron;
    if (!daCron) {
      const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
      const { data: u } = await admin.auth.getUser(token);
      if (!u?.user) return risposta({ errore: 'Accesso richiesto.' }, 401);
      const { data: p, error: eProf } = await admin.from('profili').select('stato, permessi').eq('id', u.user.id).single();
      if (eProf) throw new Error(`Impossibile leggere il profilo: ${eProf.message}`);
      const perm: string[] = p?.permessi ?? [];
      if (p?.stato !== 'membro' || !(perm.includes('admin') || perm.includes('mod'))) {
        return risposta({ errore: 'Non hai il permesso di gestire la lista mod.' }, 403);
      }
    }

    const { data: attuali, error: e1 } = await admin.from('mods').select('*');
    if (e1) throw e1;
    const prima = (attuali ?? []) as Mod[];
    const precedenti = new Map(prima.map((m) => [m.id, m]));

    let principali: string[];
    if (body.azione === 'salva') {
      principali = estraiId(body.testo);
      if (!principali.length) return risposta({ errore: 'Nessun link o ID di mod trovato nel testo.' }, 400);
    } else if (body.azione === 'aggiorna') {
      principali = prima.filter((m) => m.principale).map((m) => m.id);
      if (!principali.length) return risposta({ cambiato: false, mods: [] });
    } else {
      return risposta({ errore: 'Azione non valida.' }, 400);
    }

    const { lista, errori } = await risolvi(principali, precedenti);
    const voce = confronta(prima, lista);

    // Salva sempre i dettagli aggiornati (immagini, nomi), anche senza cambi di versione
    const daRimuovere = prima.filter((m) => !lista.some((n) => n.id === m.id)).map((m) => m.id);
    if (daRimuovere.length) {
      const { error } = await admin.from('mods').delete().in('id', daRimuovere);
      if (error) throw error;
    }
    const { error: e2 } = await admin.from('mods').upsert(lista);
    if (e2) throw e2;
    if (voce) {
      const { error: e3 } = await admin.from('mods_changelog').insert(voce);
      if (e3) throw e3;
      await notificaDiscord(voce);
    }
    return risposta({ cambiato: !!voce, voce, mods: lista, errori });
  } catch (e) {
    console.error(e);
    return risposta({ errore: e instanceof Error ? e.message : String(e) }, 500);
  }
});

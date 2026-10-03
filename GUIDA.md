# Guida alla messa online — Sito Reggimento Arditi

Tempo richiesto: circa 30–40 minuti, una sola volta. Tutto gratuito.

| Servizio | A cosa serve |
|---|---|
| **GitHub Pages** | ospita il sito |
| **GitHub Actions** | controlla gli aggiornamenti delle mod ogni 3 ore e tiene attivo il database |
| **Supabase** | login Discord, database, file allegati e la funzione che legge le mod dal Workshop |
| **Discord Developer Portal** | permette il login con Discord |

> Finché non completi il passo 4 il sito funziona in **modalità demo** con dati di esempio.

---

## 1. Pubblica il sito su GitHub

1. Vai su <https://github.com/new>.
   - Nome repository: `reggimento-arditi`
   - Visibilità: **Public** (GitHub Pages gratuito richiede un repository pubblico)
   - Premi **Create repository**.
2. Nella pagina del repository vuoto clicca **uploading an existing file**.
3. Trascina **tutto il contenuto** della cartella `reggimento-arditi` (comprese le cartelle `.github`, `js`, `css`, `supabase`, `assets`, `tools`), poi **Commit changes**.
   - Controlla che la cartella `.github/workflows` sia stata caricata: se manca, crea i due file a mano con **Add file → Create new file** scrivendo come nome `.github/workflows/controlla-mod.yml` (e poi `keepalive.yml`) e incollando il contenuto.
4. **Settings → Pages** → *Source*: **Deploy from a branch** → Branch **main**, cartella **/ (root)** → **Save**.

Dopo 1–2 minuti il sito è online su:
`https://TUO-NOME-GITHUB.github.io/reggimento-arditi/`

---

## 2. Crea il database su Supabase

1. Registrati su <https://supabase.com> (puoi accedere con GitHub).
2. **New project**:
   - Name: `reggimento-arditi`
   - Database password: generane una e **salvala**
   - Region: **Central EU (Frankfurt)**
3. Quando il progetto è pronto apri **SQL Editor → New query**, incolla tutto il contenuto di `supabase/schema.sql` e premi **Run**. Deve comparire *Success*.
4. Apri **Project Settings → API** (o *Data API*) e copia:
   - **Project URL** (es. `https://abcdefgh.supabase.co`)
   - **anon public key** (una stringa lunga che inizia con `eyJ…`)

> La chiave *anon* è pensata per stare nel sito pubblico: la sicurezza è garantita dalle regole del database (chi può leggere/scrivere cosa). **Non** usare mai la chiave `service_role`.

---

## 3. Attiva il login con Discord

1. Vai su <https://discord.com/developers/applications> → **New Application** → nome `Reggimento Arditi`.
2. Nel menu **OAuth2**:
   - copia il **Client ID**
   - premi **Reset Secret** e copia il **Client Secret**
   - in **Redirects** aggiungi: `https://abcdefgh.supabase.co/auth/v1/callback` (sostituisci con il tuo Project URL) → **Save Changes**
3. Su Supabase: **Authentication → Sign In / Providers → Discord** → attiva, incolla Client ID e Client Secret → **Save**.
4. Su Supabase: **Authentication → URL Configuration**:
   - **Site URL**: `https://TUO-NOME-GITHUB.github.io/reggimento-arditi/`
   - **Redirect URLs**: aggiungi lo stesso indirizzo e anche `http://localhost:8080/**` (per le prove sul PC).

---

## 4. Collega il sito a Supabase

Su GitHub apri `js/config.js`, premi la matita ✏️ e compila:

```js
SUPABASE_URL: 'https://abcdefgh.supabase.co',
SUPABASE_ANON_KEY: 'eyJ...la-tua-chiave...',
```

**Commit changes**. Dopo un minuto il sito non è più in demo.

---

## 5. Diventa amministratore

1. Apri il sito e premi **Accedi con Discord**. Il tuo account viene creato "in attesa".
2. Su Supabase apri **SQL Editor** ed esegui:

```sql
select id, discord_nome, nome from profili;
```

3. Poi, con il tuo nome Discord:

```sql
update profili
set stato = 'membro', permessi = '{admin}', grado = 21, ruolo = 'Marconista'
where discord_nome = 'IL-TUO-NOME-DISCORD';
```

(`grado = 21` è Capitano; 0 è Recluta.) Ricarica il sito: ora vedi tutte le sezioni, **Gestione** e il pulsante **✎ Testi**.

Da qui in poi fai tutto dal sito:
- **Gestione** → approvi chi accede con Discord (entra come Recluta)
- **Profilo di un membro → Gestisci membro** → grado, ruolo, specializzazioni
- **Profilo → Permessi** → dai a qualcuno il permesso di gestire eventi, comunicazioni, server, campagne, candidature o membri. Chi riceve **Amministratore** può fare tutto, compresa la modifica dei testi del sito.

---

## 6. Lista mod (dal sito)

Il Workshop di Reforger non si lascia leggere direttamente dal browser, quindi il peso delle mod lo legge una piccola funzione su Supabase. Va pubblicata una volta sola:

1. Su Supabase: **Edge Functions → Deploy a new function → Via editor**.
2. Nome: `mod-workshop`. Incolla tutto il contenuto di `supabase/functions/mod-workshop/index.ts`.
3. Nelle impostazioni della funzione **disattiva "Verify JWT"** (i permessi li controlla la funzione stessa) e premi **Deploy**.
4. **Edge Functions → Secrets → Add new secret**:
   - `CRON_SECRET` = una parola segreta lunga inventata da te (es. generata da un password manager)
   - (facoltativo) `DISCORD_WEBHOOK_MODS` = URL di un webhook Discord: ogni modifica della lista viene annunciata nel canale
   - (facoltativo) `SITE_URL` = `https://TUO-NOME-GITHUB.github.io/reggimento-arditi/`

**Come si usa:** pagina **Mod → Gestisci lista mod**, incolla i link del Workshop **uno per riga** e premi **Controlla e salva**. Il sito legge nome, versione e peso di ogni mod, aggiunge da solo le dipendenze, ordina tutto, calcola il totale e scrive il changelog (aggiunte, rimosse, aggiornate). Per togliere una mod basta cancellarne la riga.

Può gestire la lista chi ha il permesso **Mod** (o Amministratore).

---

## 7. Controlli automatici (GitHub Actions)

Su GitHub: **Settings → Secrets and variables → Actions**.

Scheda **Variables → New repository variable**:
- `SUPABASE_URL` = il Project URL
- `SUPABASE_ANON_KEY` = la chiave anon

Scheda **Secrets → New repository secret**:
- `CRON_SECRET` = la **stessa** parola segreta messa su Supabase al passo 6

Da quel momento:
- *Controlla aggiornamenti mod* ricontrolla il Workshop ogni 3 ore: se una mod viene aggiornata, il changelog si aggiorna da solo (c'è anche il pulsante **Controlla aggiornamenti** nella pagina Mod).
- *Mantieni attivo Supabase* fa una lettura al giorno, così il piano gratuito non mette in pausa il progetto dopo 7 giorni senza visite.

> GitHub disattiva le azioni programmate dopo 60 giorni senza modifiche al repository: se succede ti arriva un'email, basta premere **Enable workflow** nella scheda Actions.

---

## 8. (Facoltativo) Candidature notificate su Discord

1. Crea un webhook nel canale Discord dello staff (come al passo 6).
2. Su Supabase: **Edge Functions → Deploy a new function → Via editor**, nome `candidatura-discord`, incolla `supabase/functions/candidatura-discord/index.ts`, **disattiva "Verify JWT"** e pubblica.
3. **Edge Functions → Secrets**: aggiungi `DISCORD_WEBHOOK_CANDIDATURE` (URL webhook) e `WEBHOOK_SECRET` (una parola segreta inventata).
4. **Database → Webhooks → Create a new hook**: tabella `candidature`, evento **Insert**, tipo **Supabase Edge Functions** → `candidatura-discord`, aggiungi header HTTP `x-webhook-secret` con la stessa parola segreta.

---

## Uso quotidiano

**Cosa vede chi non ha fatto l'accesso:** solo Home, Chi siamo, Organico, Social e Reclutamento. Tutto il resto è riservato ai membri approvati.

**Direttivo:** nella pagina Organico, in cima, compaiono automaticamente tutti i membri a cui hai dato almeno un permesso.

| Cosa | Dove | Permesso |
|---|---|---|
| **Modificare qualsiasi testo del sito** | Pulsante **✎ Testi** in alto → clicca su un testo, scrivi, premi Invio | admin |
| Creare/modificare milsim, missioni, addestramenti | Calendario → *Nuovo evento* | eventi |
| Allegare briefing, ORBAT, mappe (max 50 MB) | Pagina evento → *Allega file* | eventi |
| Segnare le presenze (assegna i punti) | Pagina evento → menu accanto a ogni partecipante → *Presente* | eventi |
| Esito missione (compiuta = 2 punti, fallita = 1) | Pagina evento → *Esito missione* | eventi |
| Aggiungere o togliere punti (con motivo) | Profilo → *Aggiungi / togli punti* (numero negativo per togliere) | membri |
| Promozione | **Automatica** ogni 20 punti grado. Per promuovere subito: Profilo → *Promozione sul campo* | membri |
| Lista mod | Mod → *Gestisci lista mod* → incolla i link | mod |
| Social (Instagram, TikTok, Twitch…) | Social → *Aggiungi social*, matita per modificare | admin |
| Comunicazioni | Comunicazioni → *Nuova comunicazione* | comunicazioni |
| Server | Server → *Aggiungi server* | server |
| Nuova campagna | Campagne → *Nuova campagna* | campagna |
| Pagine della campagna (Fazioni, Regole…) | Pagina campagna → *+ Pagina* | campagna |
| Documenti riservati (con classificazione e allegati) | Campagna → *Documenti riservati* → *Nuovo documento* | campagna |
| Articoli di giornale (roleplay) | Campagna → *Stampa* → *Nuovo articolo* | campagna |
| Mappa satellitare | Campagna → *Situazione tattica* → *Carica immagine satellitare* | campagna |
| Settori | Clic sulla mappa per crearli, trascinali per spostarli, clic per modificarli | campagna |
| Candidature | Gestione | reclutamento |

**Consiglio per la mappa satellitare:** fai uno screenshot della mappa dall'editor o dal gioco (vista satellite), ritaglialo sull'area della campagna e caricalo in JPG o WebP, da 2000 a 4000 pixel di lato e non più di 20 MB. I settori sono posizionati in percentuale, quindi restano al loro posto anche cambiando l'immagine con una della stessa area.

I gradi, i ruoli e le specializzazioni si cambiano in `js/config.js`. Se cambi i **valori dei punti**, aggiornali sia in `js/config.js` sia nella funzione `punti_totali` di `supabase/schema.sql` (poi riesegui quella parte nello SQL Editor), perché la promozione automatica la calcola il database.

## Provare il sito sul PC

Tasto destro su `tools/serve.ps1` → **Esegui con PowerShell**, poi apri <http://localhost:8080>.

## Dominio personalizzato (facoltativo)

Se comprate un dominio (es. `reggimentoarditi.it`, circa 10 €/anno): **Settings → Pages → Custom domain**, poi seguite le istruzioni DNS di GitHub. Ricordatevi di aggiornare *Site URL* e *Redirect URLs* su Supabase.

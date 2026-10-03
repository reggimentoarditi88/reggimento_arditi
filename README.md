# Reggimento Arditi — sito web

Sito del gruppo milsim italiano **Reggimento Arditi** (Arma Reforger).

- **Pubbliche:** home, chi siamo, organico (con il Direttivo in cima), social, reclutamento con questionario
- **Membri (login Discord):** calendario con documenti e partecipanti, comunicazioni, campagne (mappa satellitare, documenti riservati, stampa, pagine libere), server, lista mod con peso e changelog, profilo con grado, punti e storico; promozione automatica ogni 20 punti
- **Direttivo:** permessi granulari; gli amministratori modificano ogni testo del sito direttamente dalla pagina

Stack: HTML/CSS/JS senza build · GitHub Pages · Supabase · GitHub Actions.

👉 **Per metterlo online segui [GUIDA.md](GUIDA.md).**

## Struttura

```
index.html              pagina unica
css/style.css           grafica
js/config.js            ⚙️ impostazioni (Supabase, gradi, ruoli, punti)
js/views/               le pagine del sito
supabase/schema.sql     database, regole di sicurezza, promozione automatica
supabase/functions/     mod-workshop (legge le mod dal Workshop), candidatura-discord
.github/workflows/      controllo mod ogni 3 ore, keep-alive del database
```

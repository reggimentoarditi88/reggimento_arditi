// Home, chi siamo, server, comunicazioni, reclutamento
import { CONFIG, GRADI, RUOLI, SPECIALIZZAZIONI, categoriaGrado, STATI_SETTORE, STATI_CAMPAGNA } from '../config.js';
import { db } from '../db.js';
import { can, membro, stato } from '../state.js';
import { esc, md, ic, T, TM, testo, dataOra, dataBreve, ora, bytes, badgeTipo, modulo, conferma, toast, errore, vuoto, titoloPagina, $, $$ } from '../ui.js';

// ---------- HOME ----------
export async function home(app) {
  document.title = CONFIG.NOME;
  const hero = `
    <section class="hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <img src="assets/logo.webp" alt="Stemma del Reggimento Arditi" class="hero-logo">
      <div class="hero-text">
        <div class="eyebrow"><span class="tricolore" aria-hidden="true"><i></i><i></i><i></i></span>${T('home.eyebrow', 'Gruppo Milsim italiano')}</div>
        <h1>${T('home.titolo', CONFIG.NOME)}</h1>
        <p class="lead">${T('home.sottotitolo', 'Tattica, disciplina e cameratismo su Arma Reforger.')}</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="#/reclutamento">${ic('user-plus')} ${T('home.cta1', 'Arruolati')}</a>
          <a class="btn btn-ghost btn-lg" href="#/chi-siamo">${T('home.cta2', 'Chi siamo')} ${ic('arrow-right')}</a>
        </div>
      </div>
    </section>`;

  if (!membro()) {
    const profili = await db.list('profili');
    const n = profili.filter((p) => p.stato === 'membro').length;
    app.innerHTML = `${hero}
      <div class="grid-3 reveal">
        ${[['crosshair', 'milsim', 'Milsim', 'Operazioni settimanali con briefing, catena di comando e comunicazioni radio realistiche.'],
           ['graduation-cap', 'addestramenti', 'Addestramenti', 'Tattiche di fanteria, procedure radio, soccorso e mezzi: impari giocando insieme.'],
           ['map', 'campagne', 'Campagne', 'Campagne persistenti in cui ogni missione cambia la situazione sul campo.']]
          .map(([i, k, t, d]) => `<div class="card feature">${ic(i, 'feature-ic')}<h3>${T(`home.f.${k}.titolo`, t)}</h3><p class="muted">${T(`home.f.${k}.testo`, d)}</p></div>`).join('')}
      </div>
      <section class="band reveal">
        <div class="band-stat"><b>${n}</b><span>${T('home.band.membri', 'membri attivi')}</span></div>
        <div class="band-text"><h2>${T('home.band.titolo', 'Conosci il Reggimento')}</h2><p class="muted">${T('home.band.testo', 'Scopri chi siamo, il nostro organico e come entrare a far parte del gruppo.')}</p></div>
        <div class="band-actions"><a class="btn btn-ghost" href="#/organico">${ic('users')} ${T('home.band.organico', 'Organico')}</a><a class="btn btn-primary" href="#/reclutamento">${T('home.band.recl', 'Reclutamento')}</a></div>
      </section>
      ${ctaDiscord()}`;
    return;
  }

  const [eventi, avvisi, listaMod, modLog, settori] = await Promise.all([
    db.list('eventi', { order: 'inizio' }),
    db.list('comunicazioni', { order: 'creato_il', asc: false }),
    db.list('mods'),
    db.list('mods_changelog', { order: 'data', asc: false }),
    db.list('settori'),
  ]);
  const mods = listaMod.length
    ? { mods: listaMod, totale: listaMod.reduce((s, m) => s + (Number(m.dimensione) || 0), 0), aggiornato_il: modLog[0]?.data }
    : null;
  const adesso = new Date().toISOString();
  const prossimi = eventi.filter((e) => (e.fine || e.inizio) >= adesso).slice(0, 4);
  const attive = stato.campagne.filter((c) => c.stato === 'attiva');

  app.innerHTML = `${hero}
    <div class="grid-home reveal">
      <section class="card">
        <header class="card-head"><h2>${ic('calendar-days')} ${T('home.d.eventi', 'Prossime operazioni')}</h2><a href="#/calendario" class="more">${T('home.d.calendario', 'Calendario')} ${ic('arrow-right')}</a></header>
        ${prossimi.length ? `<ul class="list-events">${prossimi.map((e) => `
          <li><a href="#/evento/${e.id}">
            <div class="date-block"><b>${new Date(e.inizio).getDate()}</b><span>${dataBreve(e.inizio).split(' ')[1]}</span></div>
            <div><div class="ev-title">${esc(e.titolo)}</div><div class="muted small">${badgeTipo(e.tipo)} ore ${ora(e.inizio)}</div></div>
          </a></li>`).join('')}</ul>` : vuoto('Nessuna operazione in programma.')}
      </section>

      <section class="card">
        <header class="card-head"><h2>${ic('megaphone')} ${T('home.d.com', 'Comunicazioni')}</h2><a href="#/comunicazioni" class="more">${T('home.d.tutte', 'Tutte')} ${ic('arrow-right')}</a></header>
        ${avvisi.length ? avvisi.slice(0, 3).map((c) => `
          <a class="news-mini prio-${c.priorita}" href="#/comunicazioni">
            <span class="muted small">${dataOra(c.creato_il)}</span>
            <b>${esc(c.titolo)}</b>
          </a>`).join('') : vuoto('Nessuna comunicazione.')}
      </section>

      <a class="card card-link" href="#/mod">
        <header class="card-head"><h2>${ic('package')} ${T('home.d.mod', 'Mod pack milsim')}</h2>${ic('arrow-up-right', 'muted')}</header>
        ${mods ? `<div class="stat-row">
            <div class="stat"><b>${mods.mods.length}</b><span>mod</span></div>
            <div class="stat"><b>${bytes(mods.totale)}</b><span>peso totale</span></div>
          </div><p class="muted small">Ultima modifica: ${dataOra(mods.aggiornato_il)}</p>` : vuoto('Lista mod non ancora generata.')}
      </a>

      <section class="card">
        <header class="card-head"><h2>${ic('map')} ${T('home.d.campagne', 'Campagne in corso')}</h2><a href="#/campagne" class="more">${T('home.d.tuttecamp', 'Tutte')} ${ic('arrow-right')}</a></header>
        ${attive.length ? attive.map((c) => {
          const s = settori.filter((x) => x.campagna_id === c.id);
          return `<a class="camp-mini" href="#/campagne/${c.id}">
            <b>${esc(c.titolo)}</b><span class="muted small">${esc(c.sottotitolo || '')}</span>
            ${barraControllo(s)}</a>`;
        }).join('') : vuoto('Nessuna campagna in corso.')}
      </section>
    </div>
    ${ctaDiscord()}`;
}

export function barraControllo(settori) {
  if (!settori.length) return '';
  return `<div class="bar-control">${Object.entries(STATI_SETTORE).map(([k, s]) => {
    const n = settori.filter((x) => x.stato === k).length;
    return n ? `<i style="flex:${n};background:${s.color}" title="${esc(s.label)}: ${n}"></i>` : '';
  }).join('')}</div>`;
}

function ctaDiscord() {
  return `<section class="cta-discord reveal">
    <div>${ic('message-circle', 'cta-ic')}<div><h2>${T('discord.titolo', 'Unisciti a noi su Discord')}</h2><p>${T('discord.testo', 'Briefing, comunicazioni e organizzazione passano tutti dal nostro server Discord.')}</p></div></div>
    <a class="btn btn-discord btn-lg" href="${esc(CONFIG.DISCORD_INVITE)}" target="_blank" rel="noopener">${T('discord.btn', 'Entra nel Discord')} ${ic('external-link')}</a>
  </section>`;
}

// ---------- CHI SIAMO ----------
export async function chiSiamo(app) {
  const gruppi = [];
  GRADI.map((g, i) => ({ g, i })).reverse().forEach(({ g, i }) => {
    const c = categoriaGrado(i);
    let gr = gruppi.find((x) => x.nome === c.nome);
    if (!gr) gruppi.push((gr = { nome: c.nome, cls: c.cls, gradi: [] }));
    gr.gradi.push(g);
  });
  const P = CONFIG.PUNTI;
  const testoChi = testo('chi-siamo', '');

  app.innerHTML = `
    ${titoloPagina('chi', 'Chi siamo', 'Il Reggimento Arditi in breve.')}
    <div class="two-col">
      <article class="card">${TM('chi-siamo', testoChi || 'Scrivi qui la presentazione del Reggimento.')}</article>
      <aside class="card side-logo"><img src="assets/logo.webp" alt="Stemma del Reggimento Arditi"></aside>
    </div>

    <h2 class="section-title">${T('chi.ruoli', 'Ruoli')}</h2>
    <p class="muted">${T('chi.ruoli.testo', 'Ogni membro ha un ruolo principale nella squadra.')}</p>
    <div class="grid-cards">${Object.entries(RUOLI).map(([r, d]) => `<div class="card mini"><h3>${esc(r)}</h3><p class="muted">${T(`ruolo.${r}`, d)}</p></div>`).join('')}</div>

    <h2 class="section-title">${T('chi.spec', 'Specializzazioni')}</h2>
    <p class="muted">${T('chi.spec.testo', "Una seconda funzione che si aggiunge al ruolo principale e si usa quando l'operazione lo richiede.")}</p>
    <div class="grid-cards">${Object.entries(SPECIALIZZAZIONI).map(([r, d]) => `<div class="card mini spec"><h3>${esc(r)}</h3><p class="muted">${T(`spec.${r}`, d)}</p></div>`).join('')}</div>

    <h2 class="section-title">${T('chi.gradi', 'Gradi e avanzamento')}</h2>
    <div class="two-col">
      <div class="card">
        <ol class="ranks">${gruppi.map((g) => `<li><h4 class="grado-${g.cls}-txt">${esc(g.nome)}</h4><div class="chips">${g.gradi.map((x) => `<span class="grado grado-${g.cls}">${esc(x)}</span>`).join('')}</div></li>`).join('')}</ol>
      </div>
      <div class="card">
        ${TM('chi.avanzamento', `### Come si sale di grado
Ogni presenza registrata dà punti grado:

- **+${P.addestramento}** partecipazione ad addestramento
- **+${P.milsim}** partecipazione a milsim
- **+${P.missione_compiuta}** missione compiuta

Raggiunti **${CONFIG.PUNTI_PROMOZIONE} punti** si diventa idonei alla promozione al grado successivo, approvata dal Direttivo.`)}
      </div>
    </div>`;
}

// ---------- SERVER ----------
const TIPI_SERVER = { privato: 'Privato · Milsim', pvp: 'Pubblico · PvP', altro: 'Altro' };

export async function server(app) {
  const lista = await db.list('server', { order: 'ordine' });
  const gruppo = (tipo) => lista.filter((s) => s.tipo === tipo);

  const card = (s) => `
    <article class="card server">
      <header class="card-head"><h3>${esc(s.nome)}</h3><span class="tag tag-${s.tipo}">${esc(TIPI_SERVER[s.tipo] || s.tipo)}</span></header>
      <div class="server-addr"><code>${esc(s.ip)}${s.porta ? `:${esc(s.porta)}` : ''}</code><button class="btn btn-small btn-ghost" data-copy="${esc(s.ip)}${s.porta ? `:${esc(s.porta)}` : ''}">${ic('copy')} Copia</button></div>
      ${s.descrizione ? `<p class="muted">${esc(s.descrizione)}</p>` : ''}
      <div class="live" data-bm="${esc(s.battlemetrics_id || '')}"></div>
      ${can('server') ? `<div class="row-actions"><button class="btn btn-small btn-ghost" data-edit="${s.id}">${ic('pencil')} Modifica</button><button class="btn btn-small btn-danger" data-del="${s.id}">${ic('trash-2')} Elimina</button></div>` : ''}
    </article>`;

  app.innerHTML = `
    ${titoloPagina('server', 'Server', 'I server dove gioca il Reggimento.', can('server') ? `<button class="btn btn-primary" id="add">${ic('plus')} Aggiungi server</button>` : '')}
    ${['privato', 'pvp', 'altro'].map((t) => gruppo(t).length ? `<h2 class="section-title">${T(`server.gruppo.${t}`, TIPI_SERVER[t])}</h2><div class="grid-cards wide">${gruppo(t).map(card).join('')}</div>` : '').join('')}
    ${!lista.length ? vuoto('Nessun server inserito.') : ''}`;

  $$('[data-copy]', app).forEach((b) => b.addEventListener('click', () => { navigator.clipboard.writeText(b.dataset.copy); toast('Indirizzo copiato'); }));
  $$('[data-edit]', app).forEach((b) => b.addEventListener('click', () => modificaServer(lista.find((s) => s.id === b.dataset.edit), app)));
  $$('[data-del]', app).forEach((b) => b.addEventListener('click', async () => {
    if (!(await conferma('Eliminare questo server?', 'Elimina'))) return;
    try { await db.remove('server', { id: b.dataset.del }); server(app); } catch (e) { errore(e); }
  }));
  $('#add')?.addEventListener('click', () => modificaServer(null, app));
  $$('.live[data-bm]', app).forEach(statoLive);
}

async function statoLive(el) {
  const id = el.dataset.bm;
  if (!id) return;
  try {
    const r = await fetch(`https://api.battlemetrics.com/servers/${encodeURIComponent(id)}`);
    if (!r.ok) return;
    const a = (await r.json()).data.attributes;
    const on = a.status === 'online';
    el.innerHTML = `<span class="dot ${on ? 'on' : 'off'}"></span> ${on ? `Online · <b>${a.players}/${a.maxPlayers}</b> giocatori` : 'Offline'}`;
  } catch { /* stato live non disponibile */ }
}

async function modificaServer(s, app) {
  const r = await modulo(s ? 'Modifica server' : 'Nuovo server', [
    { name: 'nome', label: 'Nome', value: s?.nome, required: true },
    { name: 'tipo', label: 'Tipo', type: 'select', value: s?.tipo || 'pvp', options: Object.entries(TIPI_SERVER) },
    { name: 'ip', label: 'Indirizzo IP', value: s?.ip, required: true },
    { name: 'porta', label: 'Porta', type: 'number', value: s?.porta },
    { name: 'descrizione', label: 'Descrizione', type: 'textarea', rows: 3, value: s?.descrizione },
    { name: 'battlemetrics_id', label: 'ID BattleMetrics (facoltativo)', value: s?.battlemetrics_id, help: "Il numero nell'URL battlemetrics.com/servers/reforger/NUMERO — mostra lo stato online e i giocatori." },
    { name: 'ordine', label: 'Ordine', type: 'number', value: s?.ordine ?? 10 },
  ]);
  if (!r) return;
  try {
    if (s) await db.update('server', { id: s.id }, r);
    else await db.insert('server', r);
    toast('Server salvato');
    server(app);
  } catch (e) { errore(e); }
}

// ---------- COMUNICAZIONI ----------
const PRIORITA = { normale: 'Normale', importante: 'Importante', urgente: 'Urgente' };

export async function comunicazioni(app) {
  const lista = await db.list('comunicazioni', { order: 'creato_il', asc: false });
  app.innerHTML = `
    ${titoloPagina('com', 'Comunicazioni', 'Annunci e ordini dal Direttivo.', can('comunicazioni') ? `<button class="btn btn-primary" id="add">${ic('plus')} Nuova comunicazione</button>` : '')}
    <div class="news-list">${lista.map((c) => `
      <article class="card news prio-${c.priorita}">
        <header>
          <div class="muted small">${dataOra(c.creato_il)} ${c.priorita !== 'normale' ? `<span class="tag tag-${c.priorita}">${esc(PRIORITA[c.priorita])}</span>` : ''}</div>
          <h2>${esc(c.titolo)}</h2>
        </header>
        <div class="prose">${md(c.testo)}</div>
        ${can('comunicazioni') ? `<div class="row-actions"><button class="btn btn-small btn-ghost" data-edit="${c.id}">${ic('pencil')} Modifica</button><button class="btn btn-small btn-danger" data-del="${c.id}">${ic('trash-2')} Elimina</button></div>` : ''}
      </article>`).join('') || vuoto('Nessuna comunicazione.')}</div>`;

  const edit = async (c) => {
    const r = await modulo(c ? 'Modifica comunicazione' : 'Nuova comunicazione', [
      { name: 'titolo', label: 'Titolo', value: c?.titolo, required: true, full: true },
      { name: 'priorita', label: 'Priorità', type: 'select', value: c?.priorita || 'normale', options: Object.entries(PRIORITA) },
      { name: 'testo', label: 'Testo', type: 'textarea', rows: 10, value: c?.testo, required: true, help: 'Formattazione: **grassetto**, ### titolo, - elenco.' },
    ]);
    if (!r) return;
    try {
      if (c) await db.update('comunicazioni', { id: c.id }, r);
      else await db.insert('comunicazioni', r);
      toast('Comunicazione pubblicata');
      comunicazioni(app);
    } catch (e) { errore(e); }
  };
  $('#add')?.addEventListener('click', () => edit(null));
  $$('[data-edit]', app).forEach((b) => b.addEventListener('click', () => edit(lista.find((c) => c.id === b.dataset.edit))));
  $$('[data-del]', app).forEach((b) => b.addEventListener('click', async () => {
    if (!(await conferma('Eliminare questa comunicazione?', 'Elimina'))) return;
    try { await db.remove('comunicazioni', { id: b.dataset.del }); comunicazioni(app); } catch (e) { errore(e); }
  }));
}

// ---------- RECLUTAMENTO ----------
export async function reclutamento(app) {
  const L = (k, d) => esc(testo(`recl.q.${k}`, d));
  app.innerHTML = `
    ${titoloPagina('recl', 'Reclutamento', 'Vuoi entrare nel Reggimento Arditi? Ecco come fare.')}
    <div class="steps reveal">
      <div class="step"><b>1</b><div><h3>${T('recl.s1.titolo', 'Entra nel Discord')}</h3><p class="muted">${T('recl.s1.testo', "Tutta l'attività del gruppo passa da lì.")}</p><a class="btn btn-discord btn-small" href="${esc(CONFIG.DISCORD_INVITE)}" target="_blank" rel="noopener">${ic('message-circle')} Discord</a></div></div>
      <div class="step"><b>2</b><div><h3>${T('recl.s2.titolo', 'Compila il questionario')}</h3><p class="muted">${T('recl.s2.testo', 'Bastano due minuti, qui sotto.')}</p></div></div>
      <div class="step"><b>3</b><div><h3>${T('recl.s3.titolo', 'Colloquio e addestramento base')}</h3><p class="muted">${T('recl.s3.testo', "Un istruttore ti contatterà su Discord. Dopo l'addestramento base entri come Recluta.")}</p></div></div>
    </div>

    ${TM('recl.requisiti', `### Requisiti
- Età minima 16 anni
- Microfono funzionante
- Rispetto della catena di comando`, 'card prose requisiti')}

    <form class="card form" id="cand">
      <h2>${T('recl.form.titolo', 'Questionario di arruolamento')}</h2>
      <div class="form-grid">
        <div class="field"><label for="c-dn">${T('recl.q.discord', 'Nome utente Discord')} *</label><input id="c-dn" name="discord_nome" required maxlength="60" placeholder="es. mario_rossi"></div>
        <div class="field"><label for="c-eta">${T('recl.q.eta', 'Età')} *</label><input id="c-eta" name="eta" type="number" min="13" max="99" required></div>
        <div class="field"><label for="c-disp">${T('recl.q.disp', 'Disponibilità')} *</label><input id="c-disp" name="disponibilita" required maxlength="200" placeholder="${L('disp.ph', 'es. sabato e domenica sera')}"></div>
        <div class="field"><label for="c-ruolo">${T('recl.q.ruolo', 'Ruolo che ti interessa')}</label>
          <select id="c-ruolo" name="ruolo_preferito"><option value="">Non so ancora</option>${Object.keys(RUOLI).map((r) => `<option>${esc(r)}</option>`).join('')}</select></div>
        <div class="field full"><label for="c-esp">${T('recl.q.esp', 'Esperienza su Arma Reforger / Arma / milsim')} *</label><textarea id="c-esp" name="esperienza" rows="3" required maxlength="1000"></textarea></div>
        <div class="field full"><label for="c-mot">${T('recl.q.mot', 'Perché vuoi entrare nel Reggimento Arditi?')} *</label><textarea id="c-mot" name="motivazione" rows="4" required maxlength="2000"></textarea></div>
        <div class="field full"><label for="c-prov">${T('recl.q.prov', 'Come ci hai conosciuto?')}</label><input id="c-prov" name="provenienza" maxlength="200"></div>
        <label class="field check full"><input type="checkbox" required> <span>${T('recl.q.ok', 'Ho un microfono funzionante e accetto di rispettare il regolamento del gruppo')} *</span></label>
      </div>
      <div class="form-foot"><button class="btn btn-primary btn-lg" type="submit">${ic('send')} ${T('recl.invia', 'Invia candidatura')}</button></div>
    </form>`;

  $('#cand').addEventListener('submit', async (e) => {
    e.preventDefault();
    const row = Object.fromEntries(new FormData(e.target).entries());
    row.eta = Number(row.eta);
    const btn = $('button[type=submit]', e.target);
    btn.disabled = true;
    try {
      await db.insert('candidature', row, { ret: false });
      e.target.outerHTML = `<div class="card success pop">${ic('circle-check', 'success-ic')}<h2>${T('recl.ok.titolo', 'Candidatura inviata')}</h2><p>${T('recl.ok.testo', "Grazie! Se non l'hai già fatto entra nel Discord: ti contatteremo lì per il colloquio.")}</p><a class="btn btn-discord" href="${esc(CONFIG.DISCORD_INVITE)}" target="_blank" rel="noopener">Entra nel Discord</a></div>`;
      window.lucide?.createIcons();
    } catch (err) {
      btn.disabled = false;
      errore(err);
    }
  });
}

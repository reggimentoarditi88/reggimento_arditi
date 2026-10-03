// Campagne: elenco, pagina della campagna con sotto-pagine, mappa satellitare e settori
import { STATI_SETTORE, STATI_CAMPAGNA, CLASSIFICAZIONI } from '../config.js';
import { db, storage } from '../db.js';
import { can, caricaCampagne } from '../state.js';
import { esc, md, ic, T, data, ora, badgeTipo, modulo, conferma, toast, errore, vuoto, titoloPagina, icone, $, $$ } from '../ui.js';
import { barraControllo } from './pubbliche.js';
import { modificaEvento } from './eventi.js';

const aggiornaMenu = async () => { await caricaCampagne(); window.dispatchEvent(new Event('menu-refresh')); };
const tagStato = (s) => { const x = STATI_CAMPAGNA[s] || STATI_CAMPAGNA.pianificata; return `<span class="tag" style="--tag:${x.color}">${esc(x.label)}</span>`; };

// ============================================================
//  ELENCO CAMPAGNE
// ============================================================
export async function campagne(app) {
  const [lista, settori, eventi] = await Promise.all([
    db.list('campagne', { order: 'ordine' }),
    db.list('settori'),
    db.list('eventi'),
  ]);
  const gestore = can('campagna');
  const ordine = ['attiva', 'pianificata', 'conclusa'];
  lista.sort((a, b) => ordine.indexOf(a.stato) - ordine.indexOf(b.stato) || (a.ordine ?? 0) - (b.ordine ?? 0));

  app.innerHTML = `
    ${titoloPagina('camp', 'Campagne', 'Le operazioni a lungo termine del Reggimento.', gestore ? `<button class="btn btn-primary" id="add">${ic('plus')} Nuova campagna</button>` : '')}
    <div class="grid-campagne">${lista.map((c) => {
      const s = settori.filter((x) => x.campagna_id === c.id);
      const nOp = eventi.filter((e) => e.campagna_id === c.id).length;
      const ctrl = s.filter((x) => x.stato === 'alleato').length;
      return `<a class="card camp-card" href="#/campagne/${c.id}">
        <div class="camp-cover" ${c.copertina || c.mappa ? `style="background-image:url('${esc(c.copertina || c.mappa)}')"` : ''}>${!c.copertina && !c.mappa ? ic('map', 'cover-ic') : ''}${tagStato(c.stato)}</div>
        <div class="camp-body">
          <h3>${esc(c.titolo)}</h3>
          <p class="muted small">${esc(c.sottotitolo || '')}</p>
          ${barraControllo(s)}
          <div class="camp-meta"><span>${ic('flag')} ${ctrl}/${s.length} settori</span><span>${ic('swords')} ${nOp} operazioni</span></div>
        </div>
      </a>`;
    }).join('') || vuoto('Nessuna campagna creata.')}</div>`;

  $('#add')?.addEventListener('click', () => modificaCampagna(null));
}

async function modificaCampagna(c) {
  const r = await modulo(c ? 'Modifica campagna' : 'Nuova campagna', [
    { name: 'titolo', label: 'Nome della campagna', value: c?.titolo, required: true, full: true },
    { name: 'sottotitolo', label: 'Sottotitolo / mappa', value: c?.sottotitolo, placeholder: 'es. Isola di Gogland', full: true },
    { name: 'stato', label: 'Stato', type: 'select', value: c?.stato || 'pianificata', options: Object.entries(STATI_CAMPAGNA).map(([k, v]) => [k, v.label]) },
    { name: 'ordine', label: 'Ordine nel menu', type: 'number', value: c?.ordine ?? 10 },
    { name: 'copertina', label: 'Immagine di copertina (facoltativa)', type: 'file', accept: 'image/*', full: true, help: c?.copertina ? 'Lascia vuoto per mantenere quella attuale.' : 'Se manca si usa la mappa.' },
  ], { conferma: c ? 'Salva' : 'Crea campagna' });
  if (!r) return;
  const { copertina, ...dati } = r;
  try {
    if (copertina) { toast('Caricamento immagine…'); dati.copertina = await storage.uploadImmagine(copertina); }
    if (c) {
      await db.update('campagne', { id: c.id }, dati);
      toast('Campagna aggiornata');
      await aggiornaMenu();
      window.dispatchEvent(new Event('rerender'));
    } else {
      const nuova = await db.insert('campagne', { ...dati, briefing: '', mappa: '' });
      toast('Campagna creata');
      await aggiornaMenu();
      location.hash = `#/campagne/${nuova.id}`;
    }
  } catch (e) { errore(e); }
}

// ============================================================
//  PAGINA DELLA CAMPAGNA
// ============================================================
export async function campagna(app, id, scheda = 'briefing', elemento = null) {
  const [c, pagine, settori, eventi, documenti, articoli] = await Promise.all([
    db.get('campagne', { id }),
    db.list('campagna_pagine', { eq: { campagna_id: id }, order: 'ordine' }),
    db.list('settori', { eq: { campagna_id: id }, order: 'nome' }),
    db.list('eventi', { eq: { campagna_id: id }, order: 'inizio' }),
    db.list('campagna_documenti', { eq: { campagna_id: id }, order: 'creato_il', asc: false }),
    db.list('campagna_articoli', { eq: { campagna_id: id }, order: 'creato_il', asc: false }),
  ]);
  if (!c) { app.innerHTML = vuoto('Campagna non trovata.'); return; }
  document.title = c.titolo;
  const gestore = can('campagna');
  const schede = [
    ['briefing', 'Briefing', 'file-text'],
    ['mappa', 'Situazione tattica', 'map'],
    ['operazioni', 'Operazioni', 'swords'],
    ['documenti', `Documenti riservati${documenti.length ? ` (${documenti.length})` : ''}`, 'folder-lock'],
    ['stampa', `Stampa${articoli.length ? ` (${articoli.length})` : ''}`, 'newspaper'],
    ...pagine.map((p) => [p.id, p.titolo, 'bookmark']),
  ];
  if (!schede.some(([k]) => k === scheda)) scheda = 'briefing';
  const cover = c.copertina || c.mappa;

  app.innerHTML = `
    <a href="#/campagne" class="back">${ic('arrow-left')} Campagne</a>
    <header class="camp-hero ${cover ? 'has-cover' : ''}" ${cover ? `style="--cover:url('${esc(cover)}')"` : ''}>
      <div class="camp-hero-inner">
        <div>${tagStato(c.stato)}</div>
        <h1>${esc(c.titolo)}</h1>
        ${c.sottotitolo ? `<p class="lead">${esc(c.sottotitolo)}</p>` : ''}
        <div class="camp-hero-stats">${barraControllo(settori)}
          <span>${ic('flag')} ${settori.filter((s) => s.stato === 'alleato').length}/${settori.length} settori</span>
          <span>${ic('swords')} ${eventi.length} operazioni</span></div>
      </div>
      ${gestore ? `<div class="actions"><button class="btn btn-ghost btn-glass" id="edit-c">${ic('settings')} Modifica</button><button class="btn btn-danger btn-glass" id="del-c">${ic('trash-2')}</button></div>` : ''}
    </header>

    <nav class="tabs" role="tablist">
      ${schede.map(([k, l, i]) => `<a role="tab" href="#/campagne/${id}/${k}" ${k === scheda ? 'aria-selected="true" class="active"' : ''}>${ic(i)} ${esc(l)}</a>`).join('')}
      ${gestore ? `<button class="tab-add" id="add-p" title="Aggiungi una pagina">${ic('plus')} Pagina</button>` : ''}
    </nav>
    <div class="tab-panel" id="panel"></div>`;

  $('#edit-c')?.addEventListener('click', () => modificaCampagna(c));
  $('#del-c')?.addEventListener('click', async () => {
    if (!(await conferma(`Eliminare la campagna "${c.titolo}" con tutte le sue pagine e i settori? Le operazioni restano nel calendario.`, 'Elimina'))) return;
    try {
      await db.remove('settori', { campagna_id: id });
      await db.remove('campagna_pagine', { campagna_id: id });
      await db.remove('campagna_articoli', { campagna_id: id });
      for (const d of documenti) if (d.file) await storage.remove(d.file).catch(() => {});
      await db.remove('campagna_documenti', { campagna_id: id });
      for (const e of eventi) await db.update('eventi', { id: e.id }, { campagna_id: null });
      await db.remove('campagne', { id });
      toast('Campagna eliminata');
      await aggiornaMenu();
      location.hash = '#/campagne';
    } catch (e) { errore(e); }
  });
  $('#add-p')?.addEventListener('click', async () => {
    const r = await modulo('Nuova pagina della campagna', [
      { name: 'titolo', label: 'Titolo', required: true, placeholder: 'es. Fazioni, Regole, Intelligence…', full: true },
      { name: 'testo', label: 'Contenuto', type: 'textarea', rows: 10, help: 'Formattazione: **grassetto**, ### titolo, - elenco, ![immagine](https://…)' },
    ], { conferma: 'Crea pagina' });
    if (!r) return;
    try {
      const p = await db.insert('campagna_pagine', { campagna_id: id, ordine: pagine.length + 1, ...r });
      location.hash = `#/campagne/${id}/${p.id}`;
    } catch (e) { errore(e); }
  });

  const panel = $('#panel');
  const ricarica = () => window.dispatchEvent(new Event('rerender'));
  if (scheda === 'briefing') schedaBriefing(panel, c, gestore, ricarica);
  else if (scheda === 'mappa') schedaMappa(panel, c, settori, gestore, ricarica);
  else if (scheda === 'operazioni') schedaOperazioni(panel, c, eventi);
  else if (scheda === 'documenti') await schedaDocumenti(panel, c, documenti, gestore, ricarica, elemento);
  else if (scheda === 'stampa') schedaStampa(panel, c, articoli, gestore, ricarica, elemento);
  else schedaPagina(panel, c, pagine.find((p) => p.id === scheda), pagine, gestore, ricarica);
  icone(app);
}

// ---------- Documenti riservati ----------
const timbro = (cl) => {
  const x = CLASSIFICAZIONI[cl] || CLASSIFICAZIONI.riservato;
  return `<span class="timbro" style="--c:${x.color}">${esc(x.label)}</span>`;
};

async function schedaDocumenti(panel, c, documenti, gestore, ricarica, docId) {
  const base = `#/campagne/${c.id}/documenti`;
  const doc = docId && documenti.find((d) => d.id === docId);

  if (doc) {
    panel.innerHTML = `
      <a href="${base}" class="back">${ic('arrow-left')} Tutti i documenti</a>
      ${gestore ? `<div class="panel-tools"><button class="btn btn-small btn-ghost" id="edit-d">${ic('pencil')} Modifica</button><button class="btn btn-small btn-danger" id="del-d">${ic('trash-2')} Elimina</button></div>` : ''}
      <article class="dossier-foglio">
        ${timbro(doc.classificazione)}
        <header class="dossier-intest">
          <img src="assets/logo.webp" alt="" width="64" height="64">
          <div><b>REGGIMENTO ARDITI</b><span>Comando · Ufficio Informazioni</span></div>
          <div class="dossier-prot">${esc(doc.protocollo || '')}<br>${esc(doc.data_documento || '')}</div>
        </header>
        <h2 class="dossier-oggetto"><span>OGGETTO:</span> ${esc(doc.titolo)}</h2>
        <div class="dossier-testo prose">${md(doc.testo)}</div>
        ${doc.file ? `<div class="dossier-allegato"><button class="btn btn-ghost" id="file-d">${ic('paperclip')} Apri allegato</button></div>` : ''}
        <footer class="dossier-piede">${esc((CLASSIFICAZIONI[doc.classificazione] || CLASSIFICAZIONI.riservato).label.toUpperCase())} — VIETATA LA DIFFUSIONE</footer>
      </article>`;
    $('#edit-d', panel)?.addEventListener('click', () => modificaDocumento(c.id, doc, ricarica));
    $('#del-d', panel)?.addEventListener('click', async () => {
      if (!(await conferma(`Eliminare il documento "${doc.titolo}"?`, 'Elimina'))) return;
      try {
        if (doc.file) await storage.remove(doc.file).catch(() => {});
        await db.remove('campagna_documenti', { id: doc.id });
        location.hash = base;
      } catch (e) { errore(e); }
    });
    $('#file-d', panel)?.addEventListener('click', async () => {
      try {
        const url = await storage.url(doc.file);
        if (!url) return toast('Allegato non disponibile in demo.', 'err');
        window.open(url, '_blank', 'noopener');
      } catch (e) { errore(e); }
    });
    return;
  }

  panel.innerHTML = `
    <div class="panel-tools">
      <p class="muted small m0">${ic('shield-alert')} ${T('camp.doc.nota', 'Materiale riservato al personale del Reggimento. Non diffondere fuori dal gruppo.')}</p>
      ${gestore ? `<button class="btn btn-small btn-primary push" id="add-d">${ic('file-plus')} Nuovo documento</button>` : ''}
    </div>
    ${documenti.length ? `<div class="grid-dossier">${documenti.map((d) => `
      <a class="dossier" href="${base}/${d.id}">
        <span class="dossier-tab"></span>
        ${timbro(d.classificazione)}
        <div class="dossier-meta">${esc(d.protocollo || '')} · ${esc(d.data_documento || '')}</div>
        <h3>${esc(d.titolo)}</h3>
        <span class="dossier-cta">${ic('eye')} Leggi${d.file ? ` · ${ic('paperclip')} allegato` : ''}</span>
      </a>`).join('')}</div>` : vuoto('Nessun documento riservato.')}`;
  $('#add-d', panel)?.addEventListener('click', () => modificaDocumento(c.id, null, ricarica));
}

async function modificaDocumento(campagnaId, d, ricarica) {
  const r = await modulo(d ? 'Modifica documento' : 'Nuovo documento riservato', [
    { name: 'titolo', label: 'Oggetto', value: d?.titolo, required: true, full: true },
    { name: 'classificazione', label: 'Classificazione', type: 'select', value: d?.classificazione || 'riservato', options: Object.entries(CLASSIFICAZIONI).map(([k, v]) => [k, v.label]) },
    { name: 'protocollo', label: 'Protocollo', value: d?.protocollo, placeholder: 'es. Prot. 027/INT' },
    { name: 'data_documento', label: 'Data (nel gioco)', value: d?.data_documento, placeholder: 'es. 3 ottobre' },
    { name: 'file', label: 'Allegato (PDF, immagine… facoltativo)', type: 'file', help: d?.file ? 'Lascia vuoto per mantenere l\'allegato attuale.' : '' },
    { name: 'testo', label: 'Testo del documento', type: 'textarea', rows: 12, value: d?.testo, help: 'Formattazione: **grassetto**, *corsivo*, > citazione, - elenco, ![immagine](https://…)' },
  ], { conferma: d ? 'Salva' : 'Archivia documento' });
  if (!r) return;
  const { file, ...dati } = r;
  try {
    if (file) { toast('Caricamento allegato…'); dati.file = await storage.upload(file); }
    if (d) await db.update('campagna_documenti', { id: d.id }, dati);
    else {
      const nuovo = await db.insert('campagna_documenti', { campagna_id: campagnaId, file: '', ...dati });
      location.hash = `#/campagne/${campagnaId}/documenti/${nuovo.id}`;
      return;
    }
    toast('Documento salvato');
    ricarica();
  } catch (e) { errore(e); }
}

// ---------- Stampa e giornali ----------
function schedaStampa(panel, c, articoli, gestore, ricarica, artId) {
  const base = `#/campagne/${c.id}/stampa`;
  const art = artId && articoli.find((a) => a.id === artId);

  if (art) {
    panel.innerHTML = `
      <a href="${base}" class="back">${ic('arrow-left')} Edicola</a>
      ${gestore ? `<div class="panel-tools"><button class="btn btn-small btn-ghost" id="edit-a">${ic('pencil')} Modifica</button><button class="btn btn-small btn-danger" id="del-a">${ic('trash-2')} Elimina</button></div>` : ''}
      <article class="giornale">
        <header class="giornale-testata">
          <div class="giornale-linea"><span>${esc(art.data_articolo || '')}</span><span>${esc(c.sottotitolo || c.titolo)}</span><span>Edizione straordinaria</span></div>
          <h2>${esc(art.testata || 'Gazzetta')}</h2>
        </header>
        <h1 class="giornale-titolo">${esc(art.titolo)}</h1>
        ${art.sommario ? `<p class="giornale-sommario">${esc(art.sommario)}</p>` : ''}
        <div class="giornale-firma">${esc(art.autore || 'Redazione')}</div>
        ${art.immagine ? `<figure class="giornale-foto"><img src="${esc(art.immagine)}" alt=""></figure>` : ''}
        <div class="giornale-testo">${md(art.testo)}</div>
      </article>`;
    $('#edit-a', panel)?.addEventListener('click', () => modificaArticolo(c.id, art, ricarica));
    $('#del-a', panel)?.addEventListener('click', async () => {
      if (!(await conferma(`Eliminare l'articolo "${art.titolo}"?`, 'Elimina'))) return;
      try { await db.remove('campagna_articoli', { id: art.id }); location.hash = base; } catch (e) { errore(e); }
    });
    return;
  }

  const [primo, ...altri] = articoli;
  panel.innerHTML = `
    ${gestore ? `<div class="panel-tools"><button class="btn btn-small btn-primary push" id="add-a">${ic('pen-tool')} Nuovo articolo</button></div>` : ''}
    ${primo ? `
      <a class="edicola-prima" href="${base}/${primo.id}">
        ${primo.immagine ? `<div class="edicola-foto" style="background-image:url('${esc(primo.immagine)}')"></div>` : ''}
        <div class="edicola-testo">
          <span class="edicola-testata">${esc(primo.testata || '')} · ${esc(primo.data_articolo || '')}</span>
          <h2>${esc(primo.titolo)}</h2>
          ${primo.sommario ? `<p>${esc(primo.sommario)}</p>` : ''}
          <span class="edicola-leggi">Leggi l'articolo ${ic('arrow-right')}</span>
        </div>
      </a>
      ${altri.length ? `<div class="grid-edicola">${altri.map((a) => `
        <a class="edicola-art" href="${base}/${a.id}">
          ${a.immagine ? `<div class="edicola-mini" style="background-image:url('${esc(a.immagine)}')"></div>` : ''}
          <span class="edicola-testata">${esc(a.testata || '')} · ${esc(a.data_articolo || '')}</span>
          <h3>${esc(a.titolo)}</h3>
          ${a.sommario ? `<p>${esc(a.sommario)}</p>` : ''}
        </a>`).join('')}</div>` : ''}` : vuoto('Nessun articolo pubblicato.')}`;
  $('#add-a', panel)?.addEventListener('click', () => modificaArticolo(c.id, null, ricarica));
}

async function modificaArticolo(campagnaId, a, ricarica) {
  const r = await modulo(a ? 'Modifica articolo' : 'Nuovo articolo di giornale', [
    { name: 'testata', label: 'Testata', value: a?.testata, required: true, placeholder: 'es. Il Corriere del Baltico' },
    { name: 'data_articolo', label: 'Data (nel gioco)', value: a?.data_articolo, placeholder: 'es. 17 settembre' },
    { name: 'titolo', label: 'Titolo', value: a?.titolo, required: true, full: true },
    { name: 'sommario', label: 'Sommario', value: a?.sommario, full: true },
    { name: 'autore', label: 'Firma', value: a?.autore, placeholder: 'es. M. Ferri, inviato' },
    { name: 'file', label: 'Foto (facoltativa)', type: 'file', accept: 'image/*', help: a?.immagine ? 'Lascia vuoto per mantenere la foto attuale.' : '' },
    { name: 'testo', label: 'Articolo', type: 'textarea', rows: 12, value: a?.testo, required: true, help: 'Formattazione: **grassetto**, *corsivo*, > citazione.' },
  ], { conferma: a ? 'Salva' : 'Pubblica' });
  if (!r) return;
  const { file, ...dati } = r;
  try {
    if (file) { toast('Caricamento foto…'); dati.immagine = await storage.uploadImmagine(file); }
    if (a) await db.update('campagna_articoli', { id: a.id }, dati);
    else {
      const nuovo = await db.insert('campagna_articoli', { campagna_id: campagnaId, immagine: '', ...dati });
      location.hash = `#/campagne/${campagnaId}/stampa/${nuovo.id}`;
      return;
    }
    toast('Articolo salvato');
    ricarica();
  } catch (e) { errore(e); }
}

// ---------- Briefing ----------
function schedaBriefing(panel, c, gestore, ricarica) {
  panel.innerHTML = `<article class="card">
    ${gestore ? `<div class="panel-tools"><button class="btn btn-small btn-ghost" id="edit-b">${ic('pencil')} Modifica briefing</button></div>` : ''}
    <div class="prose">${md(c.briefing) || '<p class="muted">Briefing non ancora scritto.</p>'}</div>
  </article>`;
  $('#edit-b', panel)?.addEventListener('click', async () => {
    const r = await modulo('Briefing della campagna', [{ name: 'briefing', label: 'Testo', type: 'textarea', rows: 16, value: c.briefing, help: 'Formattazione: **grassetto**, ### titolo, - elenco, ![immagine](https://…)' }]);
    if (!r) return;
    try { await db.update('campagne', { id: c.id }, r); toast('Briefing salvato'); ricarica(); } catch (e) { errore(e); }
  });
}

// ---------- Pagine personalizzate ----------
function schedaPagina(panel, c, p, pagine, gestore, ricarica) {
  panel.innerHTML = `<article class="card">
    ${gestore ? `<div class="panel-tools">
      <button class="btn btn-small btn-ghost" id="edit-p">${ic('pencil')} Modifica pagina</button>
      <button class="btn btn-small btn-danger" id="del-p">${ic('trash-2')} Elimina pagina</button></div>` : ''}
    <h2>${esc(p.titolo)}</h2>
    <div class="prose">${md(p.testo) || '<p class="muted">Pagina vuota.</p>'}</div>
  </article>`;
  $('#edit-p', panel)?.addEventListener('click', async () => {
    const r = await modulo('Modifica pagina', [
      { name: 'titolo', label: 'Titolo', value: p.titolo, required: true },
      { name: 'ordine', label: 'Posizione', type: 'number', value: p.ordine ?? pagine.indexOf(p) + 1 },
      { name: 'testo', label: 'Contenuto', type: 'textarea', rows: 16, value: p.testo, help: 'Formattazione: **grassetto**, ### titolo, - elenco, ![immagine](https://…)' },
    ]);
    if (!r) return;
    try { await db.update('campagna_pagine', { id: p.id }, r); toast('Pagina salvata'); ricarica(); } catch (e) { errore(e); }
  });
  $('#del-p', panel)?.addEventListener('click', async () => {
    if (!(await conferma(`Eliminare la pagina "${p.titolo}"?`, 'Elimina'))) return;
    try { await db.remove('campagna_pagine', { id: p.id }); location.hash = `#/campagne/${c.id}`; } catch (e) { errore(e); }
  });
}

// ---------- Operazioni ----------
function schedaOperazioni(panel, c, eventi) {
  const adesso = new Date().toISOString();
  const future = eventi.filter((e) => (e.fine || e.inizio) >= adesso);
  const svolte = eventi.filter((e) => (e.fine || e.inizio) < adesso).reverse();
  const riga = (e) => `<li><a href="#/evento/${e.id}"><span class="muted small">${data(e.inizio)} · ${ora(e.inizio)}</span> <b>${esc(e.titolo)}</b></a>
    <div>${badgeTipo(e.tipo)} ${e.esito ? `<span class="tag tag-${e.esito}">${esc(e.esito)}</span>` : ''}</div></li>`;
  panel.innerHTML = `
    ${can('eventi') ? `<div class="panel-tools"><button class="btn btn-primary btn-small" id="add-op">${ic('plus')} Nuova operazione</button></div>` : ''}
    <div class="two-col even">
      <section class="card"><h3>${T('camp.prossime', 'Prossime')}</h3>${future.length ? `<ul class="timeline">${future.map(riga).join('')}</ul>` : vuoto('Nessuna operazione pianificata.')}</section>
      <section class="card"><h3>${T('camp.svolte', 'Svolte')}</h3>${svolte.length ? `<ul class="timeline">${svolte.map(riga).join('')}</ul>` : vuoto('Nessuna operazione svolta.')}</section>
    </div>`;
  $('#add-op', panel)?.addEventListener('click', () => modificaEvento(null, c.id));
}

// ---------- Mappa e settori ----------
// Sagoma stilizzata mostrata solo finché non viene caricata un'immagine satellitare
const SAGOMA = 'M50 3 C57 4 60 9 58 14 C63 17 66 22 63 27 C70 31 72 37 69 42 C66 46 67 51 64 55 C66 60 70 64 68 69 C66 74 69 79 64 83 C60 88 58 94 51 97 C45 98 41 94 42 89 C37 86 35 81 38 76 C33 72 30 66 33 61 C29 56 28 49 33 45 C35 40 33 35 37 31 C35 25 38 19 43 16 C42 10 45 4 50 3 Z';

function schedaMappa(panel, c, settori, gestore, ricarica) {
  const colore = (s) => (STATI_SETTORE[s.stato] || STATI_SETTORE.sconosciuto).color;
  panel.innerHTML = `
    ${gestore ? `<div class="panel-tools">
      <button class="btn btn-small btn-ghost" id="map-img">${ic('image-up')} ${c.mappa ? 'Cambia immagine satellitare' : 'Carica immagine satellitare'}</button>
      <button class="btn btn-small btn-primary" id="add-s">${ic('map-pin-plus')} Settore</button>
      <span class="help">${ic('move')} Trascina i settori per spostarli · clicca per modificarli · clicca sulla mappa per crearne uno</span>
    </div>` : ''}
    <div class="camp-layout">
      <section class="card map-card">
        <div class="map" id="map">
          <div class="map-inner ${gestore ? 'editable' : ''}" id="map-inner">
            ${c.mappa ? `<img src="${esc(c.mappa)}" alt="Mappa satellitare" id="map-img-el" draggable="false">` : `
              <svg viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden="true" class="map-fallback">
                <defs><pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="currentColor" stroke-width=".1"/></pattern></defs>
                <rect width="100" height="75" class="sea"/><rect width="100" height="75" fill="url(#grid)" class="gridlines"/>
                <path d="${SAGOMA}" class="land" transform="translate(12.5 0) scale(.75)"/>
              </svg>
              <div class="map-hint">${ic('satellite')} ${gestore ? 'Carica un\'immagine satellitare con il pulsante qui sopra' : 'Mappa satellitare non ancora caricata'}</div>`}
            ${settori.map((s) => `
              ${s.raggio > 0 ? `<div class="zona" data-z="${s.id}" style="left:${s.x}%;top:${s.y}%;width:${s.raggio * 2}%;--c:${colore(s)}"></div>` : ''}
              <button class="pin" data-s="${s.id}" style="left:${s.x}%;top:${s.y}%;--c:${colore(s)}" aria-label="${esc(s.nome)}"><span>${esc(s.nome)}</span></button>`).join('')}
          </div>
          <button class="icon-btn map-full-btn" id="full" title="Schermo intero">${ic('maximize')}</button>
          <div class="map-info" id="info" hidden></div>
        </div>
        <ul class="legend legend-inline">${Object.values(STATI_SETTORE).map((s) => `<li><i style="background:${s.color}"></i>${esc(s.label)}</li>`).join('')}</ul>
      </section>

      <aside class="card">
        <h2 class="h-small">${T('camp.settori', 'Settori')}</h2>
        ${settori.length ? `<ul class="sectors">${settori.map((s) => { const st = STATI_SETTORE[s.stato] || STATI_SETTORE.sconosciuto; return `
          <li data-li="${s.id}"><i style="background:${st.color}"></i><div><b>${esc(s.nome)}</b> <span class="muted small">${esc(st.label)}</span>${s.descrizione ? `<p class="small muted">${esc(s.descrizione)}</p>` : ''}</div>
          ${gestore ? `<button class="icon-btn" data-edit="${s.id}" title="Modifica">${ic('pencil')}</button>` : ''}</li>`; }).join('')}</ul>` : vuoto('Nessun settore.')}
      </aside>
    </div>`;

  const map = $('#map', panel);
  const inner = $('#map-inner', panel);
  const img = $('#map-img-el', panel);
  const impostaProporzioni = () => { if (img?.naturalWidth) inner.style.setProperty('--ar', img.naturalWidth / img.naturalHeight); };
  if (img) { if (img.complete) impostaProporzioni(); else img.addEventListener('load', impostaProporzioni); } else inner.style.setProperty('--ar', 4 / 3);

  $('#full', panel).addEventListener('click', () => {
    map.classList.toggle('map-full');
    document.body.classList.toggle('no-scroll', map.classList.contains('map-full'));
  });
  document.addEventListener('keydown', function esci(e) {
    if (!document.body.contains(map)) return document.removeEventListener('keydown', esci);
    if (e.key === 'Escape' && map.classList.contains('map-full')) $('#full', panel).click();
  });

  const info = $('#info', panel);
  const mostraInfo = (s) => {
    const st = STATI_SETTORE[s.stato] || STATI_SETTORE.sconosciuto;
    info.hidden = false;
    info.innerHTML = `<b>${esc(s.nome)}</b> <span class="tag" style="--tag:${st.color}">${esc(st.label)}</span>${s.descrizione ? `<p>${esc(s.descrizione)}</p>` : ''}`;
    $$('[data-li]', panel).forEach((li) => li.classList.toggle('active', li.dataset.li === s.id));
  };

  const pos = (e) => {
    const r = inner.getBoundingClientRect();
    const clamp = (v) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
    return { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) };
  };

  $$('.pin', panel).forEach((pin) => {
    const s = settori.find((x) => x.id === pin.dataset.s);
    const zona = $(`[data-z="${s.id}"]`, panel);
    if (!gestore) { pin.addEventListener('click', (e) => { e.stopPropagation(); mostraInfo(s); }); return; }
    pin.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      pin.setPointerCapture(e.pointerId);
      const sx = e.clientX; const sy = e.clientY;
      let mosso = false; let p = { x: s.x, y: s.y };
      const muovi = (ev) => {
        if (!mosso && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
        mosso = true;
        pin.classList.add('dragging');
        p = pos(ev);
        for (const el of [pin, zona]) if (el) { el.style.left = `${p.x}%`; el.style.top = `${p.y}%`; }
      };
      const fine = async () => {
        pin.removeEventListener('pointermove', muovi);
        pin.classList.remove('dragging');
        if (!mosso) return modificaSettore(c.id, s, ricarica);
        try { await db.update('settori', { id: s.id }, p); s.x = p.x; s.y = p.y; toast(`${s.nome} spostato`); } catch (err) { errore(err); }
      };
      pin.addEventListener('pointermove', muovi);
      pin.addEventListener('pointerup', fine, { once: true });
    });
  });

  inner.addEventListener('click', (e) => {
    if (e.target.closest('.pin')) return;
    if (!gestore) { info.hidden = true; return; }
    const { x, y } = pos(e);
    modificaSettore(c.id, { x, y, stato: 'sconosciuto', raggio: 5 }, ricarica);
  });
  $$('[data-li]', panel).forEach((li) => li.addEventListener('click', (e) => {
    if (e.target.closest('[data-edit]')) return;
    mostraInfo(settori.find((s) => s.id === li.dataset.li));
  }));
  $$('[data-edit]', panel).forEach((b) => b.addEventListener('click', () => modificaSettore(c.id, settori.find((s) => s.id === b.dataset.edit), ricarica)));
  $('#add-s', panel)?.addEventListener('click', () => modificaSettore(c.id, { x: 50, y: 50, stato: 'sconosciuto', raggio: 5 }, ricarica));

  $('#map-img', panel)?.addEventListener('click', async () => {
    const r = await modulo('Immagine satellitare', [
      { name: 'file', label: 'Carica un\'immagine dal PC', type: 'file', accept: 'image/*', full: true, help: 'Uno screenshot della mappa satellitare (JPG/PNG/WebP). Consigliato lato lungo 2000–4000 px.' },
      { name: 'url', label: 'Oppure incolla un link', value: c.mappa && !c.mappa.startsWith('blob:') ? c.mappa : '', full: true },
      ...(c.mappa ? [{ name: 'rimuovi', label: 'Rimuovi l\'immagine attuale', type: 'checkbox' }] : []),
    ]);
    if (!r) return;
    try {
      let mappa = r.url || c.mappa;
      if (r.file) { toast('Caricamento immagine…'); mappa = await storage.uploadImmagine(r.file); }
      if (r.rimuovi) mappa = '';
      await db.update('campagne', { id: c.id }, { mappa });
      toast('Mappa aggiornata');
      ricarica();
    } catch (e) { errore(e); }
  });
}

async function modificaSettore(campagnaId, s, ricarica) {
  const nuovo = !s.id;
  const r = await modulo(nuovo ? 'Nuovo settore' : `Settore: ${s.nome}`, [
    { name: 'nome', label: 'Nome', value: s.nome, required: true },
    { name: 'stato', label: 'Controllo', type: 'select', value: s.stato || 'sconosciuto', options: Object.entries(STATI_SETTORE).map(([k, v]) => [k, v.label]) },
    { name: 'raggio', label: 'Ampiezza della zona (0 = solo segnaposto)', type: 'range', min: 0, max: 25, value: s.raggio ?? 5, full: true },
    { name: 'x', label: 'Posizione X %', type: 'number', min: 0, max: 100, value: s.x ?? 50 },
    { name: 'y', label: 'Posizione Y %', type: 'number', min: 0, max: 100, value: s.y ?? 50 },
    { name: 'descrizione', label: 'Note', type: 'textarea', rows: 3, value: s.descrizione },
    ...(nuovo ? [] : [{ name: 'elimina', label: 'Elimina questo settore', type: 'checkbox', value: false }]),
  ], { conferma: nuovo ? 'Crea settore' : 'Salva' });
  if (!r) return;
  const { elimina, ...dati } = r;
  try {
    if (elimina) {
      if (!(await conferma(`Eliminare il settore "${s.nome}"?`, 'Elimina'))) return;
      await db.remove('settori', { id: s.id });
      toast('Settore eliminato');
    } else if (nuovo) {
      await db.insert('settori', { ...dati, campagna_id: campagnaId });
      toast('Settore creato');
    } else {
      await db.update('settori', { id: s.id }, dati);
      toast('Settore salvato');
    }
    ricarica();
  } catch (e) { errore(e); }
}


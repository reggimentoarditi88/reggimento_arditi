// Calendario e dettaglio evento (partecipanti, documenti, presenze)
import { TIPI_EVENTO } from '../config.js';
import { db, storage } from '../db.js';
import { stato, can, membro, loggato, puntiEvento } from '../state.js';
import { ic, T } from '../ui.js';
import { dopoModificaPunti } from './membri.js';
import { esc, md, data, ora, dataOra, badgeTipo, badgeGrado, avatar, nomeMembro, modulo, conferma, toast, errore, vuoto, titoloPagina, toLocalInput, $, $$ } from '../ui.js';

// ---------- CALENDARIO ----------
export async function calendario(app) {
  const eventi = await db.list('eventi', { order: 'inizio' });
  const adesso = new Date().toISOString();
  const prossimi = eventi.filter((e) => (e.fine || e.inizio) >= adesso).slice(0, 8);

  app.innerHTML = `
    ${titoloPagina('cal', 'Calendario', 'Milsim, missioni, addestramenti e riunioni.', can('eventi') ? `<button class="btn btn-primary" id="add">${ic('plus')} Nuovo evento</button>` : '')}
    <ul class="legend legend-inline">${Object.values(TIPI_EVENTO).map((t) => `<li><i style="background:${t.color}"></i>${esc(t.label)}</li>`).join('')}</ul>
    <div class="cal-layout">
      <div class="card cal-card"><div id="cal"></div></div>
      <aside class="card">
        <h2 class="h-small">${T('cal.agenda', 'In programma')}</h2>
        ${prossimi.length ? `<ul class="agenda">${prossimi.map((e) => `
          <li><a href="#/evento/${e.id}">
            <span class="agenda-date">${data(e.inizio)} · ${ora(e.inizio)}</span>
            <span class="ev-title">${esc(e.titolo)}</span>
            <span>${badgeTipo(e.tipo)}${tagCampagna(e)}</span>
          </a></li>`).join('')}</ul>` : vuoto('Nessun evento in programma.')}
      </aside>
    </div>`;

  if (window.FullCalendar) {
    const cal = new window.FullCalendar.Calendar($('#cal'), {
      locale: 'it',
      firstDay: 1,
      height: 'auto',
      initialView: window.innerWidth < 700 ? 'listMonth' : 'dayGridMonth',
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listMonth' },
      buttonText: { today: 'Oggi', month: 'Mese', week: 'Settimana', list: 'Elenco' },
      eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
      events: eventi.map((e) => ({
        id: e.id,
        title: e.titolo,
        start: e.inizio,
        end: e.fine || undefined,
        color: (TIPI_EVENTO[e.tipo] || TIPI_EVENTO.altro).color,
      })),
      eventClick: (info) => { info.jsEvent.preventDefault(); location.hash = `#/evento/${info.event.id}`; },
    });
    cal.render();
  } else {
    $('#cal').innerHTML = vuoto('Impossibile caricare il calendario.');
  }
  $('#add')?.addEventListener('click', () => modificaEvento(null));
}

export function tagCampagna(e) {
  const c = e.campagna_id && stato.campagne.find((x) => x.id === e.campagna_id);
  return c ? ` <a class="tag tag-camp" href="#/campagne/${c.id}">${esc(c.titolo)}</a>` : '';
}

export async function modificaEvento(ev, campagnaPredefinita = null) {
  const r = await modulo(ev ? 'Modifica evento' : 'Nuovo evento', [
    { name: 'titolo', label: 'Titolo', value: ev?.titolo, required: true, full: true },
    { name: 'tipo', label: 'Tipo', type: 'select', value: ev?.tipo || 'milsim', options: Object.entries(TIPI_EVENTO).map(([k, t]) => [k, t.label]) },
    { name: 'server', label: 'Server / luogo', value: ev?.server },
    { name: 'inizio', label: 'Inizio', type: 'datetime-local', value: toLocalInput(ev?.inizio), required: true },
    { name: 'fine', label: 'Fine', type: 'datetime-local', value: toLocalInput(ev?.fine) },
    { name: 'campagna_id', label: 'Campagna', type: 'select', value: ev ? ev.campagna_id || '' : campagnaPredefinita || '', options: [['', 'Nessuna'], ...stato.campagne.map((c) => [c.id, c.titolo])] },
    { name: 'descrizione', label: 'Descrizione / briefing', type: 'textarea', rows: 8, value: ev?.descrizione, help: 'Supporta Markdown. I file (PDF, immagini) si allegano dopo aver salvato.' },
  ]);
  if (!r) return;
  r.inizio = new Date(r.inizio).toISOString();
  r.fine = r.fine ? new Date(r.fine).toISOString() : null;
  r.campagna_id = r.campagna_id || null;
  if (r.fine && r.fine < r.inizio) return errore(new Error('La fine è precedente all\'inizio.'));
  try {
    if (ev) {
      await db.update('eventi', { id: ev.id }, r);
      toast('Evento aggiornato');
      window.dispatchEvent(new Event('rerender'));
    } else {
      const nuovo = await db.insert('eventi', r);
      toast('Evento creato');
      location.hash = `#/evento/${nuovo.id}`;
    }
  } catch (e) { errore(e); }
}

// ---------- DETTAGLIO EVENTO ----------
const STATI_P = { iscritto: 'Iscritto', presente: 'Presente', assente: 'Assente' };

export async function evento(app, id) {
  const ev = await db.get('eventi', { id });
  if (!ev) { app.innerHTML = vuoto('Evento non trovato.'); return; }
  document.title = ev.titolo;
  const [partecipanti, profili, documenti] = await Promise.all([
    membro() ? db.list('partecipanti', { eq: { evento_id: id } }) : [],
    membro() ? db.list('profili') : [],
    membro() ? db.list('documenti', { eq: { evento_id: id }, order: 'creato_il' }) : [],
  ]);
  const pById = new Map(profili.map((p) => [p.id, p]));
  const mio = partecipanti.find((p) => p.utente_id === stato.me?.id);
  const passato = new Date(ev.fine || ev.inizio) < new Date();
  const punti = puntiEvento(ev);
  const gestore = can('eventi');
  const ordinati = [...partecipanti].sort((a, b) => (pById.get(b.utente_id)?.grado ?? 0) - (pById.get(a.utente_id)?.grado ?? 0));

  app.innerHTML = `
    <a href="#/calendario" class="back">${ic('arrow-left')} Calendario</a>
    <div class="page-head">
      <div>
        <div class="muted">${badgeTipo(ev.tipo)}${tagCampagna(ev)} ${ev.esito ? `<span class="tag tag-${ev.esito}">Missione ${esc(ev.esito)}</span>` : ''}</div>
        <h1>${esc(ev.titolo)}</h1>
        <p class="lead">${data(ev.inizio)} · ore ${ora(ev.inizio)}${ev.fine ? `–${ora(ev.fine)}` : ''}${ev.server ? ` · ${esc(ev.server)}` : ''}</p>
      </div>
      <div class="actions">
        ${gestore ? `<button class="btn btn-ghost" id="edit">${ic('pencil')} Modifica</button><button class="btn btn-danger" id="del">${ic('trash-2')} Elimina</button>` : ''}
      </div>
    </div>

    <div class="two-col">
      <div class="stack">
        <article class="card prose">${md(ev.descrizione) || '<p class="muted">Nessuna descrizione.</p>'}</article>
        <section class="card">
          <header class="card-head"><h2>Documenti</h2>${gestore ? `<button class="btn btn-small btn-ghost" id="up">${ic('paperclip')} Allega file</button>` : ''}</header>
          ${!membro() ? '<p class="muted">🔒 Documenti riservati ai membri.</p>' : documenti.length ? `<ul class="docs">${documenti.map((d) => `
            <li><button class="link" data-doc="${esc(d.percorso)}">${ic('file-text')} ${esc(d.titolo)}</button>
            ${gestore ? `<button class="icon-btn" data-deldoc="${d.id}" title="Elimina">${ic('x')}</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Nessun documento allegato.</p>'}
        </section>
      </div>

      <section class="card">
        <header class="card-head"><h2>Partecipanti <span class="count">${partecipanti.length}</span></h2>
          ${punti ? `<span class="tag" title="Punti grado per i presenti">+${punti} punt${punti === 1 ? 'o' : 'i'}</span>` : ''}</header>
        ${!loggato() ? '<p class="muted">Accedi con Discord per iscriverti e vedere i partecipanti.</p>' : !membro() ? '<p class="muted">Il tuo account è in attesa di approvazione.</p>' : `
          ${!passato ? (mio ? `<button class="btn btn-ghost full-w" id="leave">${ic('user-minus')} Annulla partecipazione</button>` : `<button class="btn btn-primary full-w" id="join">${ic('check')} Partecipo</button>`) : ''}
          ${gestore && ev.tipo === 'missione' ? `<div class="esito"><span>Esito missione:</span>
            <button class="btn btn-small ${ev.esito === 'compiuta' ? 'btn-primary' : 'btn-ghost'}" data-esito="compiuta">Compiuta</button>
            <button class="btn btn-small ${ev.esito === 'fallita' ? 'btn-danger' : 'btn-ghost'}" data-esito="fallita">Fallita</button></div>` : ''}
          ${ordinati.length ? `<ul class="people">${ordinati.map((p) => { const u = pById.get(p.utente_id); return `
            <li>
              <a href="#/profilo/${p.utente_id}" class="person">${avatar(u, 32)}<span><b>${nomeMembro(u)}</b><br>${badgeGrado(u?.grado ?? 0)} <span class="muted small">${esc(u?.ruolo || '')}</span></span></a>
              ${gestore ? `<select class="sel-small" data-stato="${p.utente_id}" aria-label="Stato di ${nomeMembro(u)}">${Object.entries(STATI_P).map(([k, l]) => `<option value="${k}" ${p.stato === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`
                : `<span class="tag tag-p-${p.stato}">${STATI_P[p.stato]}</span>`}
            </li>`; }).join('')}</ul>` : '<p class="muted">Nessun iscritto.</p>'}
          ${gestore ? `<button class="btn btn-small btn-ghost" id="addp">${ic('user-plus')} Aggiungi membro</button>` : ''}
          ${gestore && passato ? '<p class="help">Segna "Presente" chi ha partecipato: i punti grado vengono assegnati automaticamente.</p>' : ''}`}
      </section>
    </div>`;

  const ricarica = () => evento(app, id);
  $('#edit')?.addEventListener('click', () => modificaEvento(ev));
  $('#del')?.addEventListener('click', async () => {
    if (!(await conferma(`Eliminare "${ev.titolo}"? Verranno eliminati anche partecipanti e presenze.`, 'Elimina'))) return;
    try {
      for (const d of documenti) await storage.remove(d.percorso).catch(() => {});
      await db.remove('eventi', { id });
      toast('Evento eliminato');
      location.hash = '#/calendario';
    } catch (e) { errore(e); }
  });
  $('#join')?.addEventListener('click', async () => {
    try { await db.insert('partecipanti', { evento_id: id, utente_id: stato.me.id, stato: 'iscritto' }, { ret: false }); toast('Iscrizione registrata'); ricarica(); } catch (e) { errore(e); }
  });
  $('#leave')?.addEventListener('click', async () => {
    try { await db.remove('partecipanti', { evento_id: id, utente_id: stato.me.id }); ricarica(); } catch (e) { errore(e); }
  });
  $$('[data-stato]', app).forEach((s) => s.addEventListener('change', async () => {
    try { await db.update('partecipanti', { evento_id: id, utente_id: s.dataset.stato }, { stato: s.value }); toast('Presenza aggiornata'); await dopoModificaPunti(); } catch (e) { errore(e); }
  }));
  $$('[data-esito]', app).forEach((b) => b.addEventListener('click', async () => {
    const esito = ev.esito === b.dataset.esito ? null : b.dataset.esito;
    try { await db.update('eventi', { id }, { esito }); await dopoModificaPunti(); ricarica(); } catch (e) { errore(e); }
  }));
  $('#addp')?.addEventListener('click', async () => {
    const giaDentro = new Set(partecipanti.map((p) => p.utente_id));
    const disponibili = profili.filter((p) => p.stato === 'membro' && !giaDentro.has(p.id)).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    if (!disponibili.length) return toast('Tutti i membri sono già in lista');
    const r = await modulo('Aggiungi partecipante', [
      { name: 'utente_id', label: 'Membro', type: 'select', options: disponibili.map((p) => [p.id, p.nome || p.discord_nome]) },
      { name: 'stato', label: 'Stato', type: 'select', value: passato ? 'presente' : 'iscritto', options: Object.entries(STATI_P) },
    ]);
    if (!r) return;
    try { await db.insert('partecipanti', { evento_id: id, ...r }, { ret: false }); await dopoModificaPunti(); ricarica(); } catch (e) { errore(e); }
  });
  $('#up')?.addEventListener('click', async () => {
    const r = await modulo('Allega documento', [
      { name: 'file', label: 'File (PDF, immagine, documento — max 50 MB)', type: 'file', required: true, full: true },
      { name: 'titolo', label: 'Titolo (facoltativo)', full: true },
    ]);
    if (!r?.file) return;
    try {
      toast('Caricamento in corso…');
      const percorso = await storage.upload(r.file);
      await db.insert('documenti', { evento_id: id, titolo: r.titolo || r.file.name, percorso });
      toast('Documento caricato');
      ricarica();
    } catch (e) { errore(e); }
  });
  $$('[data-doc]', app).forEach((b) => b.addEventListener('click', async () => {
    try {
      const url = await storage.url(b.dataset.doc);
      if (!url) return toast('Documento di esempio: in demo non esiste un file reale.', 'err');
      window.open(url, '_blank', 'noopener');
    } catch (e) { errore(e); }
  }));
  $$('[data-deldoc]', app).forEach((b) => b.addEventListener('click', async () => {
    const d = documenti.find((x) => x.id === b.dataset.deldoc);
    if (!(await conferma(`Eliminare "${d.titolo}"?`, 'Elimina'))) return;
    try { await storage.remove(d.percorso).catch(() => {}); await db.remove('documenti', { id: d.id }); ricarica(); } catch (e) { errore(e); }
  }));
}

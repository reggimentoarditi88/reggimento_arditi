// Organico (pubblico), profili, promozioni, gestione (candidature, approvazioni, permessi)
import { CONFIG, GRADI, RUOLI, SPECIALIZZAZIONI, PERMESSI, INCARICHI, categoriaGrado } from '../config.js';
import { db, auth, DEMO } from '../db.js';
import { stato, can, membro, loggato, datiPunti, puntiGrado, caricaUtente, delDirettivo, verificaPromozioni } from '../state.js';
import { esc, ic, T, data, dataOra, badgeGrado, badgeTipo, avatar, nomeMembro, modulo, conferma, toast, errore, vuoto, titoloPagina, riservata, $, $$ } from '../ui.js';

function soloMembri(app) {
  app.innerHTML = riservata(loggato());
}

const incarichi = (p) => ((p.permessi || []).includes('admin')
  ? [INCARICHI.admin]
  : (p.permessi || []).map((x) => INCARICHI[x] || x));

function barraPunti(pg) {
  const max = CONFIG.PUNTI_PROMOZIONE;
  const pct = Math.min(100, (pg / max) * 100);
  return `<div class="progress ${pg >= max ? 'full' : ''}" title="${pg}/${max} punti grado"><i style="--w:${pct}%"></i></div>
    <div class="small muted">${pg}/${max} punti al prossimo grado</div>`;
}

// Dopo ogni modifica ai punti: promozioni automatiche (in demo; con Supabase le fa il database)
export async function dopoModificaPunti() {
  try {
    for (const msg of await verificaPromozioni()) toast(`🎖️ ${msg}`);
  } catch (e) { errore(e); }
}

// ---------- ORGANICO ----------
export async function organico(app) {
  const vediPunti = membro();
  const [profili, punti] = await Promise.all([db.list('profili'), vediPunti ? datiPunti() : new Map()]);
  const membri = profili.filter((p) => p.stato === 'membro').sort((a, b) => b.grado - a.grado || (a.nome || '').localeCompare(b.nome || ''));
  const direttivo = membri.filter(delDirettivo);
  let filtro = '';
  try { filtro = sessionStorage.getItem('filtroRuolo') || ''; } catch { /* ignorato */ }

  const gruppi = [];
  for (const m of membri.filter((m) => !delDirettivo(m) && (!filtro || m.ruolo === filtro))) {
    const c = categoriaGrado(m.grado);
    let g = gruppi.find((x) => x.nome === c.nome);
    if (!g) gruppi.push((g = { nome: c.nome, cls: c.cls, membri: [] }));
    g.membri.push(m);
  }

  const cardMembro = (m) => `<a class="card member" href="#/profilo/${m.id}">
      ${avatar(m, 56)}
      <div class="member-info">
        <h3>${nomeMembro(m)}</h3>
        ${badgeGrado(m.grado)}
        <div class="small">${esc(m.ruolo || 'Ruolo non assegnato')}${m.specializzazioni?.length ? ` · <span class="muted">${m.specializzazioni.map(esc).join(', ')}</span>` : ''}</div>
        ${vediPunti ? barraPunti(puntiGrado(m, punti.get(m.id)?.totale || 0)) : ''}
      </div></a>`;

  app.innerHTML = `
    ${titoloPagina('org', 'Organico', 'La struttura del Reggimento Arditi.')}

    <section class="direttivo reveal">
      <header class="direttivo-head">
        ${ic('shield', 'dir-ic')}
        <div><h2>${T('org.direttivo', 'Direttivo')}</h2><p class="muted">${T('org.direttivo.testo', 'Chi guida e gestisce il Reggimento.')}</p></div>
      </header>
      <div class="grid-direttivo">${direttivo.map((m) => `
        <a class="card leader" href="#/profilo/${m.id}">
          ${avatar(m, 84)}
          <h3>${nomeMembro(m)}</h3>
          ${badgeGrado(m.grado)}
          <div class="chips center-chips">${incarichi(m).map((x) => `<span class="chip chip-gold">${esc(x)}</span>`).join('')}</div>
          <div class="small muted">${esc(m.ruolo || '')}</div>
        </a>`).join('') || vuoto('Nessun membro del Direttivo.')}</div>
    </section>

    <div class="toolbar">
      <label>${ic('filter')} Ruolo <select id="filtro"><option value="">Tutti</option>${Object.keys(RUOLI).map((r) => `<option ${r === filtro ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
      <div class="role-count">${Object.keys(RUOLI).map((r) => `<span class="chip">${esc(r)} <b>${membri.filter((m) => m.ruolo === r).length}</b></span>`).join('')}</div>
      <span class="muted small push">${membri.length} ${T('org.effettivi', 'membri effettivi')}</span>
    </div>
    ${gruppi.map((g) => `
      <h2 class="section-title grado-${g.cls}-txt">${esc(g.nome)}</h2>
      <div class="grid-members">${g.membri.map(cardMembro).join('')}</div>`).join('') || vuoto('Nessun membro trovato.')}`;

  $('#filtro').addEventListener('change', (e) => {
    try { sessionStorage.setItem('filtroRuolo', e.target.value); } catch { /* ignorato */ }
    organico(app);
    window.lucide?.createIcons();
  });
}

// ---------- PROFILO (pubblico: dati base; membri: punti e storico) ----------
export async function profilo(app, id) {
  if (!id && !loggato()) return soloMembri(app);
  id = id || stato.me.id;
  const p = await db.get('profili', { id });
  if (!p || (p.stato !== 'membro' && id !== stato.me?.id && !can('membri'))) { app.innerHTML = vuoto('Profilo non trovato.'); return; }
  const punti = membro() ? (await datiPunti()).get(id) : null;
  const totale = punti?.totale || 0;
  const pg = puntiGrado(p, totale);
  const mio = id === stato.me?.id;
  const gestore = can('membri');
  const admin = can('admin');
  const conta = (tipo) => punti?.storico.filter((s) => s.evento?.tipo === tipo).length || 0;
  const nMissioni = conta('missione');
  const nAddestr = conta('addestramento');
  const nMilsim = conta('milsim');
  document.title = p.nome || 'Profilo';

  app.innerHTML = `
    <a href="#/organico" class="back">${ic('arrow-left')} Organico</a>
    <section class="card profile-head">
      <div class="profile-avatar">${avatar(p, 112)}</div>
      <div class="profile-main">
        <h1>${nomeMembro(p)}</h1>
        <div class="muted small">${ic('at-sign')} ${esc(p.discord_nome || '—')} ${p.stato !== 'membro' ? `· <span class="tag">${esc(p.stato.replace('_', ' '))}</span>` : ''}</div>
        <div class="profile-rank">${badgeGrado(p.grado)}</div>
        <div class="kv">
          <div><span>Ruolo</span><b>${esc(p.ruolo || '—')}</b></div>
          <div><span>Specializzazioni</span><b>${p.specializzazioni?.length ? p.specializzazioni.map(esc).join(', ') : '—'}</b></div>
          ${delDirettivo(p) ? `<div><span>Direttivo</span><b>${incarichi(p).map(esc).join(', ')}</b></div>` : ''}
        </div>
      </div>
      <div class="profile-actions">
        ${mio ? `<button class="btn btn-ghost" id="nome">${ic('pencil')} Modifica nome</button>` : ''}
        ${gestore ? `<button class="btn btn-ghost" id="edit">${ic('user-cog')} Gestisci membro</button>` : ''}
        ${gestore && p.stato === 'membro' ? `<button class="btn btn-primary" id="punti">${ic('award')} Aggiungi / togli punti</button>` : ''}
        ${gestore && p.grado < GRADI.length - 1 ? `<button class="btn btn-ghost" id="promo" title="Promozione immediata senza consumare punti">${ic('chevrons-up')} Promozione sul campo</button>` : ''}
        ${admin ? `<button class="btn btn-ghost" id="perm">${ic('key-round')} Permessi</button>` : ''}
      </div>
    </section>

    ${!membro() ? '' : `<div class="stat-row stat-cards">
      <div class="card stat"><b>${pg}</b><span>punti grado</span>${barraPunti(pg)}</div>
      <div class="card stat"><b>${totale}</b><span>punti totali</span></div>
      <div class="card stat"><b>${nMissioni}</b><span>missioni</span></div>
      <div class="card stat"><b>${nAddestr}</b><span>addestramenti</span></div>
      <div class="card stat"><b>${nMilsim}</b><span>milsim</span></div>
    </div>

    <section class="card">
      <h2>${T('profilo.storico', 'Storico operazioni e punti')}</h2>
      ${punti?.storico.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Data</th><th>Evento / motivo</th><th>Tipo</th><th class="num">Punti</th>${gestore ? '<th></th>' : ''}</tr></thead>
        <tbody>${punti.storico.map((s) => s.evento ? `<tr>
          <td>${data(s.evento.inizio)}</td>
          <td><a href="#/evento/${s.evento.id}">${esc(s.evento.titolo)}</a>${s.evento.esito ? ` <span class="tag tag-${s.evento.esito}">${esc(s.evento.esito)}</span>` : ''}</td>
          <td>${badgeTipo(s.evento.tipo)}</td><td class="num">+${s.punti}</td>${gestore ? '<td></td>' : ''}</tr>` : `<tr class="row-manuale">
          <td>${data(s.manuale.creato_il)}</td>
          <td>${esc(s.manuale.motivo || 'Assegnazione manuale')}</td>
          <td><span class="tag" style="--tag:#d9b45a">Manuale</span></td>
          <td class="num ${s.punti < 0 ? 'neg' : 'pos'}">${s.punti > 0 ? '+' : ''}${s.punti}</td>
          ${gestore ? `<td class="num"><button class="icon-btn" data-delpunti="${s.manuale.id}" title="Annulla">${ic('undo-2')}</button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : vuoto('Nessuna presenza registrata.')}
    </section>`}`;

  const ricarica = async () => { if (mio) await caricaUtente(); window.dispatchEvent(new Event('rerender')); };

  $('#nome')?.addEventListener('click', async () => {
    const r = await modulo('Il tuo nome in gioco', [{ name: 'nome', label: 'Nome / nominativo', value: p.nome, required: true }]);
    if (!r) return;
    try { await db.update('profili', { id }, { nome: r.nome }); toast('Nome aggiornato'); ricarica(); } catch (e) { errore(e); }
  });
  $('#edit')?.addEventListener('click', async () => {
    const r = await modulo(`Gestisci ${p.nome || p.discord_nome}`, [
      { name: 'nome', label: 'Nome in gioco', value: p.nome },
      { name: 'stato', label: 'Stato', type: 'select', value: p.stato, options: [['in_attesa', 'In attesa'], ['membro', 'Membro effettivo'], ['riserva', 'Riserva'], ['congedato', 'Congedato']] },
      { name: 'grado', label: 'Grado', type: 'select', value: p.grado, options: GRADI.map((g, i) => [i, g]).reverse() },
      { name: 'ruolo', label: 'Ruolo', type: 'select', value: p.ruolo || '', options: [['', '—'], ...Object.keys(RUOLI).map((r) => [r, r])] },
      { name: 'specializzazioni', label: 'Specializzazioni', type: 'checks', value: p.specializzazioni || [], options: Object.keys(SPECIALIZZAZIONI).map((s) => [s, s]) },
      { name: 'punti_usati', label: 'Punti già usati per promozioni', type: 'number', min: 0, value: p.punti_usati || 0, help: 'Si aggiorna da solo con il pulsante Promuovi. Modificalo solo per correzioni.' },
    ]);
    if (!r) return;
    r.grado = Number(r.grado);
    r.ruolo = r.ruolo || null;
    try { await db.update('profili', { id }, r); toast('Profilo aggiornato'); ricarica(); } catch (e) { errore(e); }
  });
  $('#promo')?.addEventListener('click', async () => {
    const nuovo = GRADI[p.grado + 1];
    if (!(await conferma(`Promuovere subito ${p.nome || p.discord_nome} a ${nuovo}? I punti grado accumulati (${pg}) restano invariati.`, 'Promuovi'))) return;
    try { await db.update('profili', { id }, { grado: p.grado + 1 }); toast(`Promosso a ${nuovo}`); ricarica(); } catch (e) { errore(e); }
  });
  $('#punti')?.addEventListener('click', async () => {
    const r = await modulo(`Punti di ${p.nome || p.discord_nome}`, [
      { name: 'punti', label: 'Punti (negativi per togliere)', type: 'number', value: 1, required: true, help: `Ha ${pg}/${CONFIG.PUNTI_PROMOZIONE} punti grado. A ${CONFIG.PUNTI_PROMOZIONE} sale di grado automaticamente.` },
      { name: 'motivo', label: 'Motivo', placeholder: 'es. Encomio per Op. Alba Grigia', required: true },
    ], { testo: 'I punti manuali compaiono nello storico del membro e si possono annullare.' });
    if (!r) return;
    if (!r.punti || !Number.isInteger(r.punti)) return errore(new Error('Inserisci un numero intero diverso da zero.'));
    try {
      await db.insert('punti_manuali', { utente_id: id, punti: r.punti, motivo: r.motivo }, { ret: false });
      toast(`${r.punti > 0 ? '+' : ''}${r.punti} punti a ${p.nome || p.discord_nome}`);
      await dopoModificaPunti();
      ricarica();
    } catch (e) { errore(e); }
  });
  $$('[data-delpunti]', app).forEach((b) => b.addEventListener('click', async () => {
    if (!(await conferma('Annullare questa assegnazione di punti? Il grado già raggiunto non viene tolto.', 'Annulla punti'))) return;
    try { await db.remove('punti_manuali', { id: b.dataset.delpunti }); ricarica(); } catch (e) { errore(e); }
  }));
  $('#perm')?.addEventListener('click', () => modificaPermessi(p, ricarica));
}

async function modificaPermessi(p, dopo) {
  const r = await modulo(`Permessi di ${p.nome || p.discord_nome}`, [
    { name: 'permessi', label: 'Cosa può gestire', type: 'checks', value: p.permessi || [], options: Object.entries(PERMESSI) },
  ]);
  if (!r) return;
  if (p.id === stato.me.id && !r.permessi.includes('admin') && !(await conferma('Stai togliendo a te stesso il permesso di amministratore. Continuare?', 'Continua'))) return;
  try { await db.update('profili', { id: p.id }, { permessi: r.permessi }); toast('Permessi aggiornati'); dopo(); } catch (e) { errore(e); }
}

// ---------- GESTIONE ----------
const STATI_CAND = { nuova: 'Nuova', in_valutazione: 'In valutazione', accettata: 'Accettata', rifiutata: 'Rifiutata' };

export async function gestione(app) {
  const puoCand = can('reclutamento');
  const puoMembri = can('membri');
  const admin = can('admin');
  if (!puoCand && !puoMembri && !admin) return soloMembri(app);

  const [candidature, profili] = await Promise.all([
    puoCand ? db.list('candidature', { order: 'creato_il', asc: false }) : [],
    db.list('profili'),
  ]);
  const inAttesa = profili.filter((p) => p.stato === 'in_attesa');
  const conPermessi = profili.filter((p) => (p.permessi || []).length);

  app.innerHTML = `
    ${titoloPagina('gest', 'Gestione', 'Pannello del Direttivo.')}
    ${puoMembri ? `<section class="card">
      <header class="card-head"><h2>Account in attesa di approvazione <span class="count">${inAttesa.length}</span></h2></header>
      <p class="help">Chiunque accede con Discord crea un account "in attesa". Approva solo chi fa parte del Reggimento.</p>
      ${inAttesa.length ? `<ul class="people">${inAttesa.map((p) => `<li>
        <span class="person">${avatar(p, 32)}<span><b>${nomeMembro(p)}</b><br><span class="muted small">Discord: ${esc(p.discord_nome || '—')}</span></span></span>
        <span><button class="btn btn-small btn-primary" data-ok="${p.id}">Approva come Recluta</button> <button class="btn btn-small btn-danger" data-no="${p.id}">Rifiuta</button></span>
      </li>`).join('')}</ul>` : vuoto('Nessun account in attesa.')}
    </section>` : ''}

    ${puoCand ? `<section class="card">
      <header class="card-head"><h2>Candidature <span class="count">${candidature.filter((c) => c.stato === 'nuova').length} nuove</span></h2></header>
      ${candidature.length ? `<div class="cand-list">${candidature.map((c) => `
        <details class="cand" ${c.stato === 'nuova' ? 'open' : ''}>
          <summary><b>${esc(c.discord_nome)}</b> <span class="muted">· ${esc(c.eta)} anni · ${dataOra(c.creato_il)}</span> <span class="tag tag-c-${c.stato}">${STATI_CAND[c.stato]}</span></summary>
          <dl class="dl">
            <dt>Disponibilità</dt><dd>${esc(c.disponibilita)}</dd>
            <dt>Ruolo preferito</dt><dd>${esc(c.ruolo_preferito || '—')}</dd>
            <dt>Esperienza</dt><dd>${esc(c.esperienza)}</dd>
            <dt>Motivazione</dt><dd>${esc(c.motivazione)}</dd>
            <dt>Come ci ha conosciuto</dt><dd>${esc(c.provenienza || '—')}</dd>
          </dl>
          <div class="row-actions">
            <select class="sel-small" data-cand="${c.id}" aria-label="Stato candidatura">${Object.entries(STATI_CAND).map(([k, l]) => `<option value="${k}" ${c.stato === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <button class="btn btn-small btn-danger" data-delcand="${c.id}">Elimina</button>
          </div>
        </details>`).join('')}</div>` : vuoto('Nessuna candidatura ricevuta.')}
    </section>` : ''}

    ${admin ? `<section class="card">
      <header class="card-head"><h2>Incarichi e permessi</h2></header>
      <p class="help">Per assegnare permessi apri il profilo di un membro e premi "Permessi".</p>
      <table class="table"><thead><tr><th>Membro</th><th>Permessi</th></tr></thead>
      <tbody>${conPermessi.map((p) => `<tr><td><a href="#/profilo/${p.id}">${nomeMembro(p)}</a></td><td>${p.permessi.map((x) => `<span class="chip" title="${esc(PERMESSI[x] || '')}">${esc(x)}</span>`).join(' ')}</td></tr>`).join('')}</tbody></table>
    </section>` : ''}

    ${DEMO ? `<section class="card demo-box">
      <h2>Modalità demo: prova i permessi</h2>
      <p class="help">Accedi come un altro membro per vedere cosa vede chi ha meno permessi.</p>
      <div class="chips">${profili.map((p) => `<button class="btn btn-small btn-ghost" data-imp="${p.id}">${nomeMembro(p)}</button>`).join('')}</div>
    </section>` : ''}`;

  $$('[data-ok]', app).forEach((b) => b.addEventListener('click', async () => {
    try { await db.update('profili', { id: b.dataset.ok }, { stato: 'membro', grado: 0 }); toast('Membro approvato'); gestione(app); } catch (e) { errore(e); }
  }));
  $$('[data-no]', app).forEach((b) => b.addEventListener('click', async () => {
    if (!(await conferma('Rifiutare questo account? Potrà comunque riaccedere e risultare di nuovo in attesa.', 'Rifiuta'))) return;
    try { await db.update('profili', { id: b.dataset.no }, { stato: 'congedato' }); gestione(app); } catch (e) { errore(e); }
  }));
  $$('[data-cand]', app).forEach((s) => s.addEventListener('change', async () => {
    try { await db.update('candidature', { id: s.dataset.cand }, { stato: s.value }); toast('Candidatura aggiornata'); } catch (e) { errore(e); }
  }));
  $$('[data-delcand]', app).forEach((b) => b.addEventListener('click', async () => {
    if (!(await conferma('Eliminare questa candidatura?', 'Elimina'))) return;
    try { await db.remove('candidature', { id: b.dataset.delcand }); gestione(app); } catch (e) { errore(e); }
  }));
  $$('[data-imp]', app).forEach((b) => b.addEventListener('click', () => { auth.demoImpersona(b.dataset.imp); location.hash = '#/profilo'; }));
}

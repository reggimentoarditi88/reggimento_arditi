// Funzioni di supporto per l'interfaccia
import { CONFIG, GRADI, categoriaGrado, TIPI_EVENTO } from './config.js';
import { db } from './db.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function md(text) {
  if (!text) return '';
  const html = window.marked ? window.marked.parse(text, { breaks: true }) : esc(text).replace(/\n/g, '<br>');
  return window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
}

// Icone Lucide: <i data-lucide="nome">. Vengono disegnate da icone() dopo ogni render.
export const ic = (nome, cls = '') => `<i data-lucide="${nome}" class="ic ${cls}" aria-hidden="true"></i>`;
export function icone(root = document) {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 }, nameAttr: 'data-lucide', root });
}

// ============================================================
//  TESTI MODIFICABILI
//  T('chiave', 'testo predefinito')  → testo su una riga
//  TM('chiave', 'markdown predefinito') → blocco con formattazione
//  Gli amministratori attivano "Modifica testi" e cliccano su qualsiasi testo.
// ============================================================
export const testi = new Map();
let puoModificare = false;

export async function caricaTesti() {
  testi.clear();
  for (const r of await db.list('contenuti')) testi.set(r.chiave, r.testo);
}

export const testo = (chiave, def = '') => (testi.has(chiave) && testi.get(chiave) !== '' ? testi.get(chiave) : def);

export function T(chiave, def = '') {
  return `<span data-txt="${esc(chiave)}" data-def="${esc(def)}">${esc(testo(chiave, def))}</span>`;
}

export function TM(chiave, def = '', cls = 'prose') {
  return `<div class="${cls}" data-md="${esc(chiave)}" data-def="${esc(def)}">${md(testo(chiave, def))}</div>`;
}

export function abilitaModifica(on) {
  puoModificare = on;
  if (!on) document.body.classList.remove('edit-mode');
}
export const modificaAttiva = () => document.body.classList.contains('edit-mode');
export function toggleModifica() {
  if (!puoModificare) return;
  document.body.classList.toggle('edit-mode');
  toast(modificaAttiva() ? 'Modifica testi attiva: clicca su un testo per cambiarlo' : 'Modifica testi disattivata');
  return modificaAttiva();
}

async function salvaTesto(chiave, valore) {
  await db.upsert('contenuti', { chiave, testo: valore });
  testi.set(chiave, valore);
}

// Clic su un testo in modalità modifica
document.addEventListener('click', async (e) => {
  if (!modificaAttiva()) return;
  const t = e.target.closest('[data-txt]');
  const m = e.target.closest('[data-md]');
  if (!t && !m) return;
  e.preventDefault();
  e.stopPropagation();
  if (t) {
    if (t.isContentEditable) return;
    const originale = t.textContent;
    t.contentEditable = 'true';
    t.focus();
    const sel = getSelection();
    sel.selectAllChildren(t);
    const fine = async (salva) => {
      t.removeEventListener('keydown', tasti);
      t.contentEditable = 'false';
      const nuovo = t.textContent.trim();
      if (!salva || nuovo === originale.trim()) { t.textContent = originale; return; }
      try {
        await salvaTesto(t.dataset.txt, nuovo);
        // aggiorna tutte le copie dello stesso testo nella pagina
        const mostrato = nuovo || t.dataset.def;
        $$(`[data-txt="${CSS.escape(t.dataset.txt)}"]`).forEach((x) => { x.textContent = mostrato; });
        toast('Testo salvato');
      } catch (err) { t.textContent = originale; errore(err); }
    };
    const tasti = (k) => {
      if (k.key === 'Enter') { k.preventDefault(); t.blur(); }
      if (k.key === 'Escape') { k.preventDefault(); fine(false); }
    };
    t.addEventListener('keydown', tasti);
    t.addEventListener('blur', () => fine(true), { once: true });
  } else {
    const chiave = m.dataset.md;
    const r = await modulo('Modifica testo', [
      { name: 'testo', label: 'Testo', type: 'textarea', rows: 14, value: testo(chiave, m.dataset.def), help: 'Formattazione: **grassetto**, *corsivo*, ### Titolo, - elenco, [link](https://…). Svuota il campo per tornare al testo predefinito.' },
    ]);
    if (!r) return;
    try {
      await salvaTesto(chiave, r.testo);
      m.innerHTML = md(testo(chiave, m.dataset.def));
      toast('Testo salvato');
    } catch (err) { errore(err); }
  }
}, true);

// ============================================================
//  FORMATTAZIONE
// ============================================================
const fmtData = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtOra = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });
const fmtBreve = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });

export const data = (iso) => (iso ? fmtData.format(new Date(iso)) : '');
export const ora = (iso) => (iso ? fmtOra.format(new Date(iso)) : '');
export const dataBreve = (iso) => (iso ? fmtBreve.format(new Date(iso)) : '');
export const dataOra = (iso) => (iso ? `${data(iso)} · ${ora(iso)}` : '');

export function bytes(n) {
  if (!n && n !== 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i >= 2 ? 2 : 0).replace('.', ',')} ${u[i]}`;
}

export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function badgeGrado(i) {
  const c = categoriaGrado(i);
  return `<span class="grado grado-${c.cls}" title="${esc(c.nome)}">${esc(GRADI[i] || '—')}</span>`;
}

export function badgeTipo(tipo) {
  const t = TIPI_EVENTO[tipo] || TIPI_EVENTO.altro;
  return `<span class="tag" style="--tag:${t.color}">${esc(t.label)}</span>`;
}

export function avatar(p, size = 40) {
  const src = p?.avatar_url;
  const iniz = esc((p?.nome || p?.discord_nome || '?').slice(0, 1).toUpperCase());
  return src
    ? `<img class="avatar" src="${esc(src)}" alt="" width="${size}" height="${size}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar avatar-txt',textContent:'${iniz}',style:'width:${size}px;height:${size}px'}))">`
    : `<span class="avatar avatar-txt" style="width:${size}px;height:${size}px">${iniz}</span>`;
}

export function nomeMembro(p) {
  return esc(p?.nome || p?.discord_nome || 'Sconosciuto');
}

// ============================================================
//  NOTIFICHE, FINESTRE, MODULI
// ============================================================
export function toast(msg, tipo = 'ok') {
  const box = $('#toasts') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'toasts' }));
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.textContent = msg;
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3200);
}

export function errore(e) {
  console.error(e);
  toast(e?.message || String(e), 'err');
}

// campi: [{name,label,type,value,options,required,help,full,accept,min,max,placeholder}]
export function modulo(titolo, campi, { conferma = 'Salva', testo: intro = '', pericolo = false } = {}) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'modal';
    dlg.innerHTML = `
      <form method="dialog" class="form">
        <header class="modal-head"><h3>${esc(titolo)}</h3><button type="button" class="icon-btn" data-x aria-label="Chiudi">${ic('x')}</button></header>
        ${intro ? `<p class="modal-text">${esc(intro)}</p>` : ''}
        ${campi.length ? `<div class="form-grid">${campi.map(campoHtml).join('')}</div>` : ''}
        <footer class="modal-foot">
          <button type="button" class="btn btn-ghost" data-x>Annulla</button>
          <button type="submit" class="btn ${pericolo ? 'btn-danger-solid' : 'btn-primary'}">${esc(conferma)}</button>
        </footer>
      </form>`;
    document.body.appendChild(dlg);
    icone(dlg);
    const chiudi = (val) => {
      dlg.classList.add('closing');
      setTimeout(() => { dlg.close(); dlg.remove(); }, 180);
      resolve(val);
    };
    $$('[data-x]', dlg).forEach((b) => b.addEventListener('click', () => chiudi(null)));
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); chiudi(null); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) chiudi(null); });
    $('form', dlg).addEventListener('submit', (e) => {
      e.preventDefault();
      const out = {};
      for (const c of campi) {
        if (c.type === 'checks') out[c.name] = $$(`input[name="${c.name}"]:checked`, dlg).map((i) => i.value);
        else if (c.type === 'checkbox') out[c.name] = $(`[name="${c.name}"]`, dlg).checked;
        else if (c.type === 'file') out[c.name] = $(`[name="${c.name}"]`, dlg).files[0] || null;
        else if (c.type === 'number' || c.type === 'range') { const v = $(`[name="${c.name}"]`, dlg).value; out[c.name] = v === '' ? null : Number(v); }
        else out[c.name] = $(`[name="${c.name}"]`, dlg).value.trim();
      }
      chiudi(out);
    });
    dlg.showModal();
  });
}

function campoHtml(c) {
  const id = `f-${c.name}`;
  const req = c.required ? 'required' : '';
  const v = c.value ?? '';
  const help = c.help ? `<small class="help">${esc(c.help)}</small>` : '';
  const full = c.full || ['textarea', 'checks'].includes(c.type) ? ' full' : '';
  let input;
  switch (c.type) {
    case 'textarea':
      input = `<textarea id="${id}" name="${c.name}" rows="${c.rows || 6}" ${req}>${esc(v)}</textarea>`;
      break;
    case 'select':
      input = `<select id="${id}" name="${c.name}" ${req}>${c.options.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
      break;
    case 'checks':
      input = `<div class="checks">${c.options.map(([val, lab]) => `<label class="check"><input type="checkbox" name="${c.name}" value="${esc(val)}" ${(v || []).includes(val) ? 'checked' : ''}> <span>${esc(lab)}</span></label>`).join('')}</div>`;
      return `<fieldset class="field${full}"><legend>${esc(c.label)}</legend>${input}${help}</fieldset>`;
    case 'checkbox':
      return `<label class="field check${full}"><input type="checkbox" name="${c.name}" ${v ? 'checked' : ''}> <span>${esc(c.label)}</span></label>`;
    case 'file':
      input = `<input id="${id}" type="file" name="${c.name}" ${req} ${c.accept ? `accept="${esc(c.accept)}"` : ''}>`;
      break;
    case 'range':
      input = `<div class="range"><input id="${id}" type="range" name="${c.name}" value="${esc(v)}" min="${c.min ?? 0}" max="${c.max ?? 100}" oninput="this.nextElementSibling.textContent=this.value"><output>${esc(v)}</output></div>`;
      break;
    default:
      input = `<input id="${id}" type="${c.type || 'text'}" name="${c.name}" value="${esc(v)}" ${req} ${c.min != null ? `min="${c.min}"` : ''} ${c.max != null ? `max="${c.max}"` : ''} ${c.placeholder ? `placeholder="${esc(c.placeholder)}"` : ''}>`;
  }
  return `<div class="field${full}"><label for="${id}">${esc(c.label)}</label>${input}${help}</div>`;
}

export async function conferma(domanda, bottone = 'Conferma') {
  const r = await modulo('Conferma', [], { conferma: bottone, testo: domanda, pericolo: /elimin|rifiut/i.test(bottone) });
  return r !== null;
}

export function vuoto(msg) {
  return `<div class="empty">${ic('inbox')}<span>${esc(msg)}</span></div>`;
}

// Intestazione di pagina con titolo e sottotitolo modificabili
export function titoloPagina(chiave, defTitolo, defSotto = '', azioni = '') {
  document.title = `${testo(chiave + '.titolo', defTitolo)} — ${CONFIG.NOME}`;
  return `<div class="page-head">
    <div>
      <h1>${T(chiave + '.titolo', defTitolo)}</h1>
      ${defSotto || testo(chiave + '.sotto') ? `<p class="lead">${T(chiave + '.sotto', defSotto)}</p>` : ''}
    </div>
    <div class="actions">${azioni}</div>
  </div>`;
}

// Pagina riservata ai membri
export function riservata(loggato) {
  document.title = `Area riservata — ${CONFIG.NOME}`;
  return `<div class="gate">
    <div class="gate-icon">${ic('lock')}</div>
    <h1>${T('gate.titolo', 'Area riservata')}</h1>
    ${loggato
      ? `<p class="lead">${T('gate.attesa', 'Il tuo account è in attesa di approvazione da parte del Direttivo.')}</p>`
      : `<p class="lead">${T('gate.testo', 'Questa sezione è riservata ai membri del Reggimento.')}</p>
         <div class="gate-actions"><button class="btn btn-discord" data-login>${ic('log-in')} Accedi con Discord</button>
         <a class="btn btn-ghost" href="#/reclutamento">${T('gate.arruolati', 'Vuoi entrare? Arruolati')}</a></div>`}
  </div>`;
}

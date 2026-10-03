// Rotazione settimanale della fazione nei server PvP pubblici (USA / Russia), cambio ogni lunedì.
// Il punto di partenza è salvato in "contenuti" (chiave fazione.riferimento) e modificabile dagli amministratori.
import { db } from './db.js';
import { esc, ic, testo, testi, modulo, toast, errore } from './ui.js';

export const FAZIONI = {
  USA: { nome: 'USA', colore: '#4a7fd8' },
  RUSSIA: { nome: 'Russia', colore: '#d2483a' },
};
const CHIAVE = 'fazione.riferimento';
const PREDEFINITO = { lunedi: '2026-09-28', fazione: 'USA' }; // settimana dal 28/09/2026: USA

const altra = (f) => (f === 'USA' ? 'RUSSIA' : 'USA');

function configurazione() {
  try {
    const c = JSON.parse(testo(CHIAVE, ''));
    if (c.lunedi && FAZIONI[c.fazione]) return c;
  } catch { /* testo assente o non valido */ }
  return PREDEFINITO;
}

// Lunedì (ora locale, mezzanotte) della settimana che contiene la data
export function lunediDi(data) {
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function fazioneDi(data = new Date()) {
  const { lunedi, fazione } = configurazione();
  const [a, m, g] = lunedi.split('-').map(Number);
  const settimane = Math.round((lunediDi(data) - lunediDi(new Date(a, m - 1, g))) / (7 * 864e5));
  return settimane % 2 === 0 ? fazione : altra(fazione);
}

// Le prossime n settimane: [{ dal, al, fazione }]
export function prossimeSettimane(n = 4, da = new Date()) {
  const out = [];
  const inizio = lunediDi(da);
  for (let i = 0; i < n; i++) {
    const dal = new Date(inizio);
    dal.setDate(dal.getDate() + i * 7);
    const al = new Date(dal);
    al.setDate(al.getDate() + 6);
    out.push({ dal, al, fazione: fazioneDi(dal) });
  }
  return out;
}

const fmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
const fmtGiorno = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

// Bandiere disegnate (le emoji delle bandiere non funzionano su Windows)
export function bandiera(f, cls = '') {
  if (f === 'RUSSIA') {
    return `<svg class="bandiera ${cls}" viewBox="0 0 9 6" aria-hidden="true"><rect width="9" height="2" fill="#fff"/><rect y="2" width="9" height="2" fill="#0039a6"/><rect y="4" width="9" height="2" fill="#d52b1e"/></svg>`;
  }
  const strisce = Array.from({ length: 7 }, (_, i) => `<rect y="${(i * 2 * 6) / 13}" width="9" height="${6 / 13}" fill="#b22234"/>`).join('');
  return `<svg class="bandiera ${cls}" viewBox="0 0 9 6" aria-hidden="true"><rect width="9" height="6" fill="#fff"/>${strisce}<rect width="3.9" height="${(7 * 6) / 13}" fill="#3c3b6e"/></svg>`;
}

export const etichetta = (f) => `<span class="fazione-tag" style="--f:${FAZIONI[f].colore}">${bandiera(f)} ${esc(FAZIONI[f].nome)}</span>`;

// Barra sottile in cima a ogni pagina (solo membri)
export function barraFazione() {
  const ora = fazioneDi();
  const prossimo = new Date(lunediDi(new Date()));
  prossimo.setDate(prossimo.getDate() + 7);
  return `<a class="banner banner-fazione" href="#/server" style="--f:${FAZIONI[ora].colore}">
    ${ic('swords')} Fazione PvP di questa settimana: ${etichetta(ora)}
    <span class="muted">· da lunedì ${fmt.format(prossimo)}: ${etichetta(altra(ora))}</span></a>`;
}

// Riquadro grande (Home e pagina Server)
export function riquadroFazione({ dettagli = false, admin = false } = {}) {
  const [questa, ...poi] = prossimeSettimane(dettagli ? 5 : 2);
  return `<section class="card fazione-card" style="--f:${FAZIONI[questa.fazione].colore}">
    <div class="fazione-main">
      ${bandiera(questa.fazione, 'bandiera-xl')}
      <div>
        <span class="fazione-label">Fazione PvP · settimana ${fmt.format(questa.dal)} – ${fmt.format(questa.al)}</span>
        <h2>${esc(FAZIONI[questa.fazione].nome)}</h2>
        <p class="muted">Nei server PvP pubblici si gioca tutti in questa fazione. Si cambia ogni lunedì.</p>
      </div>
      ${admin ? `<button class="btn btn-small btn-ghost fazione-edit" id="fazione-edit">${ic('repeat')} Correggi rotazione</button>` : ''}
    </div>
    <ul class="fazione-prossime">${poi.map((s) => `<li><span>${fmt.format(s.dal)} – ${fmt.format(s.al)}</span>${etichetta(s.fazione)}</li>`).join('')}</ul>
  </section>`;
}

// Annuncio automatico mostrato in cima alle comunicazioni
export function annuncioFazione() {
  const { dal, al, fazione } = prossimeSettimane(1)[0];
  return {
    data: dal.toISOString(),
    titolo: `Fazione PvP della settimana: ${FAZIONI[fazione].nome}`,
    testo: `Da **${fmtGiorno.format(dal)}** a **${fmtGiorno.format(al)}** nei server PvP pubblici si gioca nella fazione **${FAZIONI[fazione].nome}**.\n\nLunedì si passa a **${FAZIONI[altra(fazione)].nome}**. La rotazione settimanale serve a evitare discussioni: rispettiamola tutti (Art. 16 del Regolamento).`,
    fazione,
  };
}

// Eventi per il calendario: uno ogni lunedì, da 8 settimane fa a un anno avanti
export function eventiFazione() {
  const inizio = lunediDi(new Date());
  inizio.setDate(inizio.getDate() - 8 * 7);
  return Array.from({ length: 60 }, (_, i) => {
    const d = new Date(inizio);
    d.setDate(d.getDate() + i * 7);
    const f = fazioneDi(d);
    const p = (n) => String(n).padStart(2, '0');
    return {
      title: `Fazione PvP: ${FAZIONI[f].nome}`,
      start: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
      allDay: true,
      color: FAZIONI[f].colore,
      classNames: ['ev-fazione'],
      url: '#/server',
    };
  });
}

// Correzione da parte degli amministratori: fissa la fazione della settimana corrente
export async function correggiRotazione() {
  const ora = fazioneDi();
  const r = await modulo('Correggi rotazione fazione', [
    { name: 'fazione', label: 'Fazione di questa settimana', type: 'select', value: ora, options: Object.entries(FAZIONI).map(([k, v]) => [k, v.nome]) },
  ], { testo: 'Le settimane successive si alternano automaticamente a partire da questa scelta.' });
  if (!r) return;
  const l = lunediDi(new Date());
  const p = (n) => String(n).padStart(2, '0');
  const valore = JSON.stringify({ lunedi: `${l.getFullYear()}-${p(l.getMonth() + 1)}-${p(l.getDate())}`, fazione: r.fazione });
  try {
    await db.upsert('contenuti', { chiave: CHIAVE, testo: valore });
    testi.set(CHIAVE, valore);
    toast(`Fazione di questa settimana: ${FAZIONI[r.fazione].nome}`);
    window.dispatchEvent(new Event('rerender'));
    window.dispatchEvent(new Event('menu-refresh'));
  } catch (e) { errore(e); }
}

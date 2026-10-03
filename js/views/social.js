// Pagina Social (pubblica): profili del Reggimento su Instagram, TikTok, Twitch, YouTube…
import { PIATTAFORME } from '../config.js';
import { db } from '../db.js';
import { can } from '../state.js';
import { esc, ic, T, modulo, conferma, toast, errore, vuoto, titoloPagina, icone, $, $$ } from '../ui.js';

// Loghi non presenti in Lucide
const BRAND = {
  tiktok: '<path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',
  x: '<path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z"/>',
  discord: '<path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .09.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z"/>',
};

export function iconaSocial(piattaforma, cls = '') {
  const p = PIATTAFORME[piattaforma] || PIATTAFORME.altro;
  if (p.brand) return `<svg class="ic brand ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${BRAND[p.brand]}</svg>`;
  return ic(p.icon, cls);
}

// Icone social nel piè di pagina (chiamata all'avvio e dopo ogni modifica)
export async function aggiornaFooterSocial() {
  const box = $('#footer-social');
  if (!box) return;
  try {
    const lista = await db.list('social', { order: 'ordine' });
    box.innerHTML = lista.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.nome || (PIATTAFORME[s.piattaforma] || {}).label || '')}" style="--c:${(PIATTAFORME[s.piattaforma] || PIATTAFORME.altro).color}">${iconaSocial(s.piattaforma)}</a>`).join('');
    icone(box);
  } catch (e) { console.error(e); }
}

export async function social(app) {
  const lista = await db.list('social', { order: 'ordine' });
  const admin = can('admin');

  app.innerHTML = `
    ${titoloPagina('social', 'Social', 'Seguici sui nostri canali: clip, dirette e foto dalle operazioni.', admin ? `<button class="btn btn-primary" id="add">${ic('plus')} Aggiungi social</button>` : '')}
    <div class="grid-social reveal">${lista.map((s) => {
      const p = PIATTAFORME[s.piattaforma] || PIATTAFORME.altro;
      return `<div class="card social-card" style="--c:${p.color}">
        <a class="social-link" href="${esc(s.url)}" target="_blank" rel="noopener">
          <span class="social-ic">${iconaSocial(s.piattaforma)}</span>
          <span class="social-piatt">${esc(p.label)}</span>
          <h3>${esc(s.nome || p.label)}</h3>
          ${s.descrizione ? `<p class="muted">${esc(s.descrizione)}</p>` : ''}
          <span class="social-cta">${T('social.segui', 'Seguici')} ${ic('arrow-up-right')}</span>
        </a>
        ${admin ? `<div class="social-tools"><button class="icon-btn" data-edit="${s.id}" title="Modifica">${ic('pencil')}</button><button class="icon-btn" data-del="${s.id}" title="Elimina">${ic('trash-2')}</button></div>` : ''}
      </div>`;
    }).join('') || vuoto('Nessun canale social inserito.')}</div>`;

  const ricarica = () => { aggiornaFooterSocial(); window.dispatchEvent(new Event('rerender')); };
  const edit = async (s) => {
    const r = await modulo(s ? 'Modifica social' : 'Nuovo social', [
      { name: 'piattaforma', label: 'Piattaforma', type: 'select', value: s?.piattaforma || 'instagram', options: Object.entries(PIATTAFORME).map(([k, v]) => [k, v.label]) },
      { name: 'nome', label: 'Nome o @account', value: s?.nome, placeholder: '@reggimento.arditi' },
      { name: 'url', label: 'Link', type: 'url', value: s?.url, required: true, full: true, placeholder: 'https://…' },
      { name: 'descrizione', label: 'Descrizione', type: 'textarea', rows: 3, value: s?.descrizione },
      { name: 'ordine', label: 'Posizione', type: 'number', value: s?.ordine ?? lista.length + 1 },
    ]);
    if (!r) return;
    try {
      if (s) await db.update('social', { id: s.id }, r);
      else await db.insert('social', r);
      toast('Social salvato');
      ricarica();
    } catch (e) { errore(e); }
  };
  $('#add')?.addEventListener('click', () => edit(null));
  $$('[data-edit]', app).forEach((b) => b.addEventListener('click', () => edit(lista.find((s) => s.id === b.dataset.edit))));
  $$('[data-del]', app).forEach((b) => b.addEventListener('click', async () => {
    const s = lista.find((x) => x.id === b.dataset.del);
    if (!(await conferma(`Eliminare ${s.nome || s.piattaforma}?`, 'Elimina'))) return;
    try { await db.remove('social', { id: s.id }); ricarica(); } catch (e) { errore(e); }
  }));
}

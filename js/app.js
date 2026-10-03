// Avvio dell'applicazione: navigazione, menu, login, transizioni
import { CONFIG } from './config.js';
import { auth, DEMO } from './db.js';
import { stato, caricaUtente, caricaCampagne, can, membro, loggato } from './state.js';
import { esc, ic, T, icone, avatar, nomeMembro, errore, caricaTesti, abilitaModifica, toggleModifica, modificaAttiva, riservata, $, $$ } from './ui.js';
import { home, chiSiamo, server, comunicazioni, reclutamento } from './views/pubbliche.js';
import { calendario, evento } from './views/eventi.js';
import { organico, profilo, gestione } from './views/membri.js';
import { campagne, campagna } from './views/campagne.js';
import { mod } from './views/mod.js';
import { social, aggiornaFooterSocial } from './views/social.js';

// [percorso, pagina, pubblica?]
const ROTTE = [
  [/^\/?$/, home, true],
  [/^\/chi-siamo$/, chiSiamo, true],
  [/^\/reclutamento$/, reclutamento, true],
  [/^\/organico$/, organico, true],
  [/^\/profilo(?:\/([\w-]+))?$/, profilo, true],
  [/^\/social$/, social, true],
  [/^\/calendario$/, calendario],
  [/^\/evento\/([\w-]+)$/, evento],
  [/^\/comunicazioni$/, comunicazioni],
  [/^\/campagne$/, campagne],
  [/^\/campagne\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?$/, campagna],
  [/^\/server$/, server],
  [/^\/mod$/, mod],
  [/^\/gestione$/, gestione],
];

const app = $('#app');
const riduciMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
const attesa = (ms) => new Promise((r) => setTimeout(r, riduciMovimento ? 0 : ms));
let navId = 0;

async function naviga() {
  const id = ++navId;
  const path = location.hash.replace(/^#/, '').split('?')[0] || '/';
  aggiornaMenu(path);
  $('#nav').classList.remove('open');
  $('#burger').setAttribute('aria-expanded', 'false');

  const rotta = ROTTE.map(([re, view, pubblica]) => ({ m: path.match(re), view, pubblica })).find((r) => r.m);
  app.classList.remove('page-in');
  app.classList.add('is-leaving');
  app.setAttribute('aria-busy', 'true');
  await attesa(150);
  if (id !== navId) return;

  try {
    if (!rotta) app.innerHTML = `<div class="empty">${ic('compass')}<span>Pagina non trovata. <a href="#/">Torna alla home</a></span></div>`;
    else if (!rotta.pubblica && !membro()) app.innerHTML = riservata(loggato());
    else await rotta.view(app, ...rotta.m.slice(1).filter(Boolean));
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="empty">${ic('triangle-alert')}<span>Errore nel caricamento della pagina: ${esc(e.message)}</span></div>`;
  }
  if (id !== navId) return;
  icone(app);
  window.scrollTo({ top: 0, behavior: 'instant' });
  app.classList.remove('is-leaving');
  void app.offsetWidth;
  app.classList.add('page-in');
  app.removeAttribute('aria-busy');
  osservaComparsa();
}

// Animazione degli elementi .reveal quando entrano nello schermo
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((voci) => voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in-view'); io.unobserve(v.target); } }), { rootMargin: '0px 0px -40px 0px' })
  : null;
function osservaComparsa() {
  $$('.reveal:not(.in-view)', app).forEach((el) => (io ? io.observe(el) : el.classList.add('in-view')));
}

function voceMenu(h, chiave, def, icona, path) {
  const attivo = ('#' + path).startsWith(h);
  return `<li><a href="${h}" ${attivo ? 'aria-current="page"' : ''}>${ic(icona)}<span>${T(chiave, def)}</span></a></li>`;
}

function aggiornaMenu(path = location.hash.replace(/^#/, '') || '/') {
  const m = membro();
  const voci = [voceMenu('#/chi-siamo', 'menu.chi', 'Chi siamo', 'info', path), voceMenu('#/organico', 'menu.org', 'Organico', 'users', path)];
  if (m) {
    voci.push(voceMenu('#/calendario', 'menu.cal', 'Calendario', 'calendar-days', path));
    voci.push(voceMenu('#/comunicazioni', 'menu.com', 'Comunicazioni', 'megaphone', path));
    const attivo = path.startsWith('/campagne');
    voci.push(`<li class="has-sub ${attivo ? 'open' : ''}">
      <a href="#/campagne" ${attivo ? 'aria-current="page"' : ''}>${ic('map')}<span>${T('menu.camp', 'Campagne')}</span>${ic('chevron-down', 'caret')}</a>
      <ul class="sub">
        ${stato.campagne.map((c) => `<li><a href="#/campagne/${c.id}" ${path.startsWith(`/campagne/${c.id}`) ? 'aria-current="page"' : ''}><i class="dot-stato st-${esc(c.stato)}"></i>${esc(c.titolo)}</a></li>`).join('')}
        <li class="sub-all"><a href="#/campagne">${ic('layout-grid')} Tutte le campagne</a></li>
      </ul></li>`);
    voci.push(voceMenu('#/server', 'menu.server', 'Server', 'server', path));
    voci.push(voceMenu('#/mod', 'menu.mod', 'Mod', 'package', path));
  }
  voci.push(voceMenu('#/social', 'menu.social', 'Social', 'share-2', path));
  voci.push(voceMenu('#/reclutamento', 'menu.recl', 'Reclutamento', 'user-plus', path));
  if (can('membri') || can('reclutamento')) voci.push(voceMenu('#/gestione', 'menu.gest', 'Gestione', 'shield-check', path));
  $('#menu').innerHTML = voci.join('');

  const me = stato.me;
  $('#user').innerHTML = me
    ? `${can('admin') ? `<button class="btn btn-small btn-ghost edit-toggle ${modificaAttiva() ? 'on' : ''}" id="edit-toggle" aria-pressed="${modificaAttiva()}" title="Modifica i testi del sito">${ic('pen-line')} <span>Testi</span></button>` : ''}
       <a href="#/profilo" class="user-chip" title="Il mio profilo">${avatar(me, 30)}<span>${nomeMembro(me)}</span></a>
       <button class="icon-btn" id="logout" title="Esci">${ic('log-out')}</button>`
    : `<button class="btn btn-small btn-discord" data-login>${ic('log-in')} ${DEMO ? 'Accedi (demo)' : 'Accedi con Discord'}</button>`;
  $('#logout')?.addEventListener('click', () => auth.logout());
  $('#edit-toggle')?.addEventListener('click', (e) => {
    const on = toggleModifica();
    e.currentTarget.classList.toggle('on', on);
    e.currentTarget.setAttribute('aria-pressed', on);
  });

  $('#banner').innerHTML = [
    DEMO ? `<div class="banner banner-demo">${ic('flask-conical')} Modalità demo: dati di esempio, le modifiche si perdono ricaricando. Esci per vedere il sito come un visitatore.</div>` : '',
    me && me.stato === 'in_attesa' ? `<div class="banner">${ic('hourglass')} Il tuo account è in attesa di approvazione da parte del Direttivo.</div>` : '',
  ].join('');
  icone($('.topbar'));
  icone($('#banner'));
  adattaMenu();
}

// Sceglie la forma del menu in base allo spazio reale disponibile
function adattaMenu() {
  const b = document.body;
  const inner = $('.topbar-inner');
  const nav = $('#nav');
  const aperto = nav.classList.contains('open');
  b.classList.remove('nav-compact', 'nav-burger');
  const entra = () => inner.scrollWidth <= inner.clientWidth + 1 && nav.scrollWidth <= nav.clientWidth + 1;
  if (!entra()) b.classList.add('nav-compact');
  if (!entra()) { b.classList.remove('nav-compact'); b.classList.add('nav-burger'); }
  if (aperto) nav.classList.add('open');
}
let timerResize;
addEventListener('resize', () => { clearTimeout(timerResize); timerResize = setTimeout(adattaMenu, 80); });

// Login da qualsiasi pulsante con data-login
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-login]');
  if (!b || modificaAttiva()) return;
  e.preventDefault();
  auth.login().catch(errore);
});

$('#burger').addEventListener('click', (e) => {
  const open = $('#nav').classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', open);
});

// Ombra della barra quando si scorre
addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 8), { passive: true });

let ultimoUtente;
async function aggiornaUtente() {
  await caricaUtente();
  abilitaModifica(can('admin'));
  await caricaCampagne();
  const chiave = stato.me ? `${stato.me.id}:${stato.me.stato}:${(stato.me.permessi || []).join()}` : null;
  if (chiave !== ultimoUtente) {
    ultimoUtente = chiave;
    await naviga();
  }
}

window.addEventListener('hashchange', naviga);
window.addEventListener('auth-change', aggiornaUtente);
window.addEventListener('rerender', naviga);
window.addEventListener('menu-refresh', () => aggiornaMenu());

$('#footer-year').textContent = new Date().getFullYear();
icone(document.querySelector('.footer'));

(async () => {
  try { await caricaTesti(); } catch (e) { console.error(e); }
  $('#footer-note').innerHTML = T('footer.nota', 'Gruppo di gioco amatoriale su Arma Reforger. Non affiliato a Bohemia Interactive né alle Forze Armate.');
  await aggiornaUtente();
  aggiornaFooterSocial();
  document.body.classList.add('ready');
})();

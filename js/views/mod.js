// Lista mod del server: gestita dal sito, letta dal Workshop dalla funzione Supabase "mod-workshop"
import { db, funzione, DEMO } from '../db.js';
import { can } from '../state.js';
import { totaleMod, estraiMod } from '../mod-logica.js';
import { esc, ic, T, bytes, dataOra, data, toast, errore, vuoto, titoloPagina, icone, $, $$ } from '../ui.js';

export async function mod(app) {
  const [lista, changelog] = await Promise.all([
    db.list('mods', { order: 'nome' }),
    db.list('mods_changelog', { order: 'data', asc: false }),
  ]);
  const gestore = can('mod');
  const totale = totaleMod(lista);
  const ultima = changelog[0]?.data;
  let ordine = 'dimensione';
  let dir = -1;
  let cerca = '';

  app.innerHTML = `
    ${titoloPagina('mod', 'Mod del server Milsim', 'Lista aggiornata automaticamente dal Workshop di Arma Reforger.',
      gestore ? `<button class="btn btn-ghost" id="check">${ic('refresh-cw')} Controlla aggiornamenti</button><button class="btn btn-primary" id="gest">${ic('list-plus')} Gestisci lista mod</button>` : '')}
    <div class="stat-row stat-cards">
      <div class="card stat">${ic('package', 'stat-ic')}<b>${lista.length}</b><span>mod (dipendenze incluse)</span></div>
      <div class="card stat">${ic('hard-drive-download', 'stat-ic')}<b>${bytes(totale)}</b><span>peso totale download</span></div>
      <div class="card stat">${ic('history', 'stat-ic')}<b class="small-b">${ultima ? dataOra(ultima) : '—'}</b><span>ultima modifica</span></div>
    </div>
    <p class="notice">${ic('info')} ${T('mod.nota', "Il gioco scarica le mod in automatico quando entri nel server. Per non aspettare al momento dell'operazione, iscriviti alle mod dal Workshop in gioco qualche giorno prima.")}</p>

    <section class="card">
      <div class="toolbar">
        <div class="search">${ic('search')}<input type="search" id="q" placeholder="Cerca mod o autore…" aria-label="Cerca mod"></div>
        <button class="btn btn-small btn-ghost push" id="copy">${ic('clipboard-copy')} Copia elenco per config server</button>
      </div>
      <div class="table-wrap"><table class="table mods">
        <thead><tr>
          <th></th>
          <th><button class="th-sort" data-sort="nome">Mod</button></th>
          <th><button class="th-sort" data-sort="versione">Versione</button></th>
          <th class="num"><button class="th-sort" data-sort="dimensione">Peso</button></th>
          <th><button class="th-sort" data-sort="aggiornata_il">Aggiornata</button></th>
        </tr></thead>
        <tbody id="rows"></tbody>
        <tfoot><tr><td></td><td><b>Totale</b></td><td></td><td class="num"><b>${bytes(totale)}</b></td><td></td></tr></tfoot>
      </table></div>
    </section>

    <h2 class="section-title">${T('mod.changelog', 'Changelog')}</h2>
    ${changelog.length ? `<div class="changelog">${changelog.map((c) => `
      <article class="card cl">
        <header><b>${dataOra(c.data)}</b> <span class="muted small">Totale: ${bytes(c.totale_prima)} → <b>${bytes(c.totale_dopo)}</b> (${segno(c.totale_dopo - c.totale_prima)})</span></header>
        ${c.iniziale ? `<p class="muted">Prima generazione della lista: ${c.aggiunte.length} mod.</p>` : `
        <ul>
          ${c.aggiunte.map((m) => `<li class="add">${ic('plus')} <b>${esc(m.nome)}</b> <span class="muted">${esc(m.versione)} · ${bytes(m.dimensione)}</span></li>`).join('')}
          ${c.rimosse.map((m) => `<li class="del">${ic('minus')} <b>${esc(m.nome)}</b> <span class="muted">${bytes(m.dimensione)}</span></li>`).join('')}
          ${c.aggiornate.map((m) => `<li class="upd">${ic('arrow-up')} <b>${esc(m.nome)}</b> <span class="muted">${esc(m.da)} → ${esc(m.a)} (${segno(m.dimensione_a - m.dimensione_da)})</span></li>`).join('')}
        </ul>`}
      </article>`).join('')}</div>` : vuoto('Nessuna modifica registrata.')}`;

  const disegna = () => {
    const q = cerca.toLowerCase();
    const righe = lista
      .filter((m) => !q || m.nome.toLowerCase().includes(q) || (m.autore || '').toLowerCase().includes(q))
      .sort((a, b) => {
        const x = a[ordine] ?? '';
        const y = b[ordine] ?? '';
        return (typeof x === 'number' || typeof y === 'number' ? (Number(x) || 0) - (Number(y) || 0) : String(x).localeCompare(String(y))) * dir;
      });
    $('#rows').innerHTML = righe.map((m) => `
      <tr>
        <td class="thumb">${m.immagine ? `<img src="${esc(m.immagine)}" alt="" loading="lazy">` : `<span class="thumb-ph">${ic('package')}</span>`}</td>
        <td><a href="${esc(m.url)}" target="_blank" rel="noopener"><b>${esc(m.nome)}</b></a>
          <div class="muted small">${esc(m.autore || '')}${m.dipendenza_di?.length ? ` · dipendenza di ${m.dipendenza_di.map(esc).join(', ')}` : ''}</div></td>
        <td><code>${esc(m.versione)}</code></td>
        <td class="num">${m.dimensione == null ? '<span class="muted">—</span>' : bytes(Number(m.dimensione))}</td>
        <td class="small">${data(m.aggiornata_il)}</td>
      </tr>`).join('') || `<tr><td colspan="5">${vuoto(lista.length ? 'Nessun risultato.' : 'La lista mod è vuota.')}</td></tr>`;
    $$('.th-sort', app).forEach((b) => b.classList.toggle('active', b.dataset.sort === ordine));
    icone($('#rows'));
  };
  disegna();

  $('#q').addEventListener('input', (e) => { cerca = e.target.value; disegna(); });
  $$('.th-sort', app).forEach((b) => b.addEventListener('click', () => {
    if (ordine === b.dataset.sort) dir = -dir;
    else { ordine = b.dataset.sort; dir = ordine === 'nome' ? 1 : -1; }
    disegna();
  }));
  $('#copy').addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(lista.map((m) => ({ modId: m.id, name: m.nome })), null, 2));
    toast('Elenco copiato: incollalo in "mods" del config.json del server');
  });
  $('#gest')?.addEventListener('click', () => gestisciLista(lista));
  $('#check')?.addEventListener('click', async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    b.classList.add('loading');
    try {
      const r = await funzione('mod-workshop', { azione: 'aggiorna' });
      toast(r.cambiato ? 'Trovati aggiornamenti: changelog aggiornato' : 'Tutte le mod sono già aggiornate');
      if (r.cambiato) window.dispatchEvent(new Event('rerender'));
    } catch (err) { errore(err); }
    b.disabled = false;
    b.classList.remove('loading');
  });
}

// Pannello per incollare i link delle mod
function gestisciLista(lista) {
  const principali = lista.filter((m) => m.principale !== false);
  const testo = principali.map((m) => `${m.url}  # ${m.nome}`).join('\n');
  const dlg = document.createElement('dialog');
  dlg.className = 'modal modal-wide';
  dlg.innerHTML = `
    <form class="form">
      <header class="modal-head"><h3>Lista mod del server</h3><button type="button" class="icon-btn" data-x aria-label="Chiudi">${ic('x')}</button></header>
      <p class="modal-text">Incolla i link del Workshop (o gli ID), <b>uno per riga</b>. Basta la mod principale: le dipendenze vengono aggiunte da sole.
      Le mod che togli dall'elenco vengono rimosse. Al salvataggio il sito legge nome, versione e peso di ogni mod e registra le differenze nel changelog.</p>
      <textarea name="links" rows="14" class="mono" spellcheck="false" placeholder="https://reforger.armaplatform.com/workshop/595F2BF2F44836FB-RHS-StatusQuo">${esc(testo)}</textarea>
      <div class="mod-preview" id="anteprima"></div>
      ${DEMO ? '<p class="help">' + ic('flask-conical') + ' In modalità demo il Workshop non viene letto: le mod nuove compaiono senza peso. Con Supabase collegato il peso viene letto automaticamente.</p>' : ''}
      <footer class="modal-foot">
        <button type="button" class="btn btn-ghost" data-x>Annulla</button>
        <button type="submit" class="btn btn-primary">${ic('scan-search')} Controlla e salva</button>
      </footer>
    </form>`;
  document.body.appendChild(dlg);
  icone(dlg);
  const ta = $('textarea', dlg);
  const anteprima = () => {
    const trovate = estraiMod(ta.value);
    const noti = new Set(lista.map((m) => m.id));
    const nuove = trovate.filter((m) => !noti.has(m.id)).length;
    const tolte = principali.filter((m) => !trovate.some((t) => t.id === m.id)).length;
    $('#anteprima', dlg).innerHTML = `<span class="chip">${ic('list')} ${trovate.length} mod nell'elenco</span>
      ${nuove ? `<span class="chip chip-add">${ic('plus')} ${nuove} nuove</span>` : ''}
      ${tolte ? `<span class="chip chip-del">${ic('minus')} ${tolte} da rimuovere</span>` : ''}`;
    icone($('#anteprima', dlg));
  };
  ta.addEventListener('input', anteprima);
  anteprima();
  const chiudi = () => { dlg.classList.add('closing'); setTimeout(() => dlg.remove(), 180); };
  $$('[data-x]', dlg).forEach((b) => b.addEventListener('click', chiudi));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); chiudi(); });
  $('form', dlg).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!estraiMod(ta.value).length) return errore(new Error('Nessun link o ID di mod trovato.'));
    const btn = $('button[type=submit]', dlg);
    btn.disabled = true;
    btn.classList.add('loading');
    btn.lastChild.textContent = ' Lettura dal Workshop…';
    try {
      const r = await funzione('mod-workshop', { azione: 'salva', testo: ta.value });
      chiudi();
      if (!r.cambiato) toast('Nessuna modifica alla lista');
      else {
        const v = r.voce;
        toast(`Lista salvata: ${v.aggiunte.length} aggiunte, ${v.rimosse.length} rimosse, ${v.aggiornate.length} aggiornate`);
      }
      if (r.errori?.length) toast(`Non trovate sul Workshop: ${r.errori.join(', ')}`, 'err');
      window.dispatchEvent(new Event('rerender'));
    } catch (err) {
      errore(err);
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.lastChild.textContent = ' Controlla e salva';
    }
  });
  dlg.showModal();
}

function segno(n) {
  if (!n) return '±0';
  return `${n > 0 ? '+' : '−'}${bytes(Math.abs(n))}`;
}

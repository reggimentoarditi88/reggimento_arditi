// Regolamento (pagina pubblica). Il testo si modifica dal sito (amministratori) ed è salvato in "contenuti".
// Ogni articolo inizia con una riga "## Art. N – Titolo": da lì vengono costruiti indice e schede.
import { db } from '../db.js';
import { can } from '../state.js';
import { esc, md, ic, T, testo, testi, modulo, toast, errore, titoloPagina, icone, $, $$ } from '../ui.js';

const CHIAVE = 'regolamento';

export const REGOLAMENTO_PREDEFINITO = `## Art. 1 – Natura del Reggimento
Il Reggimento Arditi costituisce struttura organizzata operante nel server **"Operazioni Tattiche Avanzate"** secondo principi di disciplina, gerarchia, responsabilità individuale e realismo operativo.

L'ambiente non è assimilabile a modalità sandbox o arcade.

## Art. 2 – Accettazione del Codice
L'accesso al server e la permanenza nel Reggimento equivalgono ad accettazione integrale e incondizionata del presente Codice Operativo.

## Art. 3 – Principi Fondamentali
Il Reggimento si fonda sui principi di:

1. Disciplina.
2. Responsabilità.
3. Rispetto reciproco.
4. Serietà operativa.

## Art. 4 – Catena di Comando
La gerarchia interna è vincolante.

Le direttive operative impartite dal comando non sono oggetto di discussione durante la fase attiva di missione o addestramento. Eventuali osservazioni possono essere formulate esclusivamente al termine delle attività.

## Art. 5 – Autorità degli Istruttori
Durante briefing e addestramenti l'Istruttore designato esercita piena autorità.

Ogni interruzione non autorizzata costituisce infrazione disciplinare.

## Art. 6 – Status della Caserma
La Caserma è qualificata quale:

- Zona Sicura Permanente;
- Area Non Ostile;
- Infrastruttura Strategica del Reggimento.

Ogni atto distruttivo o comportamento non conforme è considerato **violazione grave**.

## Art. 7 – Uso delle Armi in Caserma
È fatto divieto assoluto di:

1. Esplodere colpi di arma da fuoco all'interno del perimetro della Caserma;
2. Effettuare test balistici;
3. Puntare armi verso commilitoni;
4. Simulare attacchi interni.

Deroghe sono ammesse esclusivamente in caso di esercitazioni formalmente autorizzate.

## Art. 8 – Uso di Esplosivi
È vietato l'utilizzo di granate, esplosivi o dispositivi equivalenti all'interno della Caserma.

Tale condotta è qualificata come **infrazione gravissima**.

## Art. 9 – Sicurezza tra Commilitoni
Il fuoco su personale alleato è proibito.

Il team killing volontario costituisce **infrazione grave o gravissima** a seconda delle circostanze.

## Art. 10 – Uso dei Mezzi
I mezzi e gli asset del Reggimento sono destinati esclusivamente a finalità operative.

È vietato l'uso ludico, irresponsabile o per arrecare disturbo.

## Art. 11 – Disciplina Durante Addestramento
Durante attività didattiche è obbligatorio:

1. Mantenere silenzio vocale;
2. Attivare il microfono solo previa autorizzazione;
3. Evitare movimenti o azioni non richieste;
4. Astenersi da qualsiasi forma di disturbo operativo.

## Art. 12 – Disturbo Attivo
Costituisce disturbo attivo ogni condotta volta a compromettere lo svolgimento regolare di briefing, lezioni o operazioni, ivi compresi spari, utilizzo non autorizzato di mezzi o sovrapposizioni vocali volontarie.

## Art. 13 – Condotta in Voice Chat
La voice chat costituisce strumento operativo. È vietato:

1. Urlare o sovrapporsi deliberatamente;
2. Generare rumori di fondo intenzionali;
3. Interrompere briefing;
4. Utilizzare tono provocatorio o aggressivo.

Le comunicazioni operative devono essere brevi, chiare e funzionali.

## Art. 14 – Disposizioni in materia di condotta e responsabilità
Sarà cura del Direttivo valutare e decidere le sanzioni caso per caso, tenendo conto della gravità del fatto accaduto in questione, dell'intenzionalità della condotta, dell'eventuale reiterazione e del comportamento complessivo del membro all'interno del Reggimento Arditi.

## Art. 15 – Utilizzo dei social
I canali ufficiali del Reggimento Arditi, ivi compresi W.A. e Discord ed ogni piattaforma di comunicazione interna, sono strumenti destinati esclusivamente alle attività, alle comunicazioni e agli interessi riguardanti il Reggimento.

È vietato quindi pubblicare, diffondere e promuovere in autonomia:

- notizie riguardanti altri server;
- materiale promozionale non autorizzato;
- contenuti non attinenti alle attività del Reggimento;
- messaggistica non pertinente di varia natura.

Resta ferma la possibilità, esclusivamente per i membri del Reggimento, di utilizzare gli spazi dedicati alla conversazione libera. Per tali comunicazioni informali è disponibile il canale ufficiale, come citato sopra, **"Discord REGGIMENTO ARDITI"**, nel rispetto dei principi del buon senso.

## Art. 16 – Regolamentazione Scelta Fazione PvP Pubblico
**1. Costituzione del Gruppo**
Il primo membro del Reggimento che accede al server ha l'obbligo di creare il gruppo, denominandolo **"REGGIMENTO ARDITI"** e impostandone la visibilità su **"Pubblico"**, al fine di garantire il riconoscimento immediato del Reggimento e agevolare l'aggregazione dei commilitoni.

**2. Scelta della Fazione**
Tutti i membri sono tenuti a entrare nella fazione concordata preventivamente dal gruppo prima dell'avvio della sessione. La scelta della fazione è definita collettivamente e non soggetta a decisione individuale.

**3. Condotta verso Terzi**
Durante le sessioni è fatto obbligo a ciascun membro di mantenere un comportamento corretto, rispettoso e mai offensivo nei confronti di giocatori esterni al Reggimento, in ogni circostanza e indipendentemente dall'andamento della partita.

**4. Collaborazione con Squadre Esterne**
Ove le condizioni di gioco lo consentano, i membri sono invitati a ricercare attivamente la collaborazione con altre squadre presenti in server, nell'ottica di favorire un'esperienza di gioco costruttiva e rappresentare al meglio i valori del Reggimento.

## Art. 17 – Codice Etico
Ogni membro si impegna a:

- Tutelare l'onore del Reggimento;
- Non sabotare attività ufficiali;
- Non arrecare danni volontari;
- Non compromettere l'autorità degli istruttori;
- Mantenere condotta conforme ai valori Arditi.

## Art. 18 – Clausola di Onore
La violazione deliberata del presente Codice configura incompatibilità con gli ideali del Reggimento e può comportare **esclusione definitiva**.

## Art. 19 – Organo Direttivo
Il presente Codice è emanato e approvato dal Direttivo del Reggimento Arditi, composto da:

- Rubino
- Alex
- Dadoo

Il Direttivo esercita funzione disciplinare e decisionale nei casi di maggiore rilevanza.

## Art. 20 – Accettazione Formale
L'appartenenza al Reggimento comporta dichiarazione esplicita di accettazione del presente Codice.

## Art. 21 – Disposizione Finale
Il Reggimento Arditi costituisce struttura organizzata fondata su disciplina e rispetto.

Chi non si riconosce nei valori enunciati è libero di non aderire.`;

// Divide il testo in articoli: [{ id, numero, titolo, corpo }]
function articoli(testoMd) {
  const parti = testoMd.split(/^##\s+/m).map((p) => p.trim()).filter(Boolean);
  return parti.map((p, i) => {
    const [intestazione, ...resto] = p.split('\n');
    const m = intestazione.match(/^Art\.?\s*(\d+)\s*[–—-]?\s*(.*)$/i);
    return {
      id: `art-${i + 1}`,
      numero: m ? m[1] : String(i + 1),
      titolo: (m ? m[2] : intestazione).trim(),
      corpo: resto.join('\n').trim(),
    };
  });
}

export async function regolamento(app) {
  const testoMd = testo(CHIAVE, REGOLAMENTO_PREDEFINITO);
  const lista = articoli(testoMd);
  const admin = can('admin');

  app.innerHTML = `
    ${titoloPagina('rego', 'Regolamento', 'Codice Operativo del Reggimento Arditi.',
      `<button class="btn btn-ghost" id="stampa">${ic('printer')} Stampa / PDF</button>${admin ? `<button class="btn btn-primary" id="modifica">${ic('pencil')} Modifica regolamento</button>` : ''}`)}
    <div class="rego-layout">
      <aside class="rego-indice card">
        <div class="search">${ic('search')}<input type="search" id="cerca" placeholder="Cerca nel regolamento…" aria-label="Cerca nel regolamento"></div>
        <ol>${lista.map((a) => `<li><button data-vai="${a.id}"><b>${esc(a.numero)}</b><span>${esc(a.titolo)}</span></button></li>`).join('')}</ol>
      </aside>
      <div class="rego-testo">
        <div class="rego-intro card">${ic('scale', 'rego-ic')}<p>${T('rego.intro', "L'accesso al server e la permanenza nel Reggimento equivalgono ad accettazione integrale del presente Codice Operativo.")}</p></div>
        ${lista.map((a) => `
          <article class="card rego-art" id="${a.id}" data-cerca="${esc((a.numero + ' ' + a.titolo + ' ' + a.corpo).toLowerCase())}">
            <header><span class="rego-num">Art. ${esc(a.numero)}</span><h2>${esc(a.titolo)}</h2></header>
            <div class="prose">${md(a.corpo)}</div>
          </article>`).join('')}
        <p class="empty" id="nessuno" hidden>Nessun articolo contiene questa parola.</p>
      </div>
    </div>`;

  $$('[data-vai]', app).forEach((b) => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.vai);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }));
  $('#cerca').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    let visibili = 0;
    $$('.rego-art', app).forEach((a) => {
      const ok = !q || a.dataset.cerca.includes(q);
      a.hidden = !ok;
      $(`[data-vai="${a.id}"]`, app).closest('li').hidden = !ok;
      if (ok) visibili++;
    });
    $('#nessuno').hidden = visibili > 0;
  });
  $('#stampa').addEventListener('click', () => window.print());
  $('#modifica')?.addEventListener('click', async () => {
    const r = await modulo('Modifica regolamento', [
      { name: 'testo', label: 'Testo del regolamento', type: 'textarea', rows: 22, value: testoMd,
        help: 'Ogni articolo inizia con una riga "## Art. N – Titolo". Formattazione: **grassetto**, - elenco puntato, 1. elenco numerato. Svuota tutto per tornare al testo originale.' },
    ]);
    if (!r) return;
    try {
      await db.upsert('contenuti', { chiave: CHIAVE, testo: r.testo });
      testi.set(CHIAVE, r.testo);
      toast('Regolamento aggiornato');
      window.dispatchEvent(new Event('rerender'));
    } catch (e) { errore(e); }
  });
  icone(app);
}

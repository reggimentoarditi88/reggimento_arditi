// Dati di esempio usati solo in MODALITÀ DEMO (Supabase non configurato).
// Le modifiche fatte in demo restano in memoria fino al ricaricamento della pagina.

function giorno(offset, ora = 21, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(ora, min, 0, 0);
  return d.toISOString();
}

export function seed() {
  const U = {
    cap: '00000000-0000-0000-0000-000000000001',
    ten: '00000000-0000-0000-0000-000000000002',
    ser: '00000000-0000-0000-0000-000000000003',
    med: '00000000-0000-0000-0000-000000000004',
    mit: '00000000-0000-0000-0000-000000000005',
    gen: '00000000-0000-0000-0000-000000000006',
    sol: '00000000-0000-0000-0000-000000000007',
    rec: '00000000-0000-0000-0000-000000000008',
    att: '00000000-0000-0000-0000-000000000009',
  };
  const av = (n) => `https://api.dicebear.com/9.x/shapes/svg?seed=${n}&backgroundColor=3b4a26,2a3320,5b6b3a`;
  const profili = [
    { id: U.cap, nome: 'Falco', discord_nome: 'falco_cmd', avatar_url: av('Falco'), stato: 'membro', grado: 21, ruolo: 'Marconista', specializzazioni: ['Elicotterista'], permessi: ['admin'], punti_usati: 0 },
    { id: U.ten, nome: 'Lupo', discord_nome: 'lupo.it', avatar_url: av('Lupo'), stato: 'membro', grado: 20, ruolo: 'Assalto', specializzazioni: ['Carrista'], permessi: ['eventi', 'comunicazioni', 'campagna'], punti_usati: 0 },
    { id: U.ser, nome: 'Vipera', discord_nome: 'vipera_77', avatar_url: av('Vipera'), stato: 'membro', grado: 9, ruolo: 'Tiratore scelto', specializzazioni: [], permessi: ['eventi'], punti_usati: 0 },
    { id: U.med, nome: 'Orso', discord_nome: 'orso_bruno', avatar_url: av('Orso'), stato: 'membro', grado: 6, ruolo: 'Medico', specializzazioni: ['Autista'], permessi: [], punti_usati: 0 },
    { id: U.mit, nome: 'Tuono', discord_nome: 'tuono', avatar_url: av('Tuono'), stato: 'membro', grado: 3, ruolo: 'Mitragliere', specializzazioni: ['Artigliere'], permessi: [], punti_usati: 0 },
    { id: U.gen, nome: 'Talpa', discord_nome: 'talpa_genio', avatar_url: av('Talpa'), stato: 'membro', grado: 2, ruolo: 'Geniere', specializzazioni: ['Autista', 'Carrista'], permessi: [], punti_usati: 0 },
    { id: U.sol, nome: 'Riccio', discord_nome: 'riccio99', avatar_url: av('Riccio'), stato: 'membro', grado: 1, ruolo: 'Assalto', specializzazioni: [], permessi: [], punti_usati: 0 },
    { id: U.rec, nome: 'Gufo', discord_nome: 'gufo_notturno', avatar_url: av('Gufo'), stato: 'membro', grado: 0, ruolo: 'Assalto', specializzazioni: [], permessi: [], punti_usati: 0 },
    { id: U.att, nome: 'NuovoUtente', discord_nome: 'nuovo_utente', avatar_url: av('Nuovo'), stato: 'in_attesa', grado: 0, ruolo: null, specializzazioni: [], permessi: [], punti_usati: 0 },
  ];

  const E = (i) => `10000000-0000-0000-0000-00000000000${i}`;
  const eventi = [
    { id: E(1), titolo: 'Addestramento CQB — sgombero edifici', tipo: 'addestramento', inizio: giorno(-24), fine: giorno(-24, 23), descrizione: 'Tecniche di ingresso, coperture angoli e comunicazioni in ambiente urbano.\n\n**Equipaggiamento:** standard fanteria.', server: 'Server Milsim Arditi', campagna_id: null, esito: null },
    { id: E(2), titolo: 'Op. ALBA GRIGIA', tipo: 'missione', inizio: giorno(-17), fine: giorno(-17, 23, 30), descrizione: 'Sbarco sulla costa sud di Gogland e messa in sicurezza del porto.', server: 'Server Milsim Arditi', campagna_id: 'cg1', esito: 'compiuta' },
    { id: E(3), titolo: 'Addestramento radio e MEDEVAC', tipo: 'addestramento', inizio: giorno(-10), fine: giorno(-10, 23), descrizione: 'Procedure 9-line, gestione reti radio, evacuazione feriti con elicottero.', server: 'Server Milsim Arditi', campagna_id: null, esito: null },
    { id: E(4), titolo: 'Op. FARO SPENTO', tipo: 'missione', inizio: giorno(-3), fine: giorno(-3, 23, 30), descrizione: 'Neutralizzazione della postazione radar sul faro nord.', server: 'Server Milsim Arditi', campagna_id: 'cg1', esito: 'fallita' },
    { id: E(5), titolo: 'Milsim domenicale — Everon', tipo: 'milsim', inizio: giorno(2, 15), fine: giorno(2, 19), descrizione: 'Milsim aperta su Everon. Briefing 15 minuti prima dell\'inizio.', server: 'Server Milsim Arditi', campagna_id: null, esito: null },
    { id: E(6), titolo: 'Op. CRESTA ROCCIOSA', tipo: 'missione', inizio: giorno(6), fine: giorno(6, 23, 30), descrizione: 'Assalto alla cresta centrale di Gogland per ottenere il controllo dell\'osservatorio.\n\nBriefing e ORBAT nei documenti allegati.', server: 'Server Milsim Arditi', campagna_id: 'cg1', esito: null },
    { id: E(7), titolo: 'Addestramento mezzi corazzati', tipo: 'addestramento', inizio: giorno(9), fine: giorno(9, 23), descrizione: 'Coordinamento fanteria-carri, formazioni di marcia.', server: 'Server Milsim Arditi', campagna_id: null, esito: null },
    { id: E(8), titolo: 'Riunione comando mensile', tipo: 'riunione', inizio: giorno(12, 21, 30), fine: giorno(12, 22, 30), descrizione: 'Revisione promozioni e pianificazione del mese.', server: 'Discord', campagna_id: null, esito: null },
  ];

  const p = (e, u, stato) => ({ evento_id: E(e), utente_id: U[u], stato });
  const partecipanti = [
    p(1, 'cap', 'presente'), p(1, 'ten', 'presente'), p(1, 'ser', 'presente'), p(1, 'med', 'presente'), p(1, 'mit', 'assente'), p(1, 'sol', 'presente'), p(1, 'rec', 'presente'),
    p(2, 'cap', 'presente'), p(2, 'ten', 'presente'), p(2, 'ser', 'presente'), p(2, 'med', 'presente'), p(2, 'mit', 'presente'), p(2, 'gen', 'presente'), p(2, 'sol', 'presente'),
    p(3, 'cap', 'presente'), p(3, 'med', 'presente'), p(3, 'mit', 'presente'), p(3, 'gen', 'presente'), p(3, 'rec', 'presente'),
    p(4, 'cap', 'presente'), p(4, 'ten', 'presente'), p(4, 'ser', 'presente'), p(4, 'mit', 'presente'), p(4, 'gen', 'assente'), p(4, 'sol', 'presente'),
    p(5, 'ten', 'iscritto'), p(5, 'med', 'iscritto'), p(5, 'sol', 'iscritto'),
    p(6, 'cap', 'iscritto'), p(6, 'ten', 'iscritto'), p(6, 'ser', 'iscritto'), p(6, 'med', 'iscritto'), p(6, 'mit', 'iscritto'),
  ];

  const documenti = [
    { id: 'd1', evento_id: E(6), titolo: 'Briefing Op. CRESTA ROCCIOSA.pdf', percorso: 'demo-briefing.pdf', creato_il: giorno(-1) },
    { id: 'd2', evento_id: E(6), titolo: 'ORBAT.png', percorso: 'demo-orbat.png', creato_il: giorno(-1) },
  ];

  const comunicazioni = [
    { id: 'c1', titolo: 'Nuova lista mod in vigore', testo: 'Aggiornata la lista mod del server milsim. Controllate la sezione **Mod** prima di sabato e scaricate tutto in anticipo.', priorita: 'importante', creato_il: giorno(-1, 18) },
    { id: 'c2', titolo: 'Campagna Gogland — situazione', testo: 'Dopo il fallimento di Op. FARO SPENTO il settore nord resta conteso. Prossimo obiettivo: la cresta centrale.', priorita: 'normale', creato_il: giorno(-2, 23) },
    { id: 'c3', titolo: 'Reclutamento aperto', testo: 'Cerchiamo nuovi membri, in particolare **medici** e **genieri**. Compilate il modulo nella sezione Reclutamento.', priorita: 'normale', creato_il: giorno(-8, 12) },
  ];

  const server = [
    { id: 's1', nome: 'Server Milsim Arditi', tipo: 'privato', ip: '0.0.0.0', porta: 2001, descrizione: 'Server privato per milsim, addestramenti e campagna. Password su Discord.', battlemetrics_id: '', ordine: 1 },
    { id: 's2', nome: 'Server PvP pubblico (esempio)', tipo: 'pvp', ip: '0.0.0.0', porta: 2001, descrizione: 'Server Conflict pubblico dove giochiamo in squadra nel tempo libero.', battlemetrics_id: '', ordine: 2 },
    { id: 's3', nome: 'Server PvP pubblico 2 (esempio)', tipo: 'pvp', ip: '0.0.0.0', porta: 2302, descrizione: 'Secondo server pubblico, modalità Conflict con mod.', battlemetrics_id: '', ordine: 3 },
  ];

  const contenuti = [
    {
      chiave: 'chi-siamo',
      testo: `Il **Reggimento Arditi** è un gruppo milsim italiano su **Arma Reforger**.

Giochiamo con un approccio realistico ma accessibile: catena di comando, comunicazioni radio, ruoli definiti e operazioni pianificate con briefing e debriefing.

### Cosa facciamo
- **Milsim** settimanali sul nostro server privato
- **Addestramenti** per imparare tattiche, procedure radio, soccorso e uso dei mezzi
- **Campagne persistenti**, dove ogni missione cambia la situazione sul campo
- Partite **PvP** sui server pubblici, in squadra

### Cosa chiediamo
- Età minima 16 anni e un microfono funzionante
- Rispetto della catena di comando e degli altri giocatori
- Presenza costante agli eventi a cui ci si iscrive`,
    },
  ];

  const campagne = [
    {
      id: 'cg1', titolo: 'Tempesta del Nord', sottotitolo: 'Isola di Gogland — Golfo di Finlandia', stato: 'attiva', ordine: 1,
      copertina: '', mappa: '', creato_il: giorno(-30),
      briefing: `**Operazione TEMPESTA DEL NORD** — L'isola di Gogland è occupata da forze ostili. Il Reggimento Arditi ha il compito di riconquistarla settore dopo settore.

Ogni missione della campagna modifica il controllo dei settori sulla mappa.

### Obiettivi strategici
1. Stabilire una testa di ponte sulla costa sud
2. Conquistare la cresta centrale e l'osservatorio
3. Neutralizzare il radar del faro nord`,
    },
    {
      id: 'cg2', titolo: 'Ombre su Everon', sottotitolo: 'Operazioni di controguerriglia', stato: 'pianificata', ordine: 2,
      copertina: '', mappa: '', creato_il: giorno(-5),
      briefing: 'Campagna in preparazione. I dettagli verranno pubblicati dal comando.',
    },
  ];

  const campagna_pagine = [
    { id: 'cp1', campagna_id: 'cg1', titolo: 'Forze in campo', ordine: 1, testo: `### Forze amiche
- **Reggimento Arditi** — fanteria leggera, 1 plotone su 3 squadre
- Supporto aereo: 1 elicottero da trasporto

### Forze nemiche
- Fanteria motorizzata, stimata 2 compagnie
- Postazioni fisse sulla cresta centrale` },
    { id: 'cp2', campagna_id: 'cg1', titolo: 'Regole della campagna', ordine: 2, testo: `- Il controllo di un settore cambia solo con una missione **compiuta**
- Mezzi distrutti non vengono rimpiazzati fino alla missione successiva
- Ogni squadra deve avere almeno un medico` },
  ];

  const settori = [
    { id: 'g1', campagna_id: 'cg1', nome: 'Porto Sud', stato: 'alleato', x: 48, y: 86, raggio: 7, descrizione: 'Testa di ponte. Conquistato con Op. ALBA GRIGIA.' },
    { id: 'g2', campagna_id: 'cg1', nome: 'Villaggio Sud-Est', stato: 'alleato', x: 62, y: 74, raggio: 6, descrizione: 'Area logistica.' },
    { id: 'g3', campagna_id: 'cg1', nome: 'Cresta Centrale', stato: 'nemico', x: 50, y: 55, raggio: 9, descrizione: 'Osservatorio nemico. Obiettivo di Op. CRESTA ROCCIOSA.' },
    { id: 'g4', campagna_id: 'cg1', nome: 'Bosco Ovest', stato: 'conteso', x: 34, y: 62, raggio: 6, descrizione: 'Pattuglie nemiche segnalate.' },
    { id: 'g5', campagna_id: 'cg1', nome: 'Faro Nord', stato: 'conteso', x: 54, y: 16, raggio: 5, descrizione: 'Postazione radar. Op. FARO SPENTO non riuscita.' },
    { id: 'g6', campagna_id: 'cg1', nome: 'Villaggio Nord', stato: 'nemico', x: 42, y: 30, raggio: 7, descrizione: 'Centro di comando nemico (presunto).' },
    { id: 'g7', campagna_id: 'cg1', nome: 'Baia Est', stato: 'sconosciuto', x: 68, y: 40, raggio: 0, descrizione: 'Nessuna ricognizione effettuata.' },
  ];

  const candidature = [
    { id: 'k1', discord_nome: 'aquila_23', eta: 24, disponibilita: 'Sabato e domenica sera', esperienza: '200 ore su Reforger, ex gruppo milsim Arma 3', ruolo_preferito: 'Medico', motivazione: 'Cerco un gruppo italiano serio con cui fare campagne.', provenienza: 'Discord di Reforger Italia', stato: 'nuova', creato_il: giorno(-1, 14) },
    { id: 'k2', discord_nome: 'sparviero', eta: 19, disponibilita: 'Quasi tutte le sere', esperienza: 'Principiante, 40 ore', ruolo_preferito: 'Assalto', motivazione: 'Voglio imparare a giocare in modo tattico.', provenienza: 'Un amico', stato: 'in_valutazione', creato_il: giorno(-4, 10) },
  ];

  const punti_manuali = [
    { id: 'pm1', utente_id: U.med, punti: 3, motivo: 'Gestione esemplare dei feriti durante Op. ALBA GRIGIA', creato_il: giorno(-16, 10) },
    { id: 'pm2', utente_id: U.sol, punti: -1, motivo: 'Assenza non giustificata', creato_il: giorno(-9, 10) },
  ];

  const campagna_documenti = [
    { id: 'cd1', campagna_id: 'cg1', titolo: 'Rapporto di ricognizione — Faro Nord', classificazione: 'riservatissimo', protocollo: 'Prot. 014/INT', data_documento: '28 settembre', file: '', creato_il: giorno(-5),
      testo: `**OGGETTO:** ricognizione della postazione radar sul promontorio nord.

La squadra di ricognizione ha individuato **due postazioni di mitragliatrice** a protezione dell'accesso al faro e un generatore diesel nel lato est del complesso.

Il radar risulta operativo. Si stima una guarnigione di **12–15 uomini**.

> Raccomandazione: avvicinamento dal mare con copertura notturna.` },
    { id: 'cd2', campagna_id: 'cg1', titolo: 'Intercettazione radio nemica', classificazione: 'segreto', protocollo: 'Prot. 021/SIG', data_documento: '1 ottobre', file: '', creato_il: giorno(-2),
      testo: `Trascrizione parziale di una comunicazione nemica intercettata alle 03:12:

*"...rinforzi dalla baia est entro 48 ore... l'osservatorio non deve cadere..."*

La Baia Est potrebbe essere usata come punto di sbarco per i rinforzi nemici.` },
  ];

  const campagna_articoli = [
    { id: 'ca1', campagna_id: 'cg1', testata: 'Il Corriere del Baltico', titolo: 'Sbarco nella notte: il porto sud torna libero', sommario: 'Le forze italiane hanno preso il controllo del porto dopo ore di scontri. La popolazione esce dai rifugi.', autore: 'M. Ferri, inviato a Gogland', data_articolo: '17 settembre', immagine: '', creato_il: giorno(-16),
      testo: `Alle prime luci dell'alba, i reparti del **Reggimento Arditi** hanno issato il tricolore sul molo principale del porto sud di Gogland.

Secondo fonti locali, gli scontri sono durati quasi tre ore. Nessuna vittima tra i civili.

"Abbiamo sentito le esplosioni per tutta la notte", racconta un pescatore. "Poi, al mattino, il silenzio."` },
    { id: 'ca2', campagna_id: 'cg1', testata: 'Il Corriere del Baltico', titolo: 'Faro Nord, l\'attacco fallisce', sommario: 'Il radar resta in mano nemica. Il comando parla di "ritirata ordinata".', autore: 'Redazione', data_articolo: '30 settembre', immagine: '', creato_il: giorno(-3),
      testo: `Non è andata come sperato l'operazione contro la postazione radar del Faro Nord. Le forze del Reggimento hanno incontrato una resistenza superiore alle attese e hanno ripiegato verso sud.` },
    { id: 'ca3', campagna_id: 'cg1', testata: 'Gogland Oggi', titolo: 'Gli abitanti chiedono un corridoio umanitario', sommario: 'Appello del sindaco del villaggio sud-est.', autore: 'A. Virtanen', data_articolo: '2 ottobre', immagine: '', creato_il: giorno(-1),
      testo: 'Il sindaco del villaggio sud-est ha chiesto alle parti in conflitto di garantire un passaggio sicuro per i civili verso il porto.' },
  ];

  const social = [
    { id: 'so1', piattaforma: 'discord', nome: 'Server Discord', url: 'https://discord.gg/sebbFmjhze', descrizione: 'La base operativa del Reggimento: briefing, eventi e reclutamento.', ordine: 1 },
    { id: 'so2', piattaforma: 'instagram', nome: '@reggimento.arditi', url: 'https://instagram.com/', descrizione: 'Foto e screenshot dalle nostre operazioni.', ordine: 2 },
    { id: 'so3', piattaforma: 'tiktok', nome: '@reggimentoarditi', url: 'https://tiktok.com/', descrizione: 'Clip e momenti migliori.', ordine: 3 },
    { id: 'so4', piattaforma: 'twitch', nome: 'ArditiLive', url: 'https://twitch.tv/', descrizione: 'Le milsim in diretta.', ordine: 4 },
    { id: 'so5', piattaforma: 'youtube', nome: 'Reggimento Arditi', url: 'https://youtube.com/', descrizione: 'Video completi delle operazioni e tutorial.', ordine: 5 },
  ];

  const IMG_RHS = 'https://ar-gcp-cdn.bistudio.com/image/0294/9a10419ef1c94d3bf03db77ff815d7fbd5ee02a20cf1f23e67ec21de8e90/5647.jpg';
  const mods = [
    { id: '1337C0DE5DABBEEF', nome: 'RHS - Content Pack 01', autore: 'Red Hammer Studios', versione: '0.16.5208', dimensione: 6344270175, aggiornata_il: '2026-09-17T12:06:10Z', immagine: IMG_RHS, url: 'https://reforger.armaplatform.com/workshop/1337C0DE5DABBEEF', principale: false, dipendenza_di: ['RHS - Status Quo'] },
    { id: 'BADC0DEDABBEDA5E', nome: 'RHS - Content Pack 02', autore: 'Red Hammer Studios', versione: '0.16.5208', dimensione: 2231218187, aggiornata_il: '2026-09-17T12:40:38Z', immagine: IMG_RHS, url: 'https://reforger.armaplatform.com/workshop/BADC0DEDABBEDA5E', principale: false, dipendenza_di: ['RHS - Status Quo'] },
    { id: '595F2BF2F44836FB', nome: 'RHS - Status Quo', autore: 'Red Hammer Studios', versione: '0.16.5208', dimensione: 204221809, aggiornata_il: '2026-09-17T12:44:59Z', immagine: IMG_RHS, url: 'https://reforger.armaplatform.com/workshop/595F2BF2F44836FB', principale: true, dipendenza_di: [] },
  ];
  const mods_changelog = [
    { id: 'ml1', data: giorno(0, 16, 56), iniziale: true, totale_prima: 0, totale_dopo: 8779710171,
      aggiunte: mods.map((m) => ({ id: m.id, nome: m.nome, versione: m.versione, dimensione: m.dimensione })), rimosse: [], aggiornate: [] },
  ];

  return { profili, eventi, partecipanti, documenti, comunicazioni, server, contenuti, campagne, campagna_pagine, settori, candidature,
    punti_manuali, campagna_documenti, campagna_articoli, social, mods, mods_changelog, _files: {}, _demoUser: U.cap };
}

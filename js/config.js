// ============================================================
//  CONFIGURAZIONE DEL SITO — Reggimento Arditi
//  I testi visibili si modificano direttamente dal sito (✏️ Modifica testi).
//  Qui restano collegamento al database, gradi, ruoli e punti.
// ============================================================

export const CONFIG = {
  // Dati del progetto Supabase (Project Settings → API).
  // Finché sono vuoti il sito gira in MODALITÀ DEMO con dati di esempio.
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  NOME: 'Reggimento Arditi',
  DISCORD_INVITE: 'https://discord.gg/sebbFmjhze',

  // Sistema punti grado
  PUNTI_PROMOZIONE: 20,
  PUNTI: {
    addestramento: 1,
    milsim: 1,
    missione_compiuta: 2,
    missione_fallita: 1, // partecipazione a una missione non riuscita
    riunione: 0,
    altro: 0,
  },
};

// Gradi dal più BASSO (indice 0) al più ALTO.
export const GRADI = [
  'Recluta',
  'Soldato',
  'Caporale',
  'Caporal Maggiore',
  'Graduato',
  'Graduato Scelto',
  'Graduato Capo',
  'Primo Graduato',
  'Graduato Aiutante',
  'Sergente',
  'Sergente Maggiore',
  'Sergente Maggiore Capo',
  'Sergente Maggiore Aiutante',
  'Maresciallo',
  'Maresciallo Ordinario',
  'Maresciallo Capo',
  'Primo Maresciallo',
  'Luogotenente',
  'Primo Luogotenente',
  'Sottotenente',
  'Tenente',
  'Capitano',
];

// Categoria del grado (per colori e raggruppamenti)
export function categoriaGrado(i) {
  if (i >= 19) return { nome: 'Ufficiali', cls: 'uff' };
  if (i >= 13) return { nome: 'Marescialli e Luogotenenti', cls: 'mar' };
  if (i >= 9) return { nome: 'Sergenti', cls: 'ser' };
  if (i >= 4) return { nome: 'Graduati', cls: 'gra' };
  return { nome: 'Truppa', cls: 'tru' };
}

// Nomi dei ruoli (le descrizioni si modificano dal sito)
export const RUOLI = {
  'Assalto': 'Fanteria di prima linea: manovra, sgombero edifici, ingaggio ravvicinato.',
  'Marconista': 'Gestisce le comunicazioni radio tra squadre e comando, coordina i supporti.',
  'Tiratore scelto': 'Osservazione e ingaggio a lunga distanza, ricognizione avanzata.',
  'Medico': 'Primo soccorso, triage e gestione dei feriti sotto il fuoco.',
  'Geniere': 'Esplosivi, mine, fortificazioni e riparazione mezzi.',
  'Mitragliere': 'Fuoco di soppressione e copertura con armi automatiche.',
};

export const SPECIALIZZAZIONI = {
  'Elicotterista': 'Pilotaggio di elicotteri per trasporto, evacuazione e supporto.',
  'Carrista': 'Equipaggio di mezzi corazzati e carri.',
  'Autista': 'Guida dei mezzi di trasporto e logistica.',
  'Artigliere': 'Mortai e artiglieria, fuoco indiretto su richiesta.',
};

export const PERMESSI = {
  admin: 'Amministratore: tutti i permessi + modifica di tutti i testi del sito',
  membri: 'Membri: approvazioni, gradi, ruoli, promozioni',
  eventi: 'Eventi: crea/modifica, documenti, presenze',
  comunicazioni: 'Comunicazioni',
  server: 'Lista server',
  campagna: 'Campagne: crea/modifica campagne, mappe, settori e pagine',
  reclutamento: 'Candidature',
  mod: 'Lista mod del server',
};

// Etichette brevi mostrate nel Direttivo
export const INCARICHI = {
  admin: 'Amministratore',
  membri: 'Personale',
  eventi: 'Operazioni',
  comunicazioni: 'Comunicazioni',
  server: 'Server',
  campagna: 'Campagne',
  reclutamento: 'Reclutamento',
  mod: 'Mod',
};

export const TIPI_EVENTO = {
  milsim: { label: 'Milsim', color: '#c2643f' },
  addestramento: { label: 'Addestramento', color: '#7a9a45' },
  missione: { label: 'Missione', color: '#d4a844' },
  riunione: { label: 'Riunione', color: '#5a8db0' },
  altro: { label: 'Altro', color: '#85857a' },
};

export const STATI_SETTORE = {
  alleato: { label: 'Sotto controllo', color: '#6fa83f' },
  conteso: { label: 'Conteso', color: '#e0a32e' },
  nemico: { label: 'Nemico', color: '#d2483a' },
  sconosciuto: { label: 'Sconosciuto', color: '#8a8a80' },
};

// Livelli di classificazione dei documenti riservati delle campagne
export const CLASSIFICAZIONI = {
  riservato: { label: 'Riservato', color: '#5a8db0' },
  riservatissimo: { label: 'Riservatissimo', color: '#d4a844' },
  segreto: { label: 'Segreto', color: '#d2483a' },
  segretissimo: { label: 'Segretissimo', color: '#b03080' },
};

// Piattaforme social: icona Lucide (icon) o logo incluso nel sito (brand) e colore
export const PIATTAFORME = {
  instagram: { label: 'Instagram', icon: 'instagram', color: '#e1306c' },
  tiktok: { label: 'TikTok', brand: 'tiktok', color: '#25f4ee' },
  twitch: { label: 'Twitch', icon: 'twitch', color: '#9146ff' },
  youtube: { label: 'YouTube', icon: 'youtube', color: '#ff0033' },
  discord: { label: 'Discord', brand: 'discord', color: '#5865f2' },
  x: { label: 'X / Twitter', brand: 'x', color: '#e7e9ea' },
  facebook: { label: 'Facebook', icon: 'facebook', color: '#1877f2' },
  kick: { label: 'Kick', icon: 'tv', color: '#53fc18' },
  steam: { label: 'Steam', icon: 'gamepad-2', color: '#66c0f4' },
  sito: { label: 'Sito web', icon: 'globe', color: '#b5cc7a' },
  altro: { label: 'Altro', icon: 'link', color: '#9b9d8c' },
};

export const STATI_CAMPAGNA = {
  attiva: { label: 'In corso', color: '#6fa83f' },
  pianificata: { label: 'Pianificata', color: '#5a8db0' },
  conclusa: { label: 'Conclusa', color: '#85857a' },
};

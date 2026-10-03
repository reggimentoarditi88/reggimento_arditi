// Stato dell'utente collegato, permessi e calcolo punti
import { CONFIG } from './config.js';
import { db, auth, DEMO } from './db.js';

export const stato = { me: null, campagne: [] };

export async function caricaUtente() {
  const id = await auth.utenteId();
  stato.me = id ? await db.get('profili', { id }) : null;
  return stato.me;
}

// Elenco campagne (per il menu a tendina); solo per i membri
export async function caricaCampagne() {
  stato.campagne = membro() ? await db.list('campagne', { order: 'ordine' }) : [];
  return stato.campagne;
}

export const loggato = () => !!stato.me;
export const membro = () => stato.me?.stato === 'membro';
export function can(permesso) {
  const p = stato.me?.permessi || [];
  return membro() && (p.includes('admin') || p.includes(permesso));
}

// Il Direttivo: membri con almeno un incarico/permesso
export const delDirettivo = (p) => p.stato === 'membro' && (p.permessi || []).length > 0;

export function puntiEvento(ev) {
  const P = CONFIG.PUNTI;
  if (ev.tipo === 'missione') {
    if (ev.esito === 'compiuta') return P.missione_compiuta;
    if (ev.esito === 'fallita') return P.missione_fallita;
    return 0; // esito non ancora registrato
  }
  return P[ev.tipo] || 0;
}

// Restituisce Map utente_id → { totale, storico: [{evento?, manuale?, punti, data}] }
// Gli stessi valori sono calcolati dal database (funzione punti_totali in schema.sql)
export function calcolaPunti(eventi, partecipanti, manuali = []) {
  const evById = new Map(eventi.map((e) => [e.id, e]));
  const out = new Map();
  const di = (uid) => {
    if (!out.has(uid)) out.set(uid, { totale: 0, storico: [] });
    return out.get(uid);
  };
  for (const p of partecipanti) {
    if (p.stato !== 'presente') continue;
    const ev = evById.get(p.evento_id);
    if (!ev) continue;
    const punti = puntiEvento(ev);
    const r = di(p.utente_id);
    r.totale += punti;
    r.storico.push({ evento: ev, punti, data: ev.inizio });
  }
  for (const m of manuali) {
    const r = di(m.utente_id);
    r.totale += m.punti;
    r.storico.push({ manuale: m, punti: m.punti, data: m.creato_il });
  }
  for (const r of out.values()) r.storico.sort((a, b) => String(b.data).localeCompare(String(a.data)));
  return out;
}

export async function datiPunti() {
  const [eventi, partecipanti, manuali] = await Promise.all([db.list('eventi'), db.list('partecipanti'), db.list('punti_manuali')]);
  return calcolaPunti(eventi, partecipanti, manuali);
}

export function puntiGrado(profilo, totale) {
  return Math.max(0, totale - (profilo.punti_usati || 0));
}

// Promozione automatica ogni CONFIG.PUNTI_PROMOZIONE punti.
// Con Supabase la esegue il database (trigger in schema.sql) qualunque sia la modifica;
// in demo la simuliamo qui. Restituisce l'elenco delle promozioni avvenute.
export async function verificaPromozioni() {
  if (!DEMO) return [];
  const { GRADI } = await import('./config.js');
  const [profili, punti] = await Promise.all([db.list('profili'), datiPunti()]);
  const fatte = [];
  for (const p of profili.filter((x) => x.stato === 'membro')) {
    let grado = p.grado;
    let usati = p.punti_usati || 0;
    let disponibili = (punti.get(p.id)?.totale || 0) - usati;
    while (disponibili >= CONFIG.PUNTI_PROMOZIONE && grado < GRADI.length - 1) {
      grado++;
      usati += CONFIG.PUNTI_PROMOZIONE;
      disponibili -= CONFIG.PUNTI_PROMOZIONE;
    }
    if (grado !== p.grado) {
      await db.update('profili', { id: p.id }, { grado, punti_usati: usati });
      fatte.push(`${p.nome || p.discord_nome} promosso a ${GRADI[grado]}`);
    }
  }
  return fatte;
}

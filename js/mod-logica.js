// Logica della lista mod condivisa dal sito (la stessa è replicata nella funzione Supabase "mod-workshop")

// Estrae gli ID (16 caratteri esadecimali) da un testo con link o ID, uno per riga.
// Restituisce [{ id, nome }] senza duplicati; il nome viene dal link se presente (…/ID-Nome-Mod).
export function estraiMod(testo) {
  const visti = new Set();
  const out = [];
  for (const riga of String(testo || '').split(/\r?\n/)) {
    const pulita = riga.split('#')[0];
    const re = /\b([0-9A-Fa-f]{16})\b(?:-([\w%.\-]+))?/g;
    let m;
    while ((m = re.exec(pulita))) {
      const id = m[1].toUpperCase();
      if (visti.has(id)) continue;
      visti.add(id);
      out.push({ id, nome: m[2] ? decodeURIComponent(m[2]).replace(/[-_]+/g, ' ').trim() : '' });
    }
  }
  return out;
}

export const ordinaMod = (lista) => [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));
export const totaleMod = (lista) => lista.reduce((s, m) => s + (Number(m.dimensione) || 0), 0);

// Confronta la lista precedente con la nuova e prepara la voce di changelog (null se nulla è cambiato)
export function confronta(prima, dopo) {
  const pById = new Map(prima.map((m) => [m.id, m]));
  const nById = new Map(dopo.map((m) => [m.id, m]));
  const breve = (m) => ({ id: m.id, nome: m.nome, versione: m.versione, dimensione: Number(m.dimensione) || 0 });
  const aggiunte = dopo.filter((m) => !pById.has(m.id)).map(breve);
  const rimosse = prima.filter((m) => !nById.has(m.id)).map(breve);
  const aggiornate = dopo
    .filter((m) => pById.has(m.id) && pById.get(m.id).versione !== m.versione)
    .map((m) => ({ id: m.id, nome: m.nome, da: pById.get(m.id).versione, a: m.versione, dimensione_da: Number(pById.get(m.id).dimensione) || 0, dimensione_a: Number(m.dimensione) || 0 }));
  if (prima.length && !aggiunte.length && !rimosse.length && !aggiornate.length) return null;
  return {
    data: new Date().toISOString(),
    iniziale: prima.length === 0,
    totale_prima: totaleMod(prima),
    totale_dopo: totaleMod(dopo),
    aggiunte, rimosse, aggiornate,
  };
}

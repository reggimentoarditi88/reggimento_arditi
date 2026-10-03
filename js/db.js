// Livello dati: la stessa interfaccia funziona con Supabase o con i dati demo in memoria.
import { CONFIG } from './config.js';
import { seed } from './demo.js';

export const DEMO = !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;

// flowType 'pkce': dopo il login Discord il codice torna in ?code=… e non nell'#hash usato dalla navigazione
const sb = DEMO ? null : window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true },
});
const mem = DEMO ? seed() : null;
const BUCKET = 'documenti';

const clone = (x) => JSON.parse(JSON.stringify(x));
const matches = (row, eq) => Object.entries(eq).every(([k, v]) => row[k] === v);

function check({ data, error }) {
  if (error) {
    console.error(error);
    throw new Error(error.message || 'Errore del database');
  }
  return data;
}

export const db = {
  async list(table, { eq, order, asc = true } = {}) {
    if (DEMO) {
      let rows = mem[table].filter((r) => !eq || matches(r, eq));
      if (order) rows = rows.sort((a, b) => (a[order] > b[order] ? 1 : a[order] < b[order] ? -1 : 0) * (asc ? 1 : -1));
      return clone(rows);
    }
    let q = sb.from(table).select('*');
    if (eq) for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
    if (order) q = q.order(order, { ascending: asc });
    return check(await q);
  },

  async get(table, eq) {
    return (await this.list(table, { eq }))[0] || null;
  },

  // ret=false per tabelle in cui l'utente può scrivere ma non leggere (es. candidature)
  async insert(table, row, { ret = true } = {}) {
    if (DEMO) {
      const r = { id: crypto.randomUUID(), creato_il: new Date().toISOString(), ...row };
      mem[table].push(r);
      return clone(r);
    }
    if (!ret) return check(await sb.from(table).insert(row));
    return check(await sb.from(table).insert(row).select().single());
  },

  async update(table, eq, patch) {
    if (DEMO) {
      mem[table].filter((r) => matches(r, eq)).forEach((r) => Object.assign(r, patch));
      return;
    }
    let q = sb.from(table).update(patch);
    for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
    check(await q);
  },

  async upsert(table, row) {
    if (DEMO) {
      const key = table === 'contenuti' ? { chiave: row.chiave } : { id: row.id };
      const ex = mem[table].find((r) => matches(r, key));
      if (ex) Object.assign(ex, row);
      else mem[table].push({ ...row });
      return;
    }
    check(await sb.from(table).upsert(row));
  },

  async remove(table, eq) {
    if (DEMO) {
      mem[table] = mem[table].filter((r) => !matches(r, eq));
      return;
    }
    let q = sb.from(table).delete();
    for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
    check(await q);
  },
};

export const storage = {
  async upload(file) {
    const safe = file.name.normalize('NFD').replace(/[^\w.\-]+/g, '_');
    const path = `${Date.now()}-${safe}`;
    if (DEMO) {
      mem._files[path] = URL.createObjectURL(file);
      return path;
    }
    check(await sb.storage.from(BUCKET).upload(path, file));
    return path;
  },
  async url(path) {
    if (DEMO) return mem._files[path] || null;
    const data = check(await sb.storage.from(BUCKET).createSignedUrl(path, 3600));
    return data.signedUrl;
  },
  async remove(path) {
    if (DEMO) {
      delete mem._files[path];
      return;
    }
    check(await sb.storage.from(BUCKET).remove([path]));
  },
  // Immagini (mappe satellitari, copertine): bucket pubblico, restituisce l'URL diretto
  async uploadImmagine(file) {
    if (DEMO) return URL.createObjectURL(file);
    const safe = file.name.normalize('NFD').replace(/[^\w.\-]+/g, '_');
    const path = `${Date.now()}-${safe}`;
    check(await sb.storage.from('immagini').upload(path, file, { cacheControl: '31536000' }));
    return sb.storage.from('immagini').getPublicUrl(path).data.publicUrl;
  },
};

// ---------------- Funzioni lato server (Supabase Edge Functions) ----------------
export async function funzione(nome, body) {
  if (DEMO) return funzioneDemo(nome, body);
  const { data, error } = await sb.functions.invoke(nome, { body });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).errore || msg; } catch { /* risposta non JSON */ }
    throw new Error(msg);
  }
  return data;
}

// In demo non si può leggere il Workshop (serve il server): si simula con i dati già noti
async function funzioneDemo(nome, body) {
  if (nome !== 'mod-workshop') throw new Error('Funzione non disponibile in demo');
  const { estraiMod, ordinaMod, confronta } = await import('./mod-logica.js');
  const prima = clone(mem.mods);
  if (body.azione === 'aggiorna') return { cambiato: false, mods: prima, demo: true };
  const richieste = estraiMod(body.testo);
  if (!richieste.length) throw new Error('Nessun link o ID di mod trovato nel testo.');
  const noti = new Map(prima.map((m) => [m.id, m]));
  const nuove = [];
  for (const r of richieste) {
    const m = noti.get(r.id) || {
      id: r.id, nome: r.nome || `Mod ${r.id}`, autore: '', versione: '?', dimensione: null,
      aggiornata_il: null, immagine: null, url: `https://reforger.armaplatform.com/workshop/${r.id}`, dipendenza_di: [],
    };
    nuove.push({ ...m, principale: true });
    // le dipendenze già conosciute restano incluse
    for (const d of prima.filter((x) => (x.dipendenza_di || []).includes(m.nome))) {
      if (!richieste.some((q) => q.id === d.id) && !nuove.some((q) => q.id === d.id)) nuove.push({ ...d, principale: false });
    }
  }
  const lista = ordinaMod(nuove);
  const voce = confronta(prima, lista);
  mem.mods = lista;
  if (voce) mem.mods_changelog.unshift({ id: crypto.randomUUID(), ...voce });
  return { cambiato: !!voce, voce, mods: clone(lista), demo: true };
}

// ---------------- Autenticazione ----------------
let demoLogged = DEMO ? sessionStorageGet('demoLogged') !== '0' : false;

function sessionStorageGet(k) {
  try { return sessionStorage.getItem(k); } catch { return null; }
}
function sessionStorageSet(k, v) {
  try { sessionStorage.setItem(k, v); } catch { /* ignorato */ }
}

export const auth = {
  async utenteId() {
    if (DEMO) return demoLogged ? mem._demoUser : null;
    const { data } = await sb.auth.getSession();
    return data.session?.user?.id || null;
  },
  async login() {
    if (DEMO) {
      demoLogged = true;
      sessionStorageSet('demoLogged', '1');
      window.dispatchEvent(new Event('auth-change'));
      return;
    }
    const redirectTo = location.origin + location.pathname;
    check(await sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo, scopes: 'identify' } }));
  },
  async logout() {
    if (DEMO) {
      demoLogged = false;
      sessionStorageSet('demoLogged', '0');
    } else {
      await sb.auth.signOut();
    }
    window.dispatchEvent(new Event('auth-change'));
  },
  // Solo demo: permette di "impersonare" un altro membro per provare i permessi
  demoImpersona(id) {
    if (!DEMO) return;
    mem._demoUser = id;
    demoLogged = true;
    window.dispatchEvent(new Event('auth-change'));
  },
};

if (!DEMO) {
  sb.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_IN' && location.search.includes('code=')) {
      history.replaceState(null, '', location.pathname + location.hash);
    }
    if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') {
      // fuori dal callback: Supabase sconsiglia chiamate await dentro onAuthStateChange
      setTimeout(() => window.dispatchEvent(new Event('auth-change')), 0);
    }
  });
}

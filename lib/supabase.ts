// ── Lumio Pathways · Supabase client (fetch-based, no npm package) ──
// Mirrors the lightweight client from the Expo Snack prototype,
// extended with the full table access needed for the real app.

import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://amsmbgeycleatljbqlli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtc21iZ2V5Y2xlYXRsamJxbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNzk4OTMsImV4cCI6MjEwNTg1NTg5M30.x5TE4OR44NjegkgtY60QK_0btNB3dMgaYbajFiibHqg';

const STORAGE_KEY = 'lumio_session';

// ── Auth token store ──────────────────────────────────────────────
let _token: string | null = null;
let _userId: string | null = null;
let _userEmail: string | null = null;

export function getToken() { return _token; }
export function getUserId() { return _userId; }
export function getUserEmail() { return _userEmail; }

// Persist session to AsyncStorage so it survives module re-initialisation
async function saveSession() {
  try {
    if (_token) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ _token, _userId, _userEmail }));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

// Restore session from AsyncStorage (call once on app start)
export async function restoreSession() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      _token = s._token ?? null;
      _userId = s._userId ?? null;
      _userEmail = s._userEmail ?? null;
    }
  } catch {}
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${_token || SUPABASE_KEY}`,
  };
}

// ── Auth ──────────────────────────────────────────────────────────
export const auth = {
  signUp: async ({ email, password }: { email: string; password: string }) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: { message: data.error_description || data.msg || 'Sign up failed' } };
    if (data.access_token) {
      _token = data.access_token;
      _userId = data.user?.id ?? null;
      _userEmail = data.user?.email ?? email;
    }
    return { data, error: null };
  },

  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { return { data: null, error: { message: 'Invalid response: ' + text.slice(0, 200) } }; }
      if (!res.ok) return { data: null, error: { message: data.error_description || data.msg || data.message || data.error || JSON.stringify(data) } };
      _token = data.access_token;
      _userId = data.user?.id ?? null;
      _userEmail = data.user?.email ?? email;
      await saveSession();
      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: { message: 'Network error: ' + (e?.message || String(e)) } };
    }
  },

  signOut: async () => {
    if (_token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: authHeaders(),
      });
    }
    _token = null;
    _userId = null;
    _userEmail = null;
    await saveSession();
    return { error: null };
  },

  getSession: () => ({
    data: { session: _token ? { access_token: _token, user: { id: _userId, email: _userEmail } } : null },
    error: null,
  }),

  // Restore a session from tokens (used for password recovery deep links)
  setSession: async ({ access_token, refresh_token }: { access_token: string; refresh_token?: string }) => {
    try {
      // Verify the token by fetching the user
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.message || 'Invalid token' } };
      _token = access_token;
      _userId = data.id ?? null;
      _userEmail = data.email ?? null;
      await saveSession();
      return { data: { session: { access_token, user: data } }, error: null };
    } catch (e: any) {
      return { data: null, error: { message: 'Network error: ' + (e?.message || String(e)) } };
    }
  },
};

// ── Database helpers ──────────────────────────────────────────────
type QueryBuilder = {
  select: (cols?: string) => QueryBuilder;
  insert: (rows: object | object[]) => QueryBuilder;
  update: (values: object) => QueryBuilder;
  upsert: (rows: object | object[]) => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
  order: (col: string, opts?: { ascending?: boolean }) => QueryBuilder;
  single: () => Promise<{ data: unknown; error: unknown }>;
  then: (resolve: (v: { data: unknown; error: unknown }) => void, reject?: (e: unknown) => void) => Promise<void>;
};

function buildQuery(table: string): QueryBuilder {
  let method = 'GET';
  let body: string | undefined;
  let filters: string[] = [];
  let preferReturn = '';
  let singleRow = false;
  let selectCols = '*';

  const exec = async (): Promise<{ data: unknown; error: unknown }> => {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (method === 'GET' || method === 'DELETE') {
      const qs = [`select=${selectCols}`, ...filters].join('&');
      url += `?${qs}`;
    } else if (filters.length) {
      url += `?${filters.join('&')}`;
    }

    const headers: Record<string, string> = {
      ...authHeaders(),
    };
    if (method !== 'GET' && method !== 'DELETE') {
      headers['Prefer'] = preferReturn || 'return=representation';
    }
    if (singleRow) {
      headers['Prefer'] = 'return=representation,count=exact';
      headers['Accept'] = 'application/vnd.pgrst.object+json';
    }

    const res = await fetch(url, { method, headers, body });
    if (method === 'DELETE' && res.status === 204) return { data: null, error: null };
    const data = await res.json();
    if (!res.ok) return { data: null, error: { message: data.message || data.hint || JSON.stringify(data) } };
    return { data, error: null };
  };

  const builder: QueryBuilder = {
    select(cols = '*') { selectCols = cols; method = 'GET'; return builder; },
    insert(rows) {
      method = 'POST';
      body = JSON.stringify(Array.isArray(rows) ? rows : [rows]);
      return builder;
    },
    update(values) {
      method = 'PATCH';
      body = JSON.stringify(values);
      return builder;
    },
    upsert(rows) {
      method = 'POST';
      body = JSON.stringify(Array.isArray(rows) ? rows : [rows]);
      preferReturn = 'return=representation,resolution=merge-duplicates';
      return builder;
    },
    eq(col, val) {
      // PostgREST expects booleans as 'true'/'false' (unquoted)
      const encoded = typeof val === 'boolean' ? String(val) : encodeURIComponent(String(val));
      filters.push(`${col}=eq.${encoded}`);
      return builder;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      const dir = opts?.ascending === false ? 'desc' : 'asc';
      filters.push(`order=${col}.${dir}`);
      return builder;
    },
    single() { singleRow = true; return exec(); },
    then(resolve, reject) { return exec().then(resolve, reject); },
  };
  return builder;
}

export const from = (table: string) => buildQuery(table);

// ── Named exports matching @supabase/supabase-js surface ──────────
export const supabase = { auth, from };
export default supabase;

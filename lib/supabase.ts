// ── Lumio Pathways · Supabase client (fetch-based, no npm package) ──
// Mirrors the lightweight client from the Expo Snack prototype,
// extended with the full table access needed for the real app.

const SUPABASE_URL = 'https://amsmbgeycleatljbqlli.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q-qgAb0ms8cEjg43U58QAg_z6rCd2EI';

// ── Auth token store ──────────────────────────────────────────────
let _token: string | null = null;
let _userId: string | null = null;
let _userEmail: string | null = null;

export function getToken() { return _token; }
export function getUserId() { return _userId; }
export function getUserEmail() { return _userEmail; }

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
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: { message: data.error_description || data.msg || 'Sign in failed' } };
    _token = data.access_token;
    _userId = data.user?.id ?? null;
    _userEmail = data.user?.email ?? email;
    return { data, error: null };
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
    return { error: null };
  },

  getSession: () => ({
    data: { session: _token ? { access_token: _token, user: { id: _userId, email: _userEmail } } : null },
    error: null,
  }),
};

// ── Database helpers ──────────────────────────────────────────────
type QueryBuilder = {
  select: (cols?: string) => QueryBuilder;
  insert: (rows: object | object[]) => QueryBuilder;
  update: (values: object) => QueryBuilder;
  upsert: (rows: object | object[]) => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
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
      'Prefer': singleRow ? 'return=representation,count=exact' : (preferReturn || 'return=representation'),
    };
    if (singleRow) headers['Accept'] = 'application/vnd.pgrst.object+json';

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
    eq(col, val) { filters.push(`${col}=eq.${encodeURIComponent(String(val))}`); return builder; },
    single() { singleRow = true; return exec(); },
    then(resolve, reject) { return exec().then(resolve, reject); },
  };
  return builder;
}

export const from = (table: string) => buildQuery(table);

// ── Named exports matching @supabase/supabase-js surface ──────────
export const supabase = { auth, from };
export default supabase;

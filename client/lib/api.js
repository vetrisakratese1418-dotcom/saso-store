export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

let cachedSettings = null;

export async function fetchSettings(force = false) {
  if (cachedSettings && !force) return cachedSettings;
  try {
    const res = await fetch(`${API_URL}/settings/public`, { cache: 'no-store' });
    if (res.ok) {
      cachedSettings = await res.json();
    }
  } catch {
    cachedSettings = cachedSettings || null;
  }
  return cachedSettings;
}

export async function api(path, { method = 'GET', body, token, headers = {}, isForm = false } = {}) {
  const opts = { method, headers: { ...headers }, cache: 'no-store' };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body && isForm) {
    opts.body = body;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, opts);
  } catch (err) {
    const error = new Error('Cannot reach the server. Is it running?');
    error.status = 0;
    throw error;
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const error = new Error(data?.message || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('shopora_token');
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('shopora_token', token);
  else localStorage.removeItem('shopora_token');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('shopora_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  if (typeof window === 'undefined') return;
  if (user) localStorage.setItem('shopora_user', JSON.stringify(user));
  else localStorage.removeItem('shopora_user');
}

export function invalidateSettings() {
  cachedSettings = null;
}

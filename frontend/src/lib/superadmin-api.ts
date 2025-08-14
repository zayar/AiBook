export type SuperAdminTenant = {
  id: string;
  name: string;
  domain?: string | null;
  createdAt: string;
  _count?: { accounts: number; entries: number; books: number };
};

const API_BASE = '/api/v1'; // Use Next.js proxy
const TOKEN_KEY = 'superadmin_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function superAdminLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/superadmin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed');
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function fetchTenants(params?: { q?: string; page?: number; limit?: number }): Promise<{ data: SuperAdminTenant[]; pagination: { total: number; page: number; limit: number } }>
{
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const res = await fetch(`${API_BASE}/superadmin/tenants?${qs.toString()}`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load tenants');
  return res.json();
}

export async function createTenant(payload: { name: string; domain?: string; adminEmail?: string; adminName?: string }) {
  const res = await fetch(`${API_BASE}/superadmin/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create tenant');
  }
  return res.json();
}

export async function listTenantUsers(tenantId: string) {
  const res = await fetch(`${API_BASE}/superadmin/tenants/${tenantId}/users`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

export async function upsertTenantAdmin(tenantId: string, payload: { email: string; name?: string }) {
  const res = await fetch(`${API_BASE}/superadmin/tenants/${tenantId}/admins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upsert admin');
  }
  return res.json();
}

export async function setUserPassword(userId: string, payload: { password: string; mustChange?: boolean }) {
  const res = await fetch(`${API_BASE}/superadmin/users/${userId}/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to set password');
  }
  return res.json();
}



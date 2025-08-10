'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearToken, createTenant, fetchTenants, getToken } from '@/lib/superadmin-api';
import { useRouter } from 'next/navigation';

export default function SuperAdminHome() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [form, setForm] = useState({ name: '', domain: '', adminEmail: '', adminName: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/superadmin/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function load() {
    try {
      setLoading(true);
      const res = await fetchTenants({ q: query || undefined, page, limit });
      setTenants(res.data);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  const submitNewTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createTenant({
        name: form.name,
        domain: form.domain || undefined,
        adminEmail: form.adminEmail || undefined,
        adminName: form.adminName || undefined,
      });
      setForm({ name: '', domain: '', adminEmail: '', adminName: '' });
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Super Admin — Tenants</h1>
          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tenants…"
              className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button onClick={() => { setPage(1); load(); }} className="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2">Search</button>
            <button onClick={() => { clearToken(); router.replace('/superadmin/login'); }} className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2">Sign out</button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="font-medium">All Tenants</div>
                <div className="text-sm text-gray-300">{total} total</div>
              </div>
              <div className="divide-y divide-white/10">
                {loading ? (
                  <div className="p-6 text-gray-300">Loading…</div>
                ) : tenants.length === 0 ? (
                  <div className="p-6 text-gray-300">No tenants found.</div>
                ) : tenants.map((t) => (
                  <div key={t.id} className="p-6 flex items-center justify-between hover:bg-white/5">
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-sm text-gray-400">{t.domain || '—'} · Created {new Date(t.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{t._count?.books ?? 0} books</span>
                      <Link href={`/superadmin/tenants/${t.id}`} className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm">Manage</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center gap-2">
                <button disabled={page<=1} onClick={() => setPage((p)=>Math.max(1,p-1))} className="px-3 py-1 rounded bg-white/10 disabled:opacity-40">Prev</button>
                <div className="text-sm text-gray-300">Page {page} / {totalPages}</div>
                <button disabled={page>=totalPages} onClick={() => setPage((p)=>Math.min(totalPages,p+1))} className="px-3 py-1 rounded bg-white/10 disabled:opacity-40">Next</button>
              </div>
            )}
          </div>
          <div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="font-medium mb-3">Create Tenant</div>
              {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
              <form onSubmit={submitNewTenant} className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Name</label>
                  <input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Domain</label>
                  <input value={form.domain} onChange={(e)=>setForm({...form,domain:e.target.value})} placeholder="tenant.example.com" className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Admin Email</label>
                  <input value={form.adminEmail} onChange={(e)=>setForm({...form,adminEmail:e.target.value})} type="email" className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Admin Name</label>
                  <input value={form.adminName} onChange={(e)=>setForm({...form,adminName:e.target.value})} className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2" />
                </div>
                <button disabled={creating} className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 py-2.5 font-medium">{creating?'Creating…':'Create Tenant'}</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



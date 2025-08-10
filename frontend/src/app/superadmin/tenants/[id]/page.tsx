'use client';

import { useEffect, useState } from 'react';
import { listTenantUsers, upsertTenantAdmin, getToken, setUserPassword } from '@/lib/superadmin-api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ManageTenantPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = String(params?.id || '');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [mustChange, setMustChange] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/superadmin/login');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await listTenantUsers(tenantId);
        setUsers(res.data || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await upsertTenantAdmin(tenantId, { email, name: name || undefined });
      setEmail('');
      setName('');
      const res = await listTenantUsers(tenantId);
      setUsers(res.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/superadmin" className="text-sm text-gray-300 hover:text-white">← Back</Link>
          <h1 className="text-xl font-semibold">Manage Tenant Admins</h1>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 font-medium">Users</div>
            {loading ? (
              <div className="p-6 text-gray-300">Loading…</div>
            ) : (
              <div className="divide-y divide-white/10">
                {users.length === 0 ? (
                  <div className="p-6 text-gray-300">No users yet.</div>
                ) : users.map((u) => (
                  <div key={u.id} className="p-6 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{u.email}</div>
                      <div className="text-sm text-gray-400">{u.name || '—'} · Role {u.role}</div>
                    </div>
                    <button onClick={()=>{setSelectedUserId(u.id); setNewPassword(''); setMustChange(true);}} className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">Set Password</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-8">
            <div className="font-medium mb-3">Assign/Update Tenant Admin</div>
            {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Admin Email</label>
                <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Admin Name</label>
                <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2" />
              </div>
              <button disabled={saving} className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 py-2.5 font-medium">{saving?'Saving…':'Save Admin'}</button>
            </form>
            <div className="h-px bg-white/10" />
            <div>
              <div className="font-medium mb-3">Set Password for Selected User</div>
              {!selectedUserId ? (
                <div className="text-sm text-gray-400">Select a user from the left to set a password.</div>
              ) : (
                <form onSubmit={async (e)=>{e.preventDefault(); setPwdSaving(true); setError(null); try { await setUserPassword(selectedUserId!, { password: newPassword, mustChange }); setSelectedUserId(null); setNewPassword(''); const res = await listTenantUsers(tenantId); setUsers(res.data||[]);} catch(e:any){ setError(e.message||'Failed to set password'); } finally { setPwdSaving(false);} }} className="space-y-3">
                  <input value={newPassword} onChange={e=>setNewPassword(e.target.value)} type="password" required minLength={8} placeholder="New password" className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2" />
                  <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={mustChange} onChange={e=>setMustChange(e.target.checked)} /> Require password change on next login</label>
                  <button disabled={pwdSaving} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 font-medium">{pwdSaving?'Saving…':'Save Password'}</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



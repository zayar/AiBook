'use client';
import React, { useState } from 'react';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError('Passwords do not match');
    const token = localStorage.getItem('authToken');
    if (!token) return setError('Not authenticated');

    try {
      setLoading(true);
      // Use frontend proxy to properly forward the Authorization header
      const res = await fetch(`/api/v1/auth/set-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword: password }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to set password');
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden p-8">
        <h1 className="text-xl font-semibold text-white mb-2">Set your password</h1>
        <p className="text-sm text-gray-300 mb-6">Please create a new password to continue.</p>
        {error && <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-200 mb-1">New password</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required minLength={8} className="w-full rounded-xl bg-white/10 border border-white/10 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-200 mb-1">Confirm password</label>
            <input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" required minLength={8} className="w-full rounded-xl bg-white/10 border border-white/10 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button disabled={loading} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 font-medium transition disabled:opacity-60">{loading ? 'Saving…' : 'Save password'}</button>
        </form>
      </div>
    </div>
  );
}



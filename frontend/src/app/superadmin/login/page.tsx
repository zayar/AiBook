'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { superAdminLogin } from '@/lib/superadmin-api';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('zayar@piti.app');
  const [password, setPassword] = useState('12C@ndl$');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await superAdminLogin(email, password);
      router.replace('/superadmin');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-black p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-white">Super Admin</h1>
        <p className="text-sm text-gray-300 mb-6">Sign in to manage tenants</p>
        {error && (
          <div className="mb-4 text-red-400 text-sm">{error}</div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-200 mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full rounded-lg bg-white/10 border border-white/10 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="you@example.com"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-200 mb-1">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full rounded-lg bg-white/10 border border-white/10 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 text-white py-2.5 font-medium transition disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}



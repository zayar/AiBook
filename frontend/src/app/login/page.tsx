'use client';
import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Go through the frontend proxy to leverage consistent headers and CORS
      const res = await fetch(`/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Login failed');
      localStorage.setItem('authToken', data.token);
      if (data.user?.mustChange) {
        window.location.href = '/set-password';
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(1200px_600px_at_50%_-200px,_#1d4ed8_10%,transparent_60%),radial-gradient(900px_500px_at_120%_10%,_#7c3aed_10%,transparent_60%),radial-gradient(900px_500px_at_-20%_10%,_#0ea5e9_10%,transparent_60%),#020617]">
      {/* Animated particles */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500 blur-3xl animate-pulse [animation-duration:4s]" />
        <div className="absolute -bottom-24 right-1/3 h-72 w-72 rounded-full bg-indigo-500 blur-3xl animate-pulse [animation-duration:5s]" />
      </div>

      {/* Grid backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="group relative rounded-3xl border border-white/10 bg-white/5 px-8 pb-8 pt-6 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out hover:-translate-y-0.5">
            {/* Brand */}
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-900/40">
                <span className="text-sm font-bold">AI</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">Sign in to Cashflow Copilot</h1>
                <p className="text-sm text-slate-300">Welcome back. Please enter your details.</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-semibold uppercase tracking-wide text-slate-200">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="you@company.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none transition focus:border-sky-400/40 focus:ring-2 focus:ring-sky-500/40"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold uppercase tracking-wide text-slate-200">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none transition focus:border-sky-400/40 focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              <button
                disabled={loading}
                className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 font-medium text-white shadow-lg shadow-sky-900/40 transition hover:from-sky-500 hover:to-indigo-500 disabled:opacity-60"
              >
                <span className="relative z-10">{loading ? 'Signing in…' : 'Sign in'}</span>
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent)] animate-[shimmer_1.8s_infinite]" />
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-300">
              By continuing you agree to our Terms and Privacy Policy.
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
      `}</style>
    </div>
  );
}



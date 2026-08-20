"use client";

import { useState } from "react";
import { getMonitorAuthError, useMonitorAuth } from "@/context/MonitorAuthContext";

export default function MonitorLogin() {
  const { signInWithEmail, signInWithGoogle } = useMonitorAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    setError("");
    setPending("email");
    try {
      await signInWithEmail(email.trim(), password);
    } catch (loginError) {
      setError(getMonitorAuthError(loginError));
    } finally {
      setPending("");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setPending("google");
    try {
      await signInWithGoogle();
    } catch (loginError) {
      setError(getMonitorAuthError(loginError));
    } finally {
      setPending("");
    }
  };

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(251,191,36,0.18),transparent_28rem),radial-gradient(circle_at_90%_85%,rgba(59,130,246,0.14),transparent_30rem)]" />
      <section className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white text-slate-950 shadow-2xl shadow-black/40">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-sm font-black shadow-sm" aria-hidden="true">CM</span>
            <div>
              <p className="text-lg font-black tracking-tight">Contextra Monitor</p>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Protected editorial workspace</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-7 sm:px-8 sm:py-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Administrator access</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Sign in securely</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">Use the same administrator account you use on the Contextra main site. Reader and editor accounts cannot open this monitor.</p>

          {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800">{error}</div>}

          <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-800">Email address</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" required className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" placeholder="admin@contextra.com" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-800">Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" placeholder="Enter your password" />
            </label>
            <button type="submit" disabled={Boolean(pending)} className="w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
              {pending === "email" ? "Checking administrator access..." : "Sign in to monitor"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200" /><span className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-400">or</span><span className="h-px flex-1 bg-slate-200" /></div>
          <button type="button" onClick={handleGoogleLogin} disabled={Boolean(pending)} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 px-5 py-3.5 text-sm font-black text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-base shadow-sm" aria-hidden="true">G</span>
            {pending === "google" ? "Connecting to Google..." : "Continue with Google"}
          </button>

          <p className="mt-6 text-center text-xs font-semibold leading-5 text-slate-500">Authentication is handled by the same Firebase project as the public website. Your password is never sent to the monitor backend.</p>
        </div>
      </section>
    </main>
  );
}

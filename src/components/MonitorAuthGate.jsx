"use client";

import MonitorLogin from "@/components/MonitorLogin";
import { useMonitorAuth } from "@/context/MonitorAuthContext";

function AccessScreen({ children }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white p-7 text-center shadow-2xl sm:p-10">{children}</section>
    </main>
  );
}

export default function MonitorAuthGate({ children }) {
  const { firebaseUser, profile, loading, profileError, isAdmin, logout } = useMonitorAuth();

  if (loading) {
    return (
      <AccessScreen>
        <span className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-amber-400 text-sm font-black text-slate-950">CM</span>
        <h1 className="mt-5 text-2xl font-black text-slate-950">Checking administrator access</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Verifying your Firebase session and Contextra role...</p>
      </AccessScreen>
    );
  }

  if (!firebaseUser) return <MonitorLogin />;

  if (profileError || !profile || !isAdmin) {
    return (
      <AccessScreen>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl font-black text-red-700" aria-hidden="true">!</span>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-red-700">Access denied</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Administrator role required</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{profileError || `The account ${firebaseUser.email || "you selected"} is signed in, but its Contextra role is “${profile?.role || "reader"}”.`}</p>
        <button type="button" onClick={logout} className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800">Sign out and use another account</button>
      </AccessScreen>
    );
  }

  return children;
}

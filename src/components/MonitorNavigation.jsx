"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MobileCommandBar from "./MobileCommandBar";
import { useMonitorAuth } from "@/context/MonitorAuthContext";

const links = [
  { href: "/dashboard", label: "Manual workflow", shortLabel: "Manual" },
  { href: "/automation", label: "Automation", shortLabel: "Automate" },
  { href: "/review", label: "Review queue", shortLabel: "Review" },
  { href: "/clusters", label: "Clusters", shortLabel: "Clusters" },
  { href: "/generated", label: "Generated", shortLabel: "Generated" },
  { href: "/published", label: "Published", shortLabel: "Published" },
  { href: "/sources", label: "Sources", shortLabel: "Sources" },
];

export default function MonitorNavigation() {
  const pathname = usePathname();
  const { profile, firebaseUser, logout } = useMonitorAuth();
  const active = (href) => pathname === href || pathname.startsWith(`${href}/`);
  const displayName = profile?.displayName || profile?.fullName || firebaseUser?.displayName || "Administrator";
  const initial = displayName.charAt(0).toUpperCase() || "A";

  return (
    <>
      <header className="monitor-nav sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white shadow-lg shadow-slate-950/10 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[90rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="group flex min-w-0 items-center gap-3 rounded-xl py-2" aria-label="Contextra Monitor dashboard">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-sm font-black text-slate-950 shadow-sm transition group-hover:rotate-[-3deg] group-hover:bg-amber-300" aria-hidden="true">CM</span>
          <span className="min-w-0">
            <strong className="block truncate text-sm font-black tracking-tight">Contextra Monitor</strong>
            <span className="mt-0.5 hidden text-[0.62rem] font-bold uppercase tracking-[0.16em] text-slate-400 sm:block">Editorial operations</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Monitor navigation">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={`rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${active(item.href) ? "bg-white text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href="https://contextra.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-black text-slate-200 transition hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 sm:inline-flex"
          >
            View main site <span aria-hidden="true">↗</span>
          </a>
          <details className="group relative">
            <summary className="flex min-h-11 list-none items-center gap-2 rounded-xl border border-slate-700 px-2 text-left transition marker:hidden hover:border-slate-500 hover:bg-slate-900 sm:pr-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-xs font-black text-slate-950" aria-hidden="true">{initial}</span>
              <span className="hidden max-w-36 sm:block">
                <strong className="block truncate text-xs font-black text-white">{displayName}</strong>
                <span className="block text-[0.6rem] font-bold uppercase tracking-[0.12em] text-emerald-400">Administrator</span>
              </span>
              <span className="hidden text-slate-500 transition group-open:rotate-180 sm:inline" aria-hidden="true">⌄</span>
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
              <div className="bg-slate-50 px-4 py-4">
                <p className="truncate text-sm font-black">{displayName}</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{firebaseUser?.email}</p>
              </div>
              <div className="space-y-1 p-2">
                <a href="https://contextra.netlify.app" target="_blank" rel="noopener noreferrer" className="block rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:hidden">Open main site ↗</a>
                <button type="button" onClick={logout} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-black text-red-700 transition hover:bg-red-50">Sign out</button>
              </div>
            </div>
          </details>
        </div>
      </div>

      </header>

      {/* Keep viewport-fixed mobile UI outside the blurred sticky header. */}
      <MobileCommandBar />
    </>
  );
}

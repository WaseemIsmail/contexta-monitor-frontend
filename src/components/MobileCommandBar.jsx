"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchNews } from "@/services/monitorApi";

const appTabs = [
  { href: "/dashboard", label: "Manual", icon: "home" },
  { href: "/review", label: "Review", icon: "review" },
  { href: "/automation", label: "Automate", icon: "automation", featured: true },
  { href: "/clusters", label: "Clusters", icon: "clusters" },
];

function NavIcon({ name, className = "h-5 w-5" }) {
  const paths = {
    home: <><path d="m3 11 9-7 9 7"/><path d="M5.5 10v9h13v-9M9.5 19v-5h5v5"/></>,
    automation: <><path d="M4 7h10M4 17h16M14 7l2-2m-2 2 2 2M10 17l-2-2m2 2-2 2"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="17" r="2"/></>,
    review: <><path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/><path d="m15.5 16.5 1 1 2-2"/></>,
    clusters: <><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></>,
    more: <><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/></>,
    generated: <><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    published: <><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/><path d="m15.5 16 1.5 1.5 3-3"/></>,
    sources: <><circle cx="12" cy="12" r="9"/><path d="M8 12a4 4 0 0 1 4 4M8 8a8 8 0 0 1 8 8"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/></>,
    site: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6H5V6h6"/></>,
  };

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function AppTab({ item, selected }) {
  if (item.featured) {
    return (
      <Link
        href={item.href}
        aria-current={selected ? "page" : undefined}
        className="group relative flex min-w-0 flex-col items-center justify-end pb-2 text-[0.64rem] font-black"
      >
        <span className={`absolute -top-5 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white shadow-lg transition active:scale-95 ${selected ? "bg-amber-400 text-slate-950" : "bg-slate-950 text-white"}`}>
          <NavIcon name={item.icon} className="h-6 w-6" />
        </span>
        <span className={`mt-auto truncate ${selected ? "text-amber-700" : "text-slate-600"}`}>{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={selected ? "page" : undefined}
      className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.64rem] font-black transition active:scale-95 ${selected ? "text-amber-700" : "text-slate-500"}`}
    >
      <span className={`flex h-8 w-11 items-center justify-center rounded-xl transition ${selected ? "bg-amber-100" : "group-active:bg-slate-100"}`}>
        <NavIcon name={item.icon} />
      </span>
      <span className="truncate">{item.label}</span>
      {selected && <span className="absolute bottom-0 h-1 w-5 rounded-full bg-amber-400" aria-hidden="true" />}
    </Link>
  );
}

export default function MobileCommandBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState("");
  const closeRef = useRef(null);
  const active = (href) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const handleFetch = async () => {
    if (fetching) return;

    try {
      setFetching(true);
      setResult("");
      const data = await fetchNews();
      setResult(`Saved ${Number(data.savedCount || 0)} / Clustered ${Number(data.clusteredCount || 0)} / Skipped ${Number(data.skippedCount || 0)}`);
    } catch (error) {
      setResult(error.message || "Could not fetch news");
    } finally {
      setFetching(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/65 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close quick actions"
            tabIndex={-1}
          />

          <section
            id="mobile-actions-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-actions-title"
            className="monitor-mobile-sheet absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[2rem] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
          >
            <div className="mx-auto max-w-lg">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" aria-hidden="true" />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Mobile workspace</p>
                  <h2 id="mobile-actions-title" className="mt-1 text-2xl font-black text-slate-950">Quick actions</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500">Manage the monitor without returning to the dashboard.</p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-700 active:scale-95"
                  aria-label="Close quick actions"
                >
                  X
                </button>
              </div>

              <button
                type="button"
                onClick={handleFetch}
                disabled={fetching}
                className="mt-5 flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl bg-amber-400 px-5 py-4 text-left text-slate-950 shadow-sm transition active:scale-[0.98] disabled:opacity-60"
              >
                <span>
                  <strong className="block text-base font-black">{fetching ? "Fetching RSS feeds..." : "Fetch latest news"}</strong>
                  <span className="mt-1 block text-xs font-semibold">Collect and cluster new feed items now.</span>
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/50 text-xl font-black" aria-hidden="true">R</span>
              </button>

              {result && (
                <p className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-xs font-bold leading-5 text-slate-700" role="status" aria-live="polite">
                  {result}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link href="/published" onClick={() => setOpen(false)} className="col-span-2 flex min-h-20 items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition active:scale-[0.98] active:bg-emerald-100">
                  <span><strong className="block text-sm font-black text-slate-950">Published news</strong><span className="mt-1 block text-xs leading-4 text-slate-600">View, edit, select, or delete live articles.</span></span>
                  <NavIcon name="published" className="h-6 w-6 text-emerald-700" />
                </Link>
                <Link href="/generated" onClick={() => setOpen(false)} className="flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 transition active:scale-[0.98] active:bg-slate-100">
                  <NavIcon name="generated" className="h-6 w-6 text-blue-600" />
                  <span><strong className="block text-sm font-black text-slate-950">Generated</strong><span className="mt-1 block text-xs leading-4 text-slate-500">Content history</span></span>
                </Link>
                <Link href="/sources" onClick={() => setOpen(false)} className="flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 transition active:scale-[0.98] active:bg-slate-100">
                  <NavIcon name="sources" className="h-6 w-6 text-violet-600" />
                  <span><strong className="block text-sm font-black text-slate-950">Sources</strong><span className="mt-1 block text-xs leading-4 text-slate-500">RSS connections</span></span>
                </Link>
                <a href="https://contextra.netlify.app" target="_blank" rel="noopener noreferrer" className="col-span-2 flex min-h-20 items-center justify-between rounded-2xl bg-slate-950 p-4 text-white transition active:scale-[0.98]">
                  <span><strong className="block text-sm font-black">Open the main site</strong><span className="mt-1 block text-xs leading-4 text-slate-400">Check recently published articles.</span></span>
                  <NavIcon name="site" className="h-6 w-6 text-amber-400" />
                </a>
              </div>
            </div>
          </section>
        </div>
      )}

      <nav className="monitor-mobile-nav fixed inset-x-0 bottom-0 z-[70] grid h-[calc(5rem+env(safe-area-inset-bottom))] grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_35px_rgba(15,23,42,0.14)] backdrop-blur-xl lg:hidden" aria-label="Mobile app navigation">
        {appTabs.slice(0, 2).map((item) => <AppTab key={item.href} item={item} selected={active(item.href)} />)}
        <AppTab item={appTabs[2]} selected={active(appTabs[2].href)} />
        <AppTab item={appTabs[3]} selected={active(appTabs[3].href)} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-actions-drawer"
          aria-haspopup="dialog"
          className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.64rem] font-black transition active:scale-95 ${open ? "text-amber-700" : "text-slate-500"}`}
        >
          <span className={`flex h-8 w-11 items-center justify-center rounded-xl ${open ? "bg-amber-100" : ""}`}><NavIcon name="more" /></span>
          <span>More</span>
          {open && <span className="absolute bottom-0 h-1 w-5 rounded-full bg-amber-400" aria-hidden="true" />}
        </button>
      </nav>
    </>
  );
}

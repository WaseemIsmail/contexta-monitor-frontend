"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SourceCard from "@/components/SourceCard";
import { getSources } from "@/services/monitorApi";

export default function SourcesPage() {
  const [sources, setSources] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSources()
      .then((data) => setSources(Array.isArray(data) ? data : data?.sources || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:mb-8 sm:rounded-[2rem] sm:p-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
              Ingestion directory
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">
              RSS sources
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Inspect the publishers and feeds currently connected to the monitoring backend.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 sm:w-auto"
          >
            Refresh from dashboard
          </Link>
        </header>

        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading sources" aria-busy="true">
            {[0, 1, 2].map((item) => <div key={item} className="h-72 rounded-3xl border border-slate-200 bg-white p-5"><div className="monitor-skeleton h-full rounded-2xl" /></div>)}
          </section>
        ) : sources.length ? (
          <>
            <p className="mb-4 text-sm font-bold text-slate-600">{sources.length} configured {sources.length === 1 ? "source" : "sources"}</p>
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {sources.map((source, index) => <SourceCard key={source.rssUrl || source.sourceUrl || `${source.sourceName}-${index}`} source={source} />)}
            </section>
          </>
        ) : !error && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-xl font-black text-slate-950">No sources returned</h2><p className="mt-2 text-sm text-slate-600">Check the backend feed configuration and API connection.</p></div>
        )}
      </div>
    </main>
  );
}

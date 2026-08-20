"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ClusterCard from "@/components/ClusterCard";
import { getClusters } from "@/services/monitorApi";

const generatedStatuses = new Set(["generated", "validated", "published", "used"]);

export default function GeneratedPage() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getClusters("", 100, false)
      .then((data) => setClusters(Array.isArray(data) ? data : data?.clusters || []))
      .catch((err) => setError(err.message || "Could not load generated content"))
      .finally(() => setLoading(false));
  }, []);

  const generatedClusters = useMemo(
    () => clusters.filter((cluster) => generatedStatuses.has(cluster.status)),
    [clusters],
  );

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Content history</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">Generated and published</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Reopen content that has completed generation, validation, or publication without searching the entire cluster archive.</p>
          </div>
          <Link href="/clusters" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 sm:w-auto">Browse all clusters</Link>
        </header>

        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div>}

        {loading ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading generated content" aria-busy="true">
            {[0, 1, 2].map((item) => <div key={item} className="h-80 rounded-3xl border border-slate-200 bg-white p-5"><div className="monitor-skeleton h-full rounded-2xl" /></div>)}
          </section>
        ) : generatedClusters.length ? (
          <>
            <p className="text-sm font-bold text-slate-600">{generatedClusters.length} completed {generatedClusters.length === 1 ? "record" : "records"}</p>
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {generatedClusters.map((cluster) => <ClusterCard key={cluster.id} cluster={cluster} />)}
            </section>
          </>
        ) : (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-black text-slate-950">No generated content yet</h2>
            <p className="mt-2 text-sm text-slate-600">Generate a cluster manually or run automation. Completed content will appear here.</p>
            <Link href="/automation" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white">Open automation</Link>
          </section>
        )}
      </div>
    </main>
  );
}

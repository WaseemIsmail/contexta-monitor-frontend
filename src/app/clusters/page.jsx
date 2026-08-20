"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ClusterCard from "@/components/ClusterCard";
import { getClusters } from "@/services/monitorApi";

export default function ClustersPage() {
  const [clusters, setClusters] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClusters()
      .then((data) => setClusters(Array.isArray(data) ? data : data?.clusters || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredClusters = useMemo(() => {
    return clusters.filter((cluster) => {
      const searchText = `${cluster.clusterTitle || ""} ${
        cluster.commonSummary || ""
      } ${cluster.sourceNames?.join(" ") || ""}`.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());
      const matchesStatus = status ? cluster.status === status : true;
      const matchesCategory = category ? cluster.category === category : true;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [clusters, search, status, category]);

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:mb-8 sm:rounded-[2rem] sm:p-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
              Story workspace
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">
              Grouped news topics
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Search, filter, and open grouped reporting without losing your place in the workflow.
            </p>
          </div>

          <Link
            href="/review"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 sm:w-auto"
          >
            Review exceptions
          </Link>
        </header>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20 lg:z-20">
          <div className="grid gap-3 md:grid-cols-[1.3fr_0.8fr_0.8fr_auto]">
            <label className="sr-only" htmlFor="cluster-search">Search clusters</label>
            <input
              id="cluster-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, summary, or source..."
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:bg-white"
            />

            <label className="sr-only" htmlFor="cluster-category">Filter by category</label>
            <select
              id="cluster-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-slate-900 focus:bg-white"
            >
              <option value="">All categories</option>
              <option value="world">World</option>
              <option value="business">Business</option>
              <option value="economy">Economy</option>
              <option value="technology">Technology</option>
              <option value="sports">Sports</option>
              <option value="politics">Politics</option>
              <option value="fact-check">Fact Check</option>
            </select>

            <label className="sr-only" htmlFor="cluster-status">Filter by status</label>
            <select
              id="cluster-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-slate-900 focus:bg-white"
            >
              <option value="">All statuses</option>
              <option value="new">New</option>
              <option value="needs_review">Needs review</option>
              <option value="review_ready">Review ready</option>
              <option value="generated">Generated</option>
              <option value="published">Published</option>
              <option value="used">Used</option>
            </select>

            <button type="button" onClick={() => { setSearch(""); setCategory(""); setStatus(""); }} disabled={!search && !category && !status} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
              Clear
            </button>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500" aria-live="polite">
            {loading ? "Loading cluster index..." : `${filteredClusters.length} of ${clusters.length} clusters match`}
          </p>
        </section>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading clusters" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-80 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="monitor-skeleton h-full rounded-2xl" /></div>)}
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredClusters.map((cluster) => (
              <ClusterCard key={cluster.id} cluster={cluster} />
            ))}
          </section>
        )}

        {!loading && filteredClusters.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-black text-slate-900">No matching clusters</h2>
            <p className="mt-2 text-sm text-slate-600">Try a broader search or clear the active filters.</p>
            <button type="button" onClick={() => { setSearch(""); setCategory(""); setStatus(""); }} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Clear filters</button>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ClusterCard from "@/components/ClusterCard";
import {
  cleanupUsedClusters,
  deleteArchivedClusters,
  fetchNews,
  getClusters,
  getReviewQueue,
  healthCheck,
} from "@/services/monitorApi";

function DeleteArchiveModal({ open, busy, onCancel, onConfirm }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="delete-archive-title" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
        <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-red-700">Permanent action</span>
        <h2 id="delete-archive-title" className="mt-4 text-2xl font-black tracking-tight text-slate-950">Delete the old archive?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Archived clusters older than seven days will be permanently removed. Active, generated, and recently archived work is not affected.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50 disabled:opacity-50">Keep archive</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50">{busy ? "Deleting..." : "Delete records"}</button>
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState("checking");
  const [clusters, setClusters] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [hours, setHours] = useState("");
  const [displayLimit, setDisplayLimit] = useState(18);

  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clustersLoading, setClustersLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadClusters = async (selectedHours = hours) => {
    try {
      setClustersLoading(true);
      setError("");

      // Load a safe amount of clusters to avoid Firestore quota issues.
      const data = await getClusters(selectedHours, 50, false);

      // Safe handling if backend returns array or { clusters: [] }
      setClusters(Array.isArray(data) ? data : data?.clusters || []);
      setDisplayLimit(18);
    } catch (err) {
      setError(err.message || "Failed to load clusters");
    } finally {
      setClustersLoading(false);
    }
  };

  const checkApi = async () => {
    try {
      await healthCheck();
      setApiStatus("online");
    } catch {
      setApiStatus("offline");
    }
  };

  const loadReviewCount = async () => {
    try {
      const result = await getReviewQueue("active", 200);
      setReviewCount(Number(result.count || 0));
    } catch {
      setReviewCount(0);
    }
  };

  useEffect(() => {
    // These calls synchronize the dashboard with three external API resources.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkApi();
    loadClusters("");
    loadReviewCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshNews = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await fetchNews();

      setMessage(
        `News fetched. Saved: ${result.savedCount || 0}, Clustered: ${
          result.clusteredCount || 0
        }, Skipped: ${result.skippedCount || 0}`
      );

      await loadClusters(hours);
    } catch (err) {
      setError(err.message || "Failed to fetch news");
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupUsedClusters = async () => {
    setCleanupLoading(true);
    setMessage("");
    setError("");

    try {
      // Archives used clusters older than 1 day
      const result = await cleanupUsedClusters(1, 100);

      setMessage(
        `Cleanup completed. Archived: ${result.archivedCount || 0} old used cluster(s).`
      );

      await loadClusters(hours);
    } catch (err) {
      setError(err.message || "Failed to clean old used clusters");
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleDeleteArchivedClusters = async () => {
    setDeleteLoading(true);
    setMessage("");
    setError("");

    try {
      // Permanently deletes archived clusters older than 7 days
      const result = await deleteArchivedClusters(7, 50);

      setMessage(
        `Delete completed. Deleted: ${result.deletedCount || 0} archived cluster(s).`
      );
      setDeleteConfirmOpen(false);

      await loadClusters(hours);
    } catch (err) {
      setError(err.message || "Failed to delete old archived clusters");
      setDeleteConfirmOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTimeFilterChange = async (event) => {
    const selectedHours = event.target.value;

    setHours(selectedHours);
    setMessage("");
    setError("");

    await loadClusters(selectedHours);
  };

  const handleShowMore = () => {
    setDisplayLimit((prev) => prev + 18);
  };

  const handleShowAll = () => {
    setDisplayLimit(clusters.length);
  };

  const totalSources = clusters.reduce(
    (sum, cluster) => sum + Number(cluster.sourceCount || 0),
    0
  );

  const visibleClusters = clusters.slice(0, displayLimit);
  const hasMoreClusters = clusters.length > visibleClusters.length;

  const selectedTimeLabel =
    hours === "2"
      ? "Last 2 Hours"
      : hours === "6"
      ? "Last 6 Hours"
      : hours === "24"
      ? "Last 24 Hours"
      : hours === "168"
      ? "Last 7 Days"
      : "All Time";

  const isBusy =
    loading || cleanupLoading || deleteLoading || clustersLoading;

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <DeleteArchiveModal open={deleteConfirmOpen} busy={deleteLoading} onCancel={() => setDeleteConfirmOpen(false)} onConfirm={handleDeleteArchivedClusters} />
      <div className="mx-auto max-w-7xl">
        <header className="relative z-20 mb-8 overflow-visible rounded-[2rem] bg-slate-950 text-white shadow-xl shadow-slate-950/10">
          <div className="grid gap-7 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                Manual workflow
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
                Fetch, choose, generate, and publish one story
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                This is the original one-by-one workflow. Fetch RSS reporting, open only the cluster you want, generate editable content, then send it as a draft or publish it.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-slate-200">Window: {selectedTimeLabel}</span>
                <span className={`rounded-full px-3 py-1.5 ${apiStatus === "online" ? "bg-emerald-400/15 text-emerald-300" : apiStatus === "checking" ? "bg-white/10 text-slate-300" : "bg-red-400/15 text-red-300"}`}>
                  API {apiStatus}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:max-w-xl lg:justify-end">
              <select
                value={hours}
                onChange={handleTimeFilterChange}
                disabled={isBusy}
                aria-label="Dashboard time range"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">All Time</option>
                <option value="2">Last 2 Hours</option>
                <option value="6">Last 6 Hours</option>
                <option value="24">Last 24 Hours</option>
                <option value="168">Last 7 Days</option>
              </select>

              <button
                onClick={handleRefreshNews}
                disabled={isBusy}
                className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Fetching..." : "Refresh News"}
              </button>

              <Link
                href="/review"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500"
              >
                Review Queue{reviewCount ? ` (${reviewCount})` : ""}
              </Link>

              <details className="group relative z-30 sm:w-full lg:w-auto">
                <summary className="flex min-h-11 list-none items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900 marker:content-none">
                  Maintenance
                  <svg viewBox="0 0 20 20" className="h-4 w-4 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m5 7.5 5 5 5-5" />
                  </svg>
                </summary>
                <div className="z-40 mt-2 grid gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl sm:grid-cols-2 lg:absolute lg:right-0 lg:top-[calc(100%+0.5rem)] lg:mt-0 lg:w-[25rem]">
                  <button
                    onClick={handleCleanupUsedClusters}
                    disabled={isBusy}
                    className="rounded-xl border border-amber-500/40 bg-amber-400/10 px-4 py-3 text-left text-sm font-bold text-amber-300 transition hover:bg-amber-400/20 disabled:opacity-60"
                  >
                    {cleanupLoading ? "Cleaning..." : "Archive old used"}
                    <span className="mt-1 block text-xs font-medium leading-5 text-slate-400">Moves old completed records out of the active workspace.</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={isBusy}
                    className="rounded-xl border border-red-500/40 bg-red-400/10 px-4 py-3 text-left text-sm font-bold text-red-300 transition hover:bg-red-400/20 disabled:opacity-60"
                  >
                    {deleteLoading ? "Deleting..." : "Delete old archive"}
                    <span className="mt-1 block text-xs font-medium leading-5 text-slate-400">Permanently removes archived records older than seven days.</span>
                  </button>
                </div>
              </details>
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="manual-workflow-title">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Manual mode remains available</p>
              <h2 id="manual-workflow-title" className="mt-2 text-xl font-black text-slate-950">You control every article</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Nothing is generated or posted from this page unless you choose the individual story and press its action.</p>
            </div>
            <Link href="/clusters" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:border-slate-950 hover:bg-slate-50">
              Browse all clusters
            </Link>
          </div>

          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["1", "Fetch RSS", "Press Refresh News to collect and group the latest source items."],
              ["2", "Choose a story", "Open one cluster from the cards below or the full cluster list."],
              ["3", "Generate one", "Press Generate Content inside that cluster; no other cluster is generated."],
              ["4", "Edit and post", "Review every editable field, then send as draft or post directly."],
            ].map(([number, title, description]) => (
              <li key={number} className="rounded-2xl bg-slate-50 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">{number}</span>
                <h3 className="mt-3 text-sm font-black text-slate-950">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5" aria-label="Dashboard summary">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm font-semibold text-slate-500">API Status</p>
            <p className={`mt-3 flex items-center gap-2 text-lg font-black capitalize sm:text-2xl ${apiStatus === "online" ? "text-emerald-700" : apiStatus === "checking" ? "text-slate-600" : "text-red-700"}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${apiStatus === "online" ? "bg-emerald-500" : apiStatus === "checking" ? "animate-pulse bg-amber-500" : "bg-red-500"}`} aria-hidden="true" />
              {apiStatus}
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm font-semibold text-slate-500">Time Filter</p>
            <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
              {selectedTimeLabel}
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm font-semibold text-slate-500">Clusters</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {clustersLoading ? "..." : clusters.length}
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm font-semibold text-slate-500">Source Items</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {clustersLoading ? "..." : totalSources}
            </p>
          </div>

          <Link href="/review" className="col-span-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100 sm:p-5 lg:col-span-1">
            <p className="text-sm font-semibold text-amber-800">Needs Review</p>
            <p className="mt-2 text-2xl font-black text-amber-950">{reviewCount}</p>
          </Link>
        </section>

        {message && (
          <div role="status" aria-live="polite" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm">
            {message}
          </div>
        )}

        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 shadow-sm">
            {error}
          </div>
        )}

        {clustersLoading && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading clusters" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="monitor-skeleton h-5 w-2/5 rounded-full" />
                <div className="monitor-skeleton mt-5 h-6 w-4/5 rounded-lg" />
                <div className="monitor-skeleton mt-3 h-4 w-full rounded" />
                <div className="monitor-skeleton mt-2 h-4 w-3/4 rounded" />
                <div className="monitor-skeleton mt-6 h-11 w-32 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {!clustersLoading && clusters.length > 0 && (
          <>
            <div className="mb-5 flex flex-col justify-between gap-3 border-b border-slate-300 pb-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Story workspace</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Recent clusters</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">Showing {visibleClusters.length} of {clusters.length} clusters</p>
              </div>

              {hasMoreClusters && (
                <button
                  type="button"
                  onClick={handleShowAll}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  Show All Loaded
                </button>
              )}
            </div>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleClusters.map((cluster, index) => (
                <ClusterCard
                  key={
                    cluster.id ||
                    cluster.slug ||
                    cluster.clusterTitle ||
                    index
                  }
                  cluster={cluster}
                />
              ))}
            </section>

            {hasMoreClusters && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleShowMore}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
                >
                  Show More
                </button>
              </div>
            )}
          </>
        )}

        {!clustersLoading && clusters.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-12">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl" aria-hidden="true">↻</span>
            <h2 className="mt-5 text-xl font-bold text-slate-900">
              No clusters found
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Click Refresh News to fetch RSS items, or change the time filter
              to All Time.
            </p>
            <button type="button" onClick={handleRefreshNews} disabled={isBusy} className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
              {loading ? "Fetching news..." : "Fetch news now"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

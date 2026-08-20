"use client";

import AutomationResultModal from "@/components/AutomationResultModal";
import AutomationTimeline from "@/components/AutomationTimeline";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAutomationStatus,
  runAutomation,
  startAutomation,
  stopAutomation,
} from "@/services/monitorApi";

const defaults = { autoFetch: true, autoGenerate: true, autoPost: true };

export default function AutomationPage() {
  const [options, setOptions] = useState(defaults);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loadedBackendOptions = useRef(false);
  const [resultModal, setResultModal] = useState(null);
  const resultTrackingStarted = useRef(false);
  const lastResultFinishedAt = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getAutomationStatus();
      setStatus(data);
      const finishedAt = data.lastResult?.finishedAt || null;
      if (!resultTrackingStarted.current) {
        resultTrackingStarted.current = true;
        lastResultFinishedAt.current = finishedAt;
      } else if (finishedAt && finishedAt !== lastResultFinishedAt.current) {
        lastResultFinishedAt.current = finishedAt;
        setResultModal(data.lastResult);
      }
      if (!loadedBackendOptions.current && data.options) {
        setOptions(data.options);
        loadedBackendOptions.current = true;
      }
      setError("");
    } catch (err) {
      setError(err.message || "Could not reach automation backend");
    }
  }, []);

  useEffect(() => {
    // Initial status load is intentionally followed by polling.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function execute(action, showResult = false) {
    setBusy(true);
    setError("");
    try {
      const data = await action();
      const nextStatus = data.status || data;
      setStatus(nextStatus);
      const result = data.result || (showResult ? nextStatus.lastResult : null);
      if (showResult && result) {
        lastResultFinishedAt.current = result.finishedAt || null;
        setResultModal(result);
      }
    } catch (err) {
      setError(err.message || "Automation request failed");
    } finally {
      setBusy(false);
    }
  }

  const lastResult = status?.lastResult || null;
  const lastAttempted = Number(lastResult?.attempted || 0);
  const lastSuccessful = Number(lastResult?.successful || 0);
  const lastFailed = Number(lastResult?.failed ?? lastResult?.errors?.length ?? 0);
  const lastNeedsReview = Number(lastResult?.needsReview ?? lastResult?.reviewItems?.length ?? 0);
  const lastSeoReady = Number(lastResult?.seoReady || 0);
  const lastSearchNotified = Number(lastResult?.searchNotified || 0);
  const lastAutoRepairRecovered = Number(lastResult?.autoRepairRecovered || 0);
  const lastAttention = lastFailed + lastNeedsReview;
  const lastSuccessRate = lastAttempted
    ? Math.round((lastSuccessful / lastAttempted) * 100)
    : 100;

  return (
    <>
      <AutomationResultModal result={resultModal} onClose={() => setResultModal(null)} />
      <main className="min-h-screen px-3 py-3 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <header className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center md:gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700 sm:text-sm">Pipeline Control</p>
              <h1 className="mt-1.5 text-2xl font-black text-slate-950 sm:mt-2 sm:text-3xl">News Automation</h1>
              <p className="mt-1.5 max-w-2xl text-[0.8rem] leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6">
                Clean stories publish automatically. Single-source stories become attributed briefs; sensitive, uncertain, or unsafe items stop in the Review Queue.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <Link href="/review" className="flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-3 py-2.5 text-center text-xs font-black text-slate-950 hover:bg-amber-400 sm:px-5 sm:py-3 sm:text-sm">
                Review Queue
              </Link>
              <Link href="/dashboard" className="flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-3 py-2.5 text-center text-xs font-black text-slate-900 hover:bg-slate-50 sm:px-5 sm:py-3 sm:text-sm">
                <span className="sm:hidden">Manual workflow</span>
                <span className="hidden sm:inline">Open Manual Workflow</span>
              </Link>
            </div>
          </div>
        </header>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <section className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="grid gap-2.5 sm:gap-4 md:grid-cols-3">
            {[
              ["autoFetch", "Auto-fetch RSS", "Collect new titles, summaries, dates, and links from configured feeds."],
              ["autoGenerate", "Auto-generate safe content", "Verify each cluster first, then create an explainer or attributed brief."],
              ["autoPost", "Conditional auto-publish", "Publish only when verification and originality checks pass; exceptions go to review."],
            ].map(([key, label, help]) => (
              <label key={key} className="flex min-h-[4.75rem] items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:min-h-0 sm:p-4">
                <input type="checkbox" checked={options[key]} onChange={(event) => setOptions({ ...options, [key]: event.target.checked })} className="mt-0.5 h-5 w-5 shrink-0" />
                <span><span className="block text-sm font-black text-slate-800 sm:text-base sm:font-bold">{label}</span><span className="mt-0.5 block text-[0.68rem] leading-4 text-slate-500 sm:mt-1 sm:text-xs sm:leading-5">{help}</span></span>
              </label>
            ))}
          </div>

          <label className="mt-4 block text-xs font-black text-slate-700 sm:mt-5 sm:max-w-xs sm:text-sm sm:font-bold">
            Repeat interval (minutes)
            <input type="number" min="1" value={intervalMinutes} onChange={(event) => setIntervalMinutes(Math.max(1, Number(event.target.value)))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-900 sm:mt-2 sm:py-3" />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
            <button disabled={busy || status?.running} onClick={() => execute(() => startAutomation(options, intervalMinutes * 60))} className="order-2 min-h-12 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50 sm:order-1 sm:px-5 sm:text-sm sm:font-bold">
              Start Automation
            </button>
            <button disabled={busy || !status?.running} onClick={() => execute(stopAutomation)} className="order-3 min-h-12 rounded-xl bg-red-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50 sm:order-2 sm:px-5 sm:text-sm sm:font-bold">
              Stop Automation
            </button>
            <button disabled={busy || status?.pipelineRunning} onClick={() => execute(() => runAutomation(options), true)} className="order-1 col-span-2 min-h-12 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-50 sm:order-3 sm:font-bold">
              {status?.pipelineRunning ? "Pipeline Running..." : "Run Once"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
          <AutomationTimeline status={status} result={lastResult} options={options} />

          {lastResult && (
            <div className="mt-6 space-y-5">
              <div className={[
                "rounded-2xl border p-5",
                lastAttention
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50",
              ].join(" ")}>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Last completed run</p>
                    <h3 className="mt-2 text-xl font-black text-slate-950">
                      {lastAttention
                        ? `${lastSuccessful} successful / ${lastNeedsReview} in review / ${lastFailed} failed`
                        : `${lastSuccessful} processed successfully`}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {lastResult.finishedAt
                        ? new Date(lastResult.finishedAt).toLocaleString()
                        : "Completion time unavailable"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResultModal(lastResult)}
                    className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700 sm:w-auto"
                  >
                    View full result
                  </button>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/80">
                  <div
                    className={["h-full rounded-full", lastAttention ? "bg-amber-500" : "bg-emerald-600"].join(" ")}
                    style={{ width: `${lastSuccessRate}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-bold text-slate-600">{lastSuccessRate}% success rate</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {[
                  ["Attempted", lastAttempted, "text-slate-950"],
                  ["Successful", lastSuccessful, "text-emerald-700"],
                  ["Failed", lastFailed, lastFailed ? "text-red-700" : "text-slate-500"],
                  ["Published", lastResult.published || 0, "text-blue-700"],
                  ["Auto recovered", lastAutoRepairRecovered, "text-teal-700"],
                  ["SEO Ready", lastSeoReady, "text-emerald-700"],
                  ["Search pinged", lastSearchNotified, "text-indigo-700"],
                  ["Explainers", lastResult.explainersPublished || 0, "text-violet-700"],
                  ["Briefs", lastResult.attributedBriefsPublished || 0, "text-cyan-700"],
                  ["Fetched", lastResult.fetched || 0, "text-slate-950"],
                  ["Review", lastNeedsReview, lastNeedsReview ? "text-amber-700" : "text-slate-500"],
                  ["Generated", lastResult.generated || 0, "text-slate-950"],
                  ["Rejected", lastResult.rejected || 0, Number(lastResult.rejected) ? "text-red-700" : "text-slate-500"],
                ].map(([label, value, colour]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
                    <p className={["mt-1 text-2xl font-black", colour].join(" ")}>{value}</p>
                  </div>
                ))}
              </div>

              {lastResult.publishedItems?.length > 0 && (
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-600">
                    Published in the last run
                  </h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {lastResult.publishedItems.map((item) => (
                      <div key={item.articleId || item.clusterId} className="rounded-2xl border border-slate-200 p-4">
                        <p className="line-clamp-2 font-bold text-slate-950">{item.title || "Untitled article"}</p>
                        <p className="mt-2 text-xs font-bold capitalize text-slate-500">
                          {(item.editorialMode || "explainer").replaceAll("_", " ")} / confidence {item.confidence || 0}/100
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide">
                          {Number.isFinite(Number(item.seoScore)) && (
                            <span className={`rounded-full px-2 py-1 ${item.seoPassed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              SEO {item.seoScore}/100
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-1 ${item.searchNotified ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                            {item.searchNotified ? "Search notified" : item.indexNowStatus === "not_configured" ? "IndexNow setup needed" : "Sitemaps active"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={`/clusters/${item.clusterId}`}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            View cluster
                          </Link>
                          {item.slug && (
                            <a
                              href={item.articleUrl || `https://contextra.netlify.app/article/${item.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              View article
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
              {lastResult?.reviewItems?.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-black text-amber-950">Exceptions waiting for review</h3>
                      <p className="mt-1 text-sm text-amber-800">Only sensitive, uncertain, source-policy, similarity, or delivery issues are stopped here.</p>
                    </div>
                    <Link href="/review" className="rounded-xl bg-amber-700 px-4 py-2 text-center text-sm font-bold text-white">Open Review Queue</Link>
                  </div>
                </div>
              )}

              {lastResult?.rejectedItems?.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-black text-slate-950">Automatically rejected</h3>
                  <p className="mt-1 text-sm text-slate-600">These items were too old, invalid, or blocked by source policy, so no AI cost was used.</p>
                </div>
              )}

          <details className="mt-6 rounded-2xl border border-slate-200 bg-slate-50">
            <summary className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-sm font-black text-slate-800 sm:px-5">
              <span>Technical activity log</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] uppercase tracking-wide text-slate-500">{status?.logs?.length || 0} events</span>
            </summary>
            <div className="max-h-80 space-y-2 overflow-auto border-t border-slate-200 p-3 sm:p-4">
              {(status?.logs || []).slice().reverse().map((entry, index) => (
                <div key={`${entry.time}-${index}`} className="rounded-xl bg-white px-4 py-3 text-sm">
                  <span className="mr-3 text-slate-400">{new Date(entry.time).toLocaleString()}</span>
                  <span className="font-medium text-slate-700">{entry.message}</span>
                </div>
              ))}
              {!status?.logs?.length && <p className="text-sm text-slate-500">No technical activity has been recorded yet.</p>}
            </div>
          </details>
        </section>
      </div>
      </main>
    </>
  );
}

"use client";

import Link from "next/link";

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export default function AutomationResultModal({ result, onClose }) {
  if (!result) return null;

  const attempted = Number(result.attempted || 0);
  const successful = Number(result.successful || 0);
  const failed = Number(result.failed ?? result.errors?.length ?? 0);
  const published = Number(result.published || 0);
  const explainers = Number(result.explainersPublished || 0);
  const briefs = Number(result.attributedBriefsPublished || 0);
  const rejected = Number(result.rejected || 0);
  const needsReview = Number(result.needsReview ?? result.reviewItems?.length ?? 0);
  const seoReady = Number(result.seoReady || 0);
  const searchNotified = Number(result.searchNotified || 0);
  const autoRecovered = Number(result.autoRepairRecovered || 0);
  const successRate = attempted ? Math.round((successful / attempted) * 100) : 100;
  const isSuccessful = failed === 0 && needsReview === 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="automation-result-title"
        className="max-h-[92dvh] w-full max-w-2xl overflow-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className={[
          "border-b p-5 sm:p-6",
          isSuccessful
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50",
        ].join(" ")}>
          <div className={[
            "inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
            isSuccessful
              ? "bg-emerald-600 text-white"
              : "bg-amber-500 text-white",
          ].join(" ")}>
            {isSuccessful ? "Run completed" : "Completed with issues"}
          </div>
          <h2 id="automation-result-title" className="mt-4 text-2xl font-black text-slate-950">
            {published} article{published === 1 ? "" : "s"} published
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Finished {formatDate(result.finishedAt)} / {successRate}% success rate
          </p>
        </div>

        <div className="space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Attempted", attempted, "text-slate-950"],
              ["Published", published, "text-blue-700"],
              ["Auto recovered", autoRecovered, "text-teal-700"],
              ["SEO Ready", seoReady, "text-emerald-700"],
              ["Search pinged", searchNotified, "text-indigo-700"],
              ["Explainers", explainers, "text-violet-700"],
              ["Briefs", briefs, "text-cyan-700"],
              ["Review", needsReview, needsReview ? "text-amber-700" : "text-slate-500"],
              ["Rejected", rejected, rejected ? "text-red-700" : "text-slate-500"],
              ["Processed", successful, "text-emerald-700"],
              ["Failed", failed, failed ? "text-red-700" : "text-slate-500"],
            ].map(([label, value, colour]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className={["mt-1 text-3xl font-black", colour].join(" ")}>{value}</p>
              </div>
            ))}
          </div>

          {result.publishedItems?.length > 0 && (
            <section>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-600">
                Published in this run
              </h3>
              <div className="mt-3 space-y-3">
                {result.publishedItems.map((item) => (
                  <div key={item.articleId || item.clusterId} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-bold text-slate-950">{item.title || "Untitled article"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Article ID: {item.articleId || "Not returned"}
                    </p>
                    <p className="mt-1 text-xs font-bold capitalize text-slate-600">
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
                    {item.duplicate && (
                      <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                        Existing record reused
                      </span>
                    )}
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
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
                        >
                          View published article
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {result.reviewItems?.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-amber-950">Moved to Review Queue</h3>
                <Link href="/review" className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white">
                  Open queue
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {result.reviewItems.slice(0, 5).map((item) => (
                  <Link key={item.clusterId} href={`/clusters/${item.clusterId}`} className="block rounded-xl bg-white/80 p-3 hover:bg-white">
                    <p className="text-sm font-bold text-slate-950">{item.title || "Untitled story"}</p>
                    <p className="mt-1 text-xs font-semibold capitalize text-amber-800">{item.stage || "content"} review</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {result.errors?.length > 0 && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <h3 className="font-black text-red-900">Items needing attention</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-red-800">
                {result.errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </section>
          )}

          {!result.publishedItems?.length && !result.reviewItems?.length && !result.errors?.length && (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              The run completed successfully, but there were no new articles ready to publish.
            </p>
          )}

          <div className="grid gap-3 sm:flex sm:justify-end">
            <Link href="/review" className="rounded-xl border border-slate-300 px-6 py-3 text-center text-sm font-bold text-slate-800 hover:bg-slate-50">
              Review Queue
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

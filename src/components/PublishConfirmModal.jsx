export default function PublishConfirmModal({ status, title, safetyReport, onCancel, onConfirm }) {
  if (!status) return null;
  const isPublished = status === "published";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="publish-dialog-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className={["inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", isPublished ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"].join(" ")}>
          {isPublished ? "Public article" : "Draft article"}
        </div>
        <h2 id="publish-dialog-title" className="mt-4 text-2xl font-black text-slate-950">
          {isPublished ? "Post directly to the main site?" : "Send to the main site as a draft?"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {isPublished
            ? "This reviewed article will be saved as Published and may become visible to readers immediately."
            : "This reviewed article will be saved as Draft. You can review and publish it later from the main-site admin panel."}
        </p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Article</p>
          <p className="mt-1 line-clamp-2 font-bold text-slate-900">{title}</p>
        </div>
        {safetyReport?.passed && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-black text-emerald-800">Publication safety checks passed</p>
            <p className="mt-1 text-xs text-emerald-700">
              Source similarity {Math.round((safetyReport.metrics?.maximumSourceSimilarity || 0) * 100)}% / Longest quotation {safetyReport.metrics?.longestQuotationWords || 0} words
            </p>
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={onConfirm} className={["rounded-xl px-5 py-3 text-sm font-bold text-white transition", isPublished ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"].join(" ")}>
            {isPublished ? "Yes, Post Directly" : "Yes, Save as Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

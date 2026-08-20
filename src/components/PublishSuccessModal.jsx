"use client";

export default function PublishSuccessModal({ publication, onClose }) {
  if (!publication) return null;

  const isPublished = publication.status === "published";
  const canViewPublicly = isPublished && publication.slug;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-success-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className={[
          "border-b p-5 sm:p-6",
          isPublished
            ? "border-emerald-200 bg-emerald-50"
            : "border-blue-200 bg-blue-50",
        ].join(" ")}>
          <div className={[
            "flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black text-white",
            isPublished ? "bg-emerald-600" : "bg-blue-600",
          ].join(" ")}>
            OK
          </div>
          <p className={[
            "mt-4 text-xs font-black uppercase tracking-[0.16em]",
            isPublished ? "text-emerald-700" : "text-blue-700",
          ].join(" ")}>
            {isPublished ? "Published successfully" : "Draft saved successfully"}
          </p>
          <h2 id="publish-success-title" className="mt-2 text-2xl font-black text-slate-950">
            {publication.title || "Article completed"}
          </h2>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <p className="text-sm leading-6 text-slate-600">
            {isPublished
              ? "The article is now stored as Published on the main site."
              : "The article is stored as Draft and remains hidden from public readers until it is published."}
          </p>

          <dl className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-bold text-slate-500">Status</dt>
              <dd className="mt-1 font-black capitalize text-slate-900">{publication.status}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">Article ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-800">
                {publication.articleId || "Not returned"}
              </dd>
            </div>
          </dl>

          {publication.duplicate && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              Duplicate protection reused the existing article record instead of creating another copy.
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            {canViewPublicly && (
              <a
                href={`https://contextra.netlify.app/article/${publication.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-emerald-700"
              >
                View on main site
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

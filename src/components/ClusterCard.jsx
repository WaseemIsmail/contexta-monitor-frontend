import Link from "next/link";

function formatPublishedDate(value) {
  if (!value) return "";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return value;
  }
}

export default function ClusterCard({ cluster }) {
  const status = cluster.status || "new";
  const statusColor =
    ["used", "published"].includes(status)
      ? "bg-emerald-50 text-emerald-700"
      : status === "needs_review"
      ? "bg-red-50 text-red-700"
      : status === "review_ready"
      ? "bg-violet-50 text-violet-700"
      : status === "generated"
      ? "bg-blue-50 text-blue-700"
      : "bg-amber-50 text-amber-700";
  const statusBorder =
    ["used", "published"].includes(status)
      ? "border-l-emerald-500"
      : status === "needs_review"
      ? "border-l-red-500"
      : status === "review_ready"
      ? "border-l-violet-500"
      : status === "generated"
      ? "border-l-blue-500"
      : "border-l-amber-500";
  const statusLabel = status.replaceAll("_", " ");
  const sourceCount = Number(cluster.sourceCount || 1);
  const actionLabel = status === "needs_review"
    ? "Review issue"
    : status === "review_ready"
    ? "Generate reviewed story"
    : status === "generated"
    ? "Review generated content"
    : ["published", "used"].includes(status)
    ? "View completed story"
    : "Generate this story";

  const publishedDate =
    formatPublishedDate(cluster.latestPublishedAt) ||
    formatPublishedDate(cluster.firstPublishedAt);

  const fetchedDate =
    formatPublishedDate(cluster.createdAt) ||
    formatPublishedDate(cluster.updatedAt);

  return (
    <article className={`group flex h-full min-w-0 flex-col rounded-3xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl sm:p-5 ${statusBorder}`}>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {cluster.category || "world"}
        </span>

        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
          {cluster.scope || "world"}
        </span>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}
        >
          {statusLabel}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {sourceCount} {sourceCount === 1 ? "source" : "sources"}
        </span>
      </div>

      <h2 className="text-lg font-black leading-7 text-slate-950">
        <Link href={`/clusters/${cluster.id}`} className="transition group-hover:text-amber-700">
          {cluster.clusterTitle || "Untitled cluster"}
        </Link>
      </h2>

      {cluster.commonSummary && (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {cluster.commonSummary}
        </p>
      )}

      <div className="mt-4 space-y-1.5 text-xs font-medium leading-5 text-slate-500">
        {cluster.sourceNames?.length > 0 && (
          <p className="line-clamp-2"><span className="font-bold text-slate-700">Sources:</span> {cluster.sourceNames.join(", ")}</p>
        )}

        {publishedDate && <p><span className="font-bold text-slate-700">Published:</span> {publishedDate}</p>}
        {fetchedDate && <p><span className="font-bold text-slate-700">Fetched:</span> {fetchedDate}</p>}
      </div>

      <div className="mt-auto pt-6">
        <Link
          href={`/clusters/${cluster.id}`}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-amber-400 hover:text-slate-950 sm:w-auto"
        >
          {actionLabel} <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </article>
  );
}

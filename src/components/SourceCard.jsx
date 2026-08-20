function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SourceCard({ source }) {
  const sourceName = source.sourceName || source.name || "Unnamed source";
  return (
    <article className="group flex h-full min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl sm:p-5">
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {sourceName}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {source.category || "general"}
        </span>

        {source.scope && (
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
            {source.scope}
          </span>
        )}
      </div>

      <h3 className="text-lg font-black leading-7 text-slate-950">
        {source.title || sourceName}
      </h3>

      {source.summary && (
        <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">
          {source.summary}
        </p>
      )}

      <div className="mt-3 space-y-1 text-xs font-medium text-slate-500">
        {source.publishedAt && (
          <p>Published: {formatDateTime(source.publishedAt)}</p>
        )}
        {(source.fetchedAt || source.createdAt) && (
          <p>Fetched: {formatDateTime(source.fetchedAt || source.createdAt)}</p>
        )}
      </div>

      {source.rssUrl && (
        <p className="mt-3 line-clamp-2 break-all rounded-xl bg-slate-50 p-3 font-mono text-[0.68rem] leading-5 text-slate-500" title={source.rssUrl}>{source.rssUrl}</p>
      )}

      {source.sourceUrl && (
        <a
          href={source.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 pt-2.5 text-sm font-black text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
        >
          Open source <span aria-hidden="true">↗</span>
        </a>
      )}
    </article>
  );
}

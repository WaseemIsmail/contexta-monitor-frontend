const STAGES = [
  {
    key: "sources",
    title: "Find RSS sources",
    description: "Read the active feed list and prepare trusted publishers.",
    icon: "rss",
  },
  {
    key: "fetch",
    title: "Fetch news",
    description: "Collect fresh titles, summaries, dates, and source links.",
    icon: "fetch",
  },
  {
    key: "cluster",
    title: "Group stories",
    description: "Combine reports covering the same event into one cluster.",
    icon: "cluster",
  },
  {
    key: "safety",
    title: "Check sources",
    description: "Apply source policy, freshness, and editorial verification.",
    icon: "shield",
  },
  {
    key: "generate",
    title: "Generate content",
    description: "Create an original explainer or clearly attributed brief.",
    icon: "spark",
  },
  {
    key: "validate",
    title: "Validate & review",
    description: "Check originality, required fields, and publication safety.",
    icon: "check",
  },
  {
    key: "publish",
    title: "Publish & distribute",
    description: "Send approved stories to Contextra with SEO metadata.",
    icon: "send",
  },
];

const STATE_STYLES = {
  waiting: {
    label: "Waiting",
    node: "border-white/15 bg-slate-800 text-slate-400",
    card: "border-white/10 bg-white/[0.035]",
    badge: "bg-white/5 text-slate-400",
    line: "bg-slate-700",
  },
  running: {
    label: "In progress",
    node: "border-blue-300 bg-blue-500 text-white shadow-lg shadow-blue-500/30",
    card: "border-blue-400/50 bg-blue-400/10",
    badge: "bg-blue-400/15 text-blue-200",
    line: "bg-blue-400",
  },
  complete: {
    label: "Completed",
    node: "border-emerald-300 bg-emerald-500 text-white",
    card: "border-emerald-400/25 bg-emerald-400/[0.07]",
    badge: "bg-emerald-400/15 text-emerald-200",
    line: "bg-emerald-500",
  },
  attention: {
    label: "Needs review",
    node: "border-amber-200 bg-amber-400 text-slate-950",
    card: "border-amber-300/40 bg-amber-400/10",
    badge: "bg-amber-400/15 text-amber-200",
    line: "bg-amber-400",
  },
  failed: {
    label: "Failed",
    node: "border-red-200 bg-red-500 text-white",
    card: "border-red-300/40 bg-red-400/10",
    badge: "bg-red-400/15 text-red-200",
    line: "bg-red-500",
  },
  skipped: {
    label: "Skipped",
    node: "border-white/15 bg-slate-800 text-slate-500",
    card: "border-dashed border-white/10 bg-transparent",
    badge: "bg-white/5 text-slate-500",
    line: "bg-slate-700",
  },
};

function StageIcon({ name }) {
  const paths = {
    rss: <><path d="M5 16a3 3 0 0 1 3 3"/><path d="M5 11a8 8 0 0 1 8 8"/><path d="M5 6a13 13 0 0 1 13 13"/><circle cx="5" cy="19" r="1" fill="currentColor" stroke="none"/></>,
    fetch: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></>,
    cluster: <><rect x="3.5" y="4" width="7" height="6" rx="1.5"/><rect x="13.5" y="4" width="7" height="6" rx="1.5"/><rect x="8.5" y="14" width="7" height="6" rx="1.5"/><path d="M7 10v2h10v-2M12 12v2"/></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    spark: <><path d="m12 3 1.2 4.3L17.5 9l-4.3 1.7L12 15l-1.2-4.3L6.5 9l4.3-1.7L12 3Z"/><path d="m18.5 15 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z"/></>,
    check: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h4"/><path d="m13 16 2 2 4-4"/></>,
    send: <><path d="m3 11 18-8-8 18-2-8-8-2Z"/><path d="m11 13 5-5"/></>,
  };

  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function currentStageIndex(logs) {
  const startIndex = logs.map((entry) => entry.message).lastIndexOf("Pipeline started");
  const currentRun = startIndex >= 0 ? logs.slice(startIndex) : [];
  const latest = String(currentRun.at(-1)?.message || "").toLowerCase();

  if (!latest || latest.includes("pipeline started") || latest.includes("automation started")) return 0;
  if (latest.includes("fetched") && latest.includes("clustered")) return 3;
  if (latest.includes("generated")) return 5;
  if (latest.includes("published") || latest.includes("saved cluster")) return 6;
  if (latest.includes("queued") || latest.includes("rejected")) return 5;
  if (latest.includes("failed") || latest.includes("error")) return 5;
  return 3;
}

function stageMetric(stage, result, options) {
  if (!result) return "Not run yet";

  const metrics = {
    sources: options.autoFetch ? "Feed list checked" : "Manual source mode",
    fetch: `${Number(result.fetched || 0)} items fetched`,
    cluster: `${Number(result.clustered || 0)} new clusters`,
    safety: `${Number(result.sourceScreened || 0)} clusters checked`,
    generate: `${Number(result.generated || 0)} drafts generated`,
    validate: `${Number(result.validated || 0)} passed / ${Number(result.needsReview || 0)} review`,
    publish: `${Number(result.published || 0)} published / ${Number(result.seoReady || 0)} SEO ready`,
  };
  return metrics[stage.key];
}

function completedStageState(stage, result, options) {
  if (!result?.finishedAt) return "waiting";
  if (!options.autoFetch && ["sources", "fetch", "cluster"].includes(stage.key)) return "skipped";
  if (!options.autoGenerate && ["safety", "generate", "validate", "publish"].includes(stage.key)) return "skipped";
  if (!options.autoPost && stage.key === "publish") return "skipped";
  if (stage.key === "validate" && Number(result.needsReview || 0) > 0) return "attention";
  if (stage.key === "publish" && Number(result.failed || 0) > 0) return "failed";
  return "complete";
}

export default function AutomationTimeline({ status, result, options }) {
  const logs = status?.logs || [];
  const pipelineRunning = Boolean(status?.pipelineRunning);
  const activeIndex = pipelineRunning ? currentStageIndex(logs) : -1;
  const latestActivity = logs.at(-1);

  const stageStates = STAGES.map((stage, index) => {
    if (pipelineRunning) {
      if (!options.autoFetch && ["sources", "fetch", "cluster"].includes(stage.key)) return "skipped";
      if (!options.autoGenerate && ["safety", "generate", "validate", "publish"].includes(stage.key)) return "skipped";
      if (!options.autoPost && stage.key === "publish") return "skipped";
      if (index < activeIndex) return "complete";
      if (index === activeIndex) return "running";
      return "waiting";
    }
    return completedStageState(stage, result, options);
  });

  const completedCount = stageStates.filter((state) => state === "complete" || state === "attention" || state === "failed" || state === "skipped").length;
  const progress = pipelineRunning
    ? Math.max(8, Math.round(((activeIndex + 0.5) / STAGES.length) * 100))
    : result?.finishedAt ? 100 : 0;

  return (
    <div className="overflow-hidden rounded-[2rem] bg-slate-950 p-4 text-white shadow-xl shadow-slate-950/10 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Automation journey</p>
          <h2 className="mt-2 text-2xl font-black">From RSS feed to published story</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Follow every decision in plain language. Items that need a human decision leave the main path and move safely to Review.</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${pipelineRunning ? "bg-blue-400/15 text-blue-200" : status?.running ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-slate-300"}`}>
          <span className={`h-2 w-2 rounded-full ${pipelineRunning ? "animate-pulse bg-blue-400" : status?.running ? "bg-emerald-400" : "bg-slate-500"}`} />
          {pipelineRunning ? "Processing now" : status?.running ? "Waiting for next run" : "Automation stopped"}
        </span>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10" aria-label={`${progress}% pipeline progress`}>
        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-amber-400 transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[0.68rem] font-bold uppercase tracking-wide text-slate-500">
        <span>{pipelineRunning ? `Stage ${activeIndex + 1} of ${STAGES.length}` : `${completedCount} stages recorded`}</span>
        <span>{progress}%</span>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-7">
        {STAGES.map((stage, index) => {
          const state = stageStates[index];
          const styles = STATE_STYLES[state];
          return (
            <article key={stage.key} className={`relative flex min-w-0 gap-4 rounded-2xl border p-4 transition lg:block lg:p-3 ${styles.card}`}>
              {index < STAGES.length - 1 && <span className={`absolute bottom-[-0.85rem] left-[1.9rem] top-14 w-0.5 lg:bottom-auto lg:left-[calc(50%+1.75rem)] lg:right-[-50%] lg:top-8 lg:h-0.5 lg:w-auto ${styles.line}`} aria-hidden="true" />}
              <div className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border lg:mx-auto ${styles.node} ${state === "running" ? "animate-pulse" : ""}`}>
                {state === "complete" ? <span className="text-lg font-black">✓</span> : <StageIcon name={stage.icon} />}
              </div>
              <div className="min-w-0 lg:mt-4 lg:text-center">
                <div className="flex flex-wrap items-center gap-2 lg:block">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-slate-500">Step {index + 1}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-wide lg:mt-2 lg:inline-flex ${styles.badge}`}>{styles.label}</span>
                </div>
                <h3 className="mt-2 text-sm font-black text-white">{stage.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400 lg:min-h-20">{stage.description}</p>
                <p className="mt-2 text-xs font-black text-slate-200">{stageMetric(stage, result, options)}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="font-black uppercase tracking-[0.12em] text-slate-500">Latest activity</span>
        <span className="font-semibold text-slate-200">{latestActivity?.message || "The first pipeline run has not started yet."}</span>
      </div>
    </div>
  );
}

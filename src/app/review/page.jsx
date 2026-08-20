"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  approveReviewSource,
  approveReviewVerification,
  generateContent,
  getReviewQueue,
  rejectReviewItem,
} from "@/services/monitorApi";


const TABS = [
  { value: "active", label: "Needs review" },
  { value: "ready", label: "Ready for automation" },
  { value: "resolved", label: "Resolved history" },
];

const STAGES = {
  source: {
    label: "Source usage",
    colour: "border-violet-200 bg-violet-50 text-violet-800",
    help: "Record how this source may be used. Facts with attribution does not claim a licence to copy source text or images.",
  },
  verification: {
    label: "High-risk verification",
    colour: "border-red-200 bg-red-50 text-red-800",
    help: "This story contains sensitive, conflicting, stale, or low-confidence information and needs an editorial decision.",
  },
  content: {
    label: "Content safety",
    colour: "border-amber-200 bg-amber-50 text-amber-800",
    help: "Edit or regenerate the article, then run the publication check again.",
  },
  platform: {
    label: "Platform validation",
    colour: "border-red-200 bg-red-50 text-red-800",
    help: "Review the required article fields, then retry delivery to the main site.",
  },
};

const USAGE_OPTIONS = [
  { value: "facts_and_attribution", label: "Facts with attribution", help: "Use only independently written facts from RSS metadata and link to the publisher." },
  { value: "official_public_source", label: "Official / primary source", help: "The link is an authoritative public or primary record." },
  { value: "licensed", label: "Licensed", help: "Contextra has a valid licence covering this use." },
  { value: "creative_commons", label: "Creative Commons", help: "The specific material has a compatible Creative Commons licence." },
  { value: "public_domain", label: "Public domain", help: "The specific material is confirmed to be public domain." },
  { value: "written_permission", label: "Written permission", help: "The rights holder supplied written permission for this use." },
];

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function RejectModal({ item, busy, onCancel, onConfirm }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
          Archive review item
        </span>
        <h2 className="mt-4 text-2xl font-black text-slate-950">Remove this story from the workflow?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The record will be archived, not deleted. It will leave the active queue and will not be generated or published.
        </p>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-900">
          {item.clusterTitle || "Untitled story"}
        </p>
        <div className="mt-6 grid gap-3 sm:flex sm:justify-end">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 disabled:opacity-50">
            Keep in review
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "Archiving..." : "Archive item"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewQueuePage() {
  const router = useRouter();
  const [state, setState] = useState("active");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewer, setReviewer] = useState("Contextra editor");
  const [notes, setNotes] = useState({});
  const [usageBasis, setUsageBasis] = useState({});
  const [rejecting, setRejecting] = useState(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getReviewQueue(state);
      setItems(result.items || []);
    } catch (err) {
      setError(err.message || "Failed to load the review queue");
    } finally {
      setLoading(false);
    }
  }, [state]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (loading || !window.location.hash.startsWith("#review-")) return;
    const target = document.getElementById(window.location.hash.slice(1));
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [items, loading]);

  async function approveSource(item) {
    const reviewReason = (notes[item.id] || "").trim();
    const selectedUsage = usageBasis[item.id] || "facts_and_attribution";
    if (!reviewer.trim()) {
      setError("Enter the reviewer name before recording source usage.");
      return;
    }
    if (!reviewReason) {
      setError("Enter a short reason for this source-use decision.");
      return;
    }

    setBusyId(item.id);
    setError("");
    setMessage("");
    try {
      await approveReviewSource(item.id, {
        usageBasis: selectedUsage,
        reviewer: reviewer.trim(),
        notes: reviewReason,
      });
      setMessage("Source usage recorded. The item is now Ready for automation.");
      setState("ready");
    } catch (err) {
      setError(err.message || "Could not approve the source");
    } finally {
      setBusyId("");
    }
  }

  async function approveVerification(item) {
    const reviewReason = (notes[item.id] || "").trim();
    if (!reviewer.trim()) {
      setError("Enter the reviewer name before approving this verification exception.");
      return;
    }
    if (!reviewReason) {
      setError("Describe which facts you checked and why the story may continue.");
      return;
    }

    setBusyId(item.id);
    setError("");
    setMessage("");
    try {
      await approveReviewVerification(item.id, {
        reviewer: reviewer.trim(),
        notes: reviewReason,
      });
      setMessage("Verification exception approved. The item is now Ready for automation.");
      setState("ready");
    } catch (err) {
      setError(err.message || "Could not approve the verification exception");
    } finally {
      setBusyId("");
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    setError("");
    setMessage("");
    try {
      await rejectReviewItem(rejecting.id, {
        reviewer: reviewer.trim() || "Contextra editor",
        notes: notes[rejecting.id] || "Rejected during editorial review.",
      });
      setMessage("Review item archived. It will not be processed by automation.");
      setRejecting(null);
      await loadQueue();
    } catch (err) {
      setError(err.message || "Could not archive the review item");
    } finally {
      setBusyId("");
    }
  }

  async function generateReviewedContent(item) {
    setBusyId(item.id);
    setError("");
    setMessage("");
    try {
      await generateContent(item.id);
      setMessage("Reviewed content generated successfully. Opening the editable article fields...");
      router.push(`/clusters/${item.id}#generated-output`);
    } catch (err) {
      setError(err.message || "The review was saved, but content generation failed.");
      try {
        await loadQueue();
      } catch {
        // Keep the generation error visible when refreshing the queue also fails.
      }
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <RejectModal item={rejecting} busy={busyId === rejecting?.id} onCancel={() => setRejecting(null)} onConfirm={confirmReject} />
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Editorial safety</p>
              <h1 className="mt-2 text-3xl font-black">Review Queue</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Only exceptions arrive here: sensitive claims, unknown sources, content similarity, and delivery failures. Clean stories continue automatically.
              </p>
            </div>
            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <Link href="/automation" className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-emerald-500">Automation</Link>
              <Link href="/dashboard" className="rounded-xl border border-slate-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800">Dashboard</Link>
            </div>
          </div>
        </header>

        <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <label className="text-sm font-black text-slate-800">
                Reviewer name
                <input value={reviewer} onChange={(event) => setReviewer(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-slate-900 sm:min-w-72" />
              </label>
              <p className="mt-2 text-xs text-slate-500">Saved with approvals and rejections for audit history.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
              {loading ? "Loading..." : `${items.length} item${items.length === 1 ? "" : "s"}`}
            </span>
          </div>

          <div className="monitor-no-scrollbar mt-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-4">
            {TABS.map((tab) => (
              <button key={tab.value} type="button" onClick={() => setState(tab.value)} className={["shrink-0 rounded-xl px-4 py-2 text-sm font-bold", state === tab.value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"].join(" ")}>
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {message && <div role="status" aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</div>}
        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div>}

        {!loading && items.map((item) => {
          const report = item.publicationSafety || item.automationVerification || item.sourceScreening || {};
          const sourceLinks = item.sourceScreening?.sources || [];
          const restrictionStatus = item.sourceRestrictionStatus || (
            item.sourceRightsConfirmed
              ? "approved"
              : report.restrictedSources?.length
              ? "pending"
              : "not_required"
          );
          const effectiveReviewStage = restrictionStatus === "pending" ? "source" : item.reviewStage;
          const stage = STAGES[effectiveReviewStage] || STAGES.content;
          return (
            <article id={`review-${item.id}`} key={item.id} className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm target:border-violet-400 target:ring-4 target:ring-violet-100 sm:p-6">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className={["rounded-full border px-3 py-1 text-xs font-black", stage.colour].join(" ")}>{stage.label}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{item.status || "needs_review"}</span>
                    <span className={[
                      "rounded-full px-3 py-1 text-xs font-black",
                      restrictionStatus === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : restrictionStatus === "pending"
                        ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-600",
                    ].join(" ")}>
                      {restrictionStatus === "approved"
                        ? "Restriction: Approved"
                        : restrictionStatus === "pending"
                        ? "Restriction: Pending"
                        : "Restriction: Not required"}
                    </span>
                    {item.sourceNames?.map((name) => <span key={name} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{name}</span>)}
                  </div>
                  <h2 className="mt-4 text-xl font-black leading-7 text-slate-950">{item.clusterTitle || "Untitled story"}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{stage.help}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">Updated {formatDate(item.reviewUpdatedAt || item.updatedAt)}</p>
                </div>
                {state === "active" && restrictionStatus === "pending" ? (
                  <a href={`#approval-${item.id}`} className="w-full shrink-0 rounded-xl bg-violet-700 px-5 py-3 text-center text-sm font-bold text-white hover:bg-violet-600 sm:w-auto">
                    Continue to source verification
                  </a>
                ) : state === "ready" ? (
                  <div className="grid w-full shrink-0 gap-2 sm:flex sm:w-auto">
                    <button
                      type="button"
                      onClick={() => generateReviewedContent(item)}
                      disabled={busyId === item.id}
                      className="rounded-xl bg-emerald-700 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
                    >
                      {busyId === item.id ? "Generating content..." : "Generate content now"}
                    </button>
                    <Link href={`/clusters/${item.id}`} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50">
                      Open cluster
                    </Link>
                  </div>
                ) : (
                  <Link href={`/clusters/${item.id}`} className="w-full shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-700 sm:w-auto">
                    {state === "active" ? "Review and edit content" : "View cluster"}
                  </Link>
                )}
              </div>

              {item.reviewReasons?.length > 0 && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-black text-amber-950">Why this needs attention</p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-900">
                    {item.reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
              )}

              {(restrictionStatus === "approved" || item.sourceUsageReviewedAt) && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-black">Source-use decision recorded</p>
                  <p className="mt-1">
                    Reviewed by {item.sourceUsageReviewedBy || item.sourceRightsReviewedBy || item.reviewer || "Monitor reviewer"}
                    {item.sourceUsageReviewedAt || item.sourceRightsReviewedAt ? ` on ${formatDate(item.sourceUsageReviewedAt || item.sourceRightsReviewedAt)}` : ""}.
                  </p>
                  <p className="mt-2 font-bold capitalize">Basis: {(item.sourceUsageBasis || "facts_and_attribution").replaceAll("_", " ")}</p>
                  {(item.sourceUsageReviewNotes || item.sourceRightsReviewNotes) && <p className="mt-2">{item.sourceUsageReviewNotes || item.sourceRightsReviewNotes}</p>}
                </div>
              )}

              {report.metrics && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="block text-xs font-bold text-slate-500">Source similarity</span><strong>{Math.round((report.metrics.maximumSourceSimilarity || 0) * 100)}%</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="block text-xs font-bold text-slate-500">Shared phrase</span><strong>{report.metrics.longestSourcePhraseWords || 0} words</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="block text-xs font-bold text-slate-500">Longest quote</span><strong>{report.metrics.longestQuotationWords || 0} words</strong></div>
                </div>
              )}

              {sourceLinks.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {sourceLinks.map((source, index) => source.url && (
                    <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                      Open {source.name || "source"}
                    </a>
                  ))}
                </div>
              )}

              {state === "active" && effectiveReviewStage === "source" && (
                <div id={`approval-${item.id}`} className="scroll-mt-6 mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 target:border-violet-500 target:ring-4 target:ring-violet-100 sm:p-5">
                  <p className="mb-4 text-sm font-black text-violet-950">Record the source usage basis</p>
                  <label className="block text-sm font-black text-violet-950">
                    Usage basis
                    <select
                      value={usageBasis[item.id] || "facts_and_attribution"}
                      onChange={(event) => setUsageBasis((current) => ({ ...current, [item.id]: event.target.value }))}
                      className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-violet-500"
                    >
                      {USAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <p className="mt-2 text-xs leading-5 text-violet-700">
                    {USAGE_OPTIONS.find((option) => option.value === (usageBasis[item.id] || "facts_and_attribution"))?.help}
                  </p>
                  <label className="mt-4 block text-sm font-black text-violet-950">
                    Decision note <span className="text-red-600">*</span>
                    <textarea value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Example: Use only reported facts, write fresh wording, show attribution, and do not reuse images." rows={3} className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-violet-500" />
                  </label>
                  <p className="mt-2 text-xs leading-5 text-violet-700">The selected basis, note, reviewer, and time are stored in the audit history.</p>
                  <button type="button" disabled={!(notes[item.id] || "").trim() || busyId === item.id} onClick={() => approveSource(item)} className="mt-4 w-full rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                    {busyId === item.id ? "Saving decision..." : "Save decision and move to Ready"}
                  </button>
                </div>
              )}

              {state === "active" && effectiveReviewStage === "verification" && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
                  <p className="text-sm font-black text-red-950">Approve only after checking the sensitive or uncertain facts</p>
                  <p className="mt-2 text-xs leading-5 text-red-800">
                    This records an editorial override; it does not bypass originality, quotation, image-rights, or platform safety checks.
                  </p>
                  <label className="mt-4 block text-sm font-black text-red-950">
                    What did you verify? <span className="text-red-600">*</span>
                    <textarea value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Example: Checked the casualty figure and date against the linked source; attribution and cautious wording are required." rows={3} className="mt-2 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-red-500" />
                  </label>
                  <button type="button" disabled={!(notes[item.id] || "").trim() || busyId === item.id} onClick={() => approveVerification(item)} className="mt-4 w-full rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                    {busyId === item.id ? "Saving verification..." : "Approve exception and move to Ready"}
                  </button>
                </div>
              )}

              {state === "ready" && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                  Human review is complete. Generate the content now for manual editing, or leave it here for the next automation run.
                </div>
              )}

              {state === "resolved" && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <strong className="capitalize">{String(item.reviewResolution || "resolved").replaceAll("_", " ")}</strong>
                  {item.reviewer && <span> by {item.reviewer}</span>}
                  {item.reviewNotes && <p className="mt-2 text-slate-600">{item.reviewNotes}</p>}
                </div>
              )}

              {state === "active" && (
                <div className="mt-5 flex justify-end">
                  <button type="button" disabled={busyId === item.id} onClick={() => setRejecting(item)} className="w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 sm:w-auto">Archive / reject</button>
                </div>
              )}
            </article>
          );
        })}

        {!loading && items.length === 0 && (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">OK</div>
            <h2 className="mt-4 text-xl font-black text-slate-950">Nothing in this queue</h2>
            <p className="mt-2 text-sm text-slate-600">Clean articles can continue through automation without manual intervention.</p>
          </section>
        )}
      </div>
    </main>
  );
}

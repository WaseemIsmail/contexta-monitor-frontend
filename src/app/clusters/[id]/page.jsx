"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import GeneratedFieldBox from "@/components/GeneratedFieldBox";
import SourceCard from "@/components/SourceCard";
import CopyButton from "@/components/CopyButton";
import PublishSuccessModal from "@/components/PublishSuccessModal";
import PublishConfirmModal from "@/components/PublishConfirmModal";
import {
  generateContent,
  getClusterById,
  markClusterUsed,
  validateArticleForPublish,
  publishArticle,
} from "@/services/monitorApi";

const APP_1_FIELDS = [
  "title",
  "summary",
  "content",
  "ourView",
  "category",
  "image",
  "author",
  "featured",
  "status",
  "showOnHomepage",
  "homepageOrder",
  "pollId",
  "tags",
];

const EXTRA_FIELDS = [
  "imagePrompt",
  "imageAltText",
  "seoTitle",
  "metaDescription",
  "sourceName",
  "sourceUrls",
  "sourceNote",
  "sourceRightsConfirmed",
  "imageRightsConfirmed",
  "copyrightReviewConfirmed",
  "socialCaption",
  "focusKeyword",
  "relatedKeywords",
];

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

function formatCopyValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2);
  }

  return String(value ?? "");
}

function formatCopyLabel(key) {
  const labels = {
    title: "Title",
    summary: "Summary",
    content: "Content",
    ourView: "Impact Analysis",
    category: "Category",
    image: "Image URL",
    author: "Author",
    featured: "Featured",
    status: "Status",
    showOnHomepage: "Show On Homepage",
    homepageOrder: "Homepage Order",
    pollId: "Poll ID",
    tags: "Tags",
    imagePrompt: "Original Image Prompt",
    imageAltText: "Image Alt Text",
    seoTitle: "SEO Title",
    metaDescription: "Meta Description",
    sourceName: "Source Name",
    sourceUrls: "Source URLs",
    sourceNote: "Source Note",
    socialCaption: "Social Caption",
    sourceRightsConfirmed: "Source Terms / Licence Confirmed",
    imageRightsConfirmed: "Image Rights Confirmed",
    copyrightReviewConfirmed: "Human Copyright Review Confirmed",
    focusKeyword: "Focus Keyword",
    relatedKeywords: "Related Keywords",
  };

  return labels[key] || key;
}

export default function ClusterDetailPage() {
  const params = useParams();
  const clusterId = params?.id;

  const [cluster, setCluster] = useState(null);
  const [sources, setSources] = useState([]);
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [pendingPublishStatus, setPendingPublishStatus] = useState(null);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [safetyReport, setSafetyReport] = useState(null);
  const [publicationSuccess, setPublicationSuccess] = useState(null);

  const loadCluster = async () => {
    if (!clusterId) return;

    const result = await getClusterById(clusterId);
    setCluster(result.cluster);
    setSources(result.sources || []);
    setGenerated(result.generated || null);
  };

  useEffect(() => {
    if (!clusterId) return;

    // Initial cluster load is triggered when the route ID becomes available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCluster().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId]);

  const handleGenerate = async () => {
    if (!clusterId) return;

    setLoading(true);
    setError("");

    try {
      const result = await generateContent(clusterId);
      setGenerated(result.data);
      await loadCluster();
    } catch (err) {
      setError(err.message || "Failed to generate content");
      try {
        await loadCluster();
      } catch {
        // Keep the original generation error visible if status refresh also fails.
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratedChange = (key, value) => {
    setGenerated((current) => ({ ...current, [key]: value }));
    setPublishMessage("");
    setSafetyReport(null);
  };

  const handleRequestPublish = async (targetStatus) => {
    if (!clusterId || !generated) return;

    setReviewing(true);
    setError("");
    setPublishMessage("");
    setPublicationSuccess(null);
    try {
      const reviewedContent = { ...generated, status: targetStatus };
      const result = await validateArticleForPublish(clusterId, reviewedContent);
      setSafetyReport(result.report || null);
      setGenerated(result.article);

      if (!result.report?.passed) {
        setError(
          result.report?.errors?.join(" ") || "Publication safety review failed.",
        );
        return;
      }

      setPendingPublishStatus(targetStatus);
    } catch (err) {
      setError(err.message || "Failed to run publication safety review");
    } finally {
      setReviewing(false);
    }
  };

  const handlePublish = async (targetStatus) => {
    if (!clusterId || !generated) return;
    setPendingPublishStatus(null);
    setPublishing(true);
    setError("");
    setPublishMessage("");
    try {
      const reviewedContent = { ...generated, status: targetStatus };
      const result = await publishArticle(clusterId, reviewedContent);
      setGenerated(reviewedContent);
      setPublicationSuccess({
        title: reviewedContent.title,
        status: result.article?.status || targetStatus,
        articleId: result.article?.id || "",
        slug: result.article?.slug || reviewedContent.slug || "",
        duplicate: Boolean(result.article?.duplicate),
      });
      const baseMessage = targetStatus === "published"
        ? "Article published successfully on the main site."
        : "Article sent successfully to the main site as a draft.";
      setPublishMessage(result.article?.id ? baseMessage + " Article ID: " + result.article.id : baseMessage);
      await loadCluster();
    } catch (err) {
      setError(err.message || "Failed to post article");
    } finally {
      setPublishing(false);
    }
  };

  const handleMarkUsed = async () => {
    if (!clusterId) return;

    setMarking(true);
    setError("");

    try {
      await markClusterUsed(clusterId);
      await loadCluster();
    } catch (err) {
      setError(err.message || "Failed to mark as used");
    } finally {
      setMarking(false);
    }
  };

  const copyAllApp1Text = generated
    ? APP_1_FIELDS.map((key) => {
        const value = generated[key];
        return `${formatCopyLabel(key)}:\n${formatCopyValue(value)}`;
      }).join("\n\n")
    : "";

  const copyAllExtraText = generated
    ? EXTRA_FIELDS.map((key) => {
        const value = generated[key];
        return `${formatCopyLabel(key)}:\n${formatCopyValue(value)}`;
      }).join("\n\n")
    : "";

  const copyEverythingText = generated
    ? [
        "APP 1 FORM FIELDS",
        "=================",
        copyAllApp1Text,
        "",
        "EXTRA SEO & SOURCE FIELDS",
        "=========================",
        copyAllExtraText,
      ].join("\n")
    : "";

  const reviewText = [
    cluster?.automationError || "",
    ...(cluster?.reviewReasons || []),
  ].join(" ").toLowerCase();
  const sourceRestrictionStatus = cluster?.sourceRestrictionStatus || (
    cluster?.sourceRightsConfirmed
      ? "approved"
      : cluster?.reviewStage === "source" || reviewText.includes("licensing/terms")
      ? "pending"
      : "not_required"
  );
  const sourceReviewBlocked = sourceRestrictionStatus === "pending";
  const awaitingVerifiedGeneration = Boolean(
    sourceRestrictionStatus === "approved" && cluster?.status === "review_ready"
  );
  const verifiedContentReady = Boolean(
    sourceRestrictionStatus === "approved" &&
    cluster?.reviewStatus === "ready" &&
    cluster?.status === "generated"
  );
  const publishLocked = sourceReviewBlocked || awaitingVerifiedGeneration;
  const verification = cluster?.automationVerification || generated?.verification || null;
  const verificationBlocked = cluster?.status === "needs_review" && cluster?.reviewStage === "verification";

  if (!cluster && !error) {
    return (
      <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-600">Loading cluster...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <PublishConfirmModal
          status={pendingPublishStatus}
          title={generated?.title || cluster?.clusterTitle}
          onCancel={() => setPendingPublishStatus(null)}
          safetyReport={safetyReport}
          onConfirm={() => handlePublish(pendingPublishStatus)}
        />

        <PublishSuccessModal
          publication={publicationSuccess}
          onClose={() => setPublicationSuccess(null)}
        />
        <header className="mb-6 rounded-3xl bg-white p-5 shadow-sm sm:mb-8 sm:p-6">
          <Link
            href="/clusters"
            className="text-sm font-bold text-amber-700 transition hover:text-amber-800"
          >
            ← Back to clusters
          </Link>
            <Link href={`/review#review-${clusterId}`} className="ml-4 text-sm font-bold text-violet-700 transition hover:text-violet-800">
            Review Queue
          </Link>

          <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {cluster?.category || "world"}
                </span>
                <span className={[
                  "rounded-full px-3 py-1 text-xs font-black",
                  sourceRestrictionStatus === "approved"
                    ? "bg-emerald-100 text-emerald-800"
                    : sourceRestrictionStatus === "pending"
                    ? "bg-red-100 text-red-800"
                    : "bg-slate-100 text-slate-600",
                ].join(" ")}>
                  {sourceRestrictionStatus === "approved"
                    ? "Restricted source: Approved"
                    : sourceRestrictionStatus === "pending"
                    ? "Restricted source: Pending"
                    : "Source restriction: Not required"}
                </span>


                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {cluster?.sourceCount || sources.length} source(s)
                </span>

                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {cluster?.status || "new"}
                </span>
                {verification && (
                  <>
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black capitalize text-cyan-800">
                      {(verification.recommendedMode || "attributed_brief").replaceAll("_", " ")}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                      Confidence {verification.confidence || 0}/100
                    </span>
                  </>
                )}
              </div>

              <h1 className="max-w-4xl text-3xl font-black leading-tight text-slate-950">
                {cluster?.clusterTitle}
              </h1>

              {(cluster?.createdAt || cluster?.updatedAt) && (
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  Fetched: {formatDateTime(cluster.createdAt || cluster.updatedAt)}
                </p>
              )}

              {cluster?.commonSummary && (
                <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
                  {cluster.commonSummary}
                </p>
              )}
            </div>

            <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
              <button
                onClick={handleGenerate}
                disabled={loading || sourceReviewBlocked}
                className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {loading
                  ? "Generating..."
                  : sourceReviewBlocked
                  ? "Verify Source First"
                  : awaitingVerifiedGeneration
                  ? "Generate Verified Content"
                  : (generated ? "Regenerate Content" : "Generate Content")}
              </button>

              <button
                onClick={handleMarkUsed}
                disabled={marking}
                className="w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {marking ? "Updating..." : "Mark Used"}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {verification && (
          <section className={[
            "mb-6 rounded-2xl border p-5",
            verificationBlocked
              ? "border-red-200 bg-red-50 text-red-950"
              : "border-cyan-200 bg-cyan-50 text-cyan-950",
          ].join(" ")}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] opacity-70">Automation verification</p>
                <h2 className="mt-2 text-lg font-black capitalize">
                  {verificationBlocked ? "Editorial exception requires review" : `${(verification.recommendedMode || "attributed_brief").replaceAll("_", " ")} selected`}
                </h2>
                <p className="mt-2 text-sm leading-6">Risk: <strong className="capitalize">{verification.riskLevel || "unknown"}</strong> / Confidence: <strong>{verification.confidence || 0}/100</strong></p>
                {verification.reasons?.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                    {verification.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                )}
              </div>
              {verificationBlocked && (
                <Link href={`/review#review-${clusterId}`} className="shrink-0 rounded-xl bg-red-700 px-4 py-2 text-center text-sm font-bold text-white hover:bg-red-600">
                  Review exception
                </Link>
              )}
            </div>
          </section>
        )}

        {sourceReviewBlocked && (
          <section className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Step 1 / Source verification</p>
            <h2 className="mt-2 text-lg font-black">Verify the source before generating or publishing</h2>
            <p className="mt-2 text-sm leading-6">
              Generation and publishing are locked. Return to the Review Queue and confirm the permission or licensing basis. Do not approve a restricted source unless it was genuinely verified.
            </p>
            <Link href={`/review#review-${clusterId}`} className="mt-4 inline-flex w-full justify-center rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-600 sm:w-auto">
              Verify in Review Queue
            </Link>
          </section>
        )}

        {awaitingVerifiedGeneration && (
          <section className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Step 1 complete / Step 2 ready</p>
            <h2 className="mt-2 text-lg font-black">Source verified - generate fresh content</h2>
            <p className="mt-2 text-sm leading-6">Publishing remains locked until Generate Verified Content finishes. Any older generated draft is not eligible for this verified workflow.</p>
          </section>
        )}

        {verifiedContentReady && (
          <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Step 2 complete / Step 3 ready</p>
            <h2 className="mt-2 text-lg font-black">Content generated - review and publish</h2>
            <p className="mt-2 text-sm leading-6">Review the editable fields, then choose Send as Draft or Post Directly. Safety validation runs first; public posting happens only after you confirm the final popup.</p>
            <Link href="#generated-output" className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600">Review generated fields</Link>
          </section>
        )}

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-black text-slate-950">
            Related Source Articles
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {sources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>

          {sources.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h3 className="text-lg font-bold text-slate-900">
                No source articles found
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                This cluster does not have related source articles yet.
              </p>
            </div>
          )}
        </section>

        <section id="generated-output" className="scroll-mt-6 rounded-3xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                Generated Output
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Copy-ready App 1 Fields
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                The field named <strong>Impact Analysis</strong> should be
                pasted into your App 1 <strong>Our View</strong> field.
              </p>
            </div>

            {generated && (
              <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => handleRequestPublish("draft")}
                  disabled={publishing || reviewing || publishLocked}
                  className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                >
                  {publishLocked ? "Complete Verification First" : reviewing ? "Checking..." : publishing ? "Sending..." : "Send as Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestPublish("published")}
                  disabled={publishing || reviewing || publishLocked}
                  className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
                >
                  {publishLocked ? "Generate Before Posting" : reviewing ? "Checking..." : publishing ? "Posting..." : "Post Directly"}
                </button>
                <CopyButton
                  value={copyAllApp1Text}
                  label="Copy App 1 Fields"
                />

                <CopyButton
                  value={copyEverythingText}
                  label="Copy Everything"
                />
              </div>
            )}
          </div>

          {publishMessage && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {publishMessage}
            </div>
          )}
          {safetyReport && (
            <div className={[
              "mb-6 rounded-2xl border p-5 text-sm",
              safetyReport.passed
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : "border-red-200 bg-red-50 text-red-950",
            ].join(" ")}>
              <h3 className="font-black">
                Publication safety: {safetyReport.passed ? "Passed" : "Blocked"}
              </h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <p>Longest source phrase: <strong>{safetyReport.metrics?.longestSourcePhraseWords || 0} words</strong></p>
                <p>Maximum source similarity: <strong>{Math.round((safetyReport.metrics?.maximumSourceSimilarity || 0) * 100)}%</strong></p>
                <p>Longest quotation: <strong>{safetyReport.metrics?.longestQuotationWords || 0} words</strong></p>
              </div>
              {safetyReport.errors?.length > 0 && (
                <div className="mt-4">
                  <p className="font-bold">Must fix before posting:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {safetyReport.errors.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
              {safetyReport.warnings?.length > 0 && (
                <div className="mt-4">
                  <p className="font-bold">Human review warnings:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {safetyReport.warnings.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
              <p className="mt-4 text-xs font-semibold opacity-75">{safetyReport.notice}</p>
            </div>
          )}

          {generated && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <strong>Review before posting:</strong> edit any field below. Category is detected automatically. Keep Featured and Show On Homepage off unless this is an important lead story. Use Send as Draft for another review, or Post Directly only when the article is ready to appear publicly.
            </div>
          )}

          {!generated && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <h3 className="text-lg font-bold text-slate-900">
                No generated content yet
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Click Generate Content to create values for your App 1 article
                form.
              </p>
            </div>
          )}

          {generated && (
            <>
              <h3 className="mb-4 text-lg font-black text-slate-900">
                App 1 Form Fields
              </h3>

              <div className="grid gap-4">
                {APP_1_FIELDS.map((key) => (
                  <GeneratedFieldBox
                    key={key}
                    fieldKey={key}
                    value={generated[key]}
                    onChange={(value) => handleGeneratedChange(key, value)}
                  />
                ))}
              </div>

              <h3 className="mb-4 mt-8 text-lg font-black text-slate-900">
                Extra SEO, Source & Image Fields
              </h3>

              <div className="grid gap-4">
                {EXTRA_FIELDS.map((key) => (
                  <GeneratedFieldBox
                    key={key}
                    fieldKey={key}
                    value={generated[key]}
                    onChange={(value) => handleGeneratedChange(key, value)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

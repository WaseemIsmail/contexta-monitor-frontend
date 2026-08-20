import CopyButton from "./CopyButton";

const CATEGORIES = ["opinion", "sports", "politics", "business", "economy", "technology", "world", "fact-check"];
const LONG_FIELDS = new Set(["summary", "content", "ourView", "imagePrompt", "metaDescription", "sourceNote", "socialCaption"]);

function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return String(value ?? "");
}

function formatLabel(key) {
  const labels = {
    ourView: "Impact Analysis",
    image: "Image URL",
    imagePrompt: "Original Image Prompt",
    imageAltText: "Image Alt Text",
    seoTitle: "SEO Title",
    metaDescription: "Meta Description",
    sourceName: "Source Name",
    sourceUrls: "Source URLs",
    sourceNote: "Source Note",
    socialCaption: "Social Caption",
    focusKeyword: "Focus Keyword",
    relatedKeywords: "Related Keywords",
    showOnHomepage: "Show On Homepage",
    homepageOrder: "Homepage Order",
    pollId: "Poll ID",
    sourceRightsConfirmed: "Source Terms / Licence Confirmed",
    imageRightsConfirmed: "Image Rights Confirmed",
    copyrightReviewConfirmed: "Human Copyright Review Confirmed",
  };
  return labels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function recommendation(key) {
  const notes = {
    category: "Recommended: keep the detected category unless the story clearly belongs elsewhere.",
    status: "Choose Published to show it publicly now, or Draft for another review in the main site.",
    featured: "Recommended: off. Enable only for an important lead story.",
    showOnHomepage: "Recommended: off until you decide this belongs on the homepage.",
    homepageOrder: "Lower numbers appear first. Keep 999 when homepage display is off.",
    tags: "Use comma-separated, focused search terms.",
    image: "Use only an original, licensed, or public-domain image. A source article image is not automatically reusable.",
    sourceRightsConfirmed: "Managed by the Review Queue. This field cannot be changed inside generated article content.",
    imageRightsConfirmed: "Enable only when you own the image or have a documented licence.",
    copyrightReviewConfirmed: "Enable after reviewing all similarity and quotation warnings.",
  };
  return notes[key] || "";
}

export default function GeneratedFieldBox({ fieldKey, value, onChange }) {
  const displayed = formatValue(value);
  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-slate-900";
  const updateText = (text) => {
    if (["tags", "sourceUrls", "relatedKeywords"].includes(fieldKey)) {
      onChange(text.split(",").map((item) => item.trim()).filter(Boolean));
    } else if (fieldKey === "homepageOrder") {
      onChange(Number(text) || 0);
    } else {
      onChange(text);
    }
  };

  let control;
  if (fieldKey === "sourceRightsConfirmed") {
    control = (
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={Boolean(value)} disabled className="h-5 w-5" />
        <span>{value ? "Approved in Review Queue" : "Not approved"}</span>
      </div>
    );
  } else if (["featured", "showOnHomepage", "imageRightsConfirmed", "copyrightReviewConfirmed"].includes(fieldKey)) {
    control = (
      <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5" />
        {value ? "Enabled" : "Disabled"}
      </label>
    );
  } else if (fieldKey === "category") {
    control = <select value={displayed} onChange={(event) => onChange(event.target.value)} className={inputClass}>{CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>;
  } else if (fieldKey === "status") {
    control = <select value={displayed || "draft"} onChange={(event) => onChange(event.target.value)} className={inputClass}><option value="draft">Draft</option><option value="published">Published</option></select>;
  } else if (LONG_FIELDS.has(fieldKey)) {
    control = <textarea rows={fieldKey === "content" ? 14 : 5} value={displayed} onChange={(event) => updateText(event.target.value)} className={inputClass} />;
  } else {
    control = <input type={fieldKey === "homepageOrder" ? "number" : "text"} value={displayed} onChange={(event) => updateText(event.target.value)} className={inputClass} />;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">{formatLabel(fieldKey)}</h3>
        <CopyButton value={displayed} />
      </div>
      {control}
      {recommendation(fieldKey) && <p className="mt-2 text-xs font-medium text-amber-700">{recommendation(fieldKey)}</p>}
    </div>
  );
}

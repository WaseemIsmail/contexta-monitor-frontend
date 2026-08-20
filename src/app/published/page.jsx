"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deletePublishedArticles,
  getPublishedArticles,
  updatePublishedArticle,
} from "@/services/monitorApi";

const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_NEWS_PLATFORM_PUBLIC_URL || "https://contextra.netlify.app"
).replace(/\/$/, "");

const CATEGORIES = [
  "business",
  "economy",
  "education",
  "fact-check",
  "opinion",
  "politics",
  "sports",
  "technology",
  "world",
];

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function articleUrl(article) {
  return `${PUBLIC_SITE_URL}/article/${encodeURIComponent(article.slug || "")}`;
}

function articleDate(article) {
  const date = new Date(article.publishedAt || article.createdAt || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function countWords(value = "") {
  return (String(value).match(/[\p{L}\p{N}_'-]+/gu) || []).length;
}

function analysisTarget(article = {}) {
  const mode = String(article.editorialMode || article.articleType || "explainer").toLowerCase();
  if (mode === "attributed_brief") {
    return { minimum: 90, maximum: 170, label: "attributed brief" };
  }
  if (mode === "explainer") {
    return { minimum: 180, maximum: 320, label: "verified explainer" };
  }
  return { minimum: 120, maximum: 280, label: "analysis" };
}

function editorForm(article) {
  return {
    title: article.title || "",
    summary: article.summary || "",
    content: article.content || "",
    ourView: article.ourView || "",
    category: article.category || "world",
    tags: Array.isArray(article.tags) ? article.tags.join(", ") : "",
    author: article.author || "Contextra Editorial",
    image: article.image || "",
    imageAltText: article.imageAltText || "",
    seoTitle: article.seoTitle || "",
    metaDescription: article.metaDescription || "",
    focusKeyword: article.focusKeyword || "",
    relatedKeywords: Array.isArray(article.relatedKeywords)
      ? article.relatedKeywords.join(", ")
      : "",
    socialCaption: article.socialCaption || "",
    featured: article.featured === true,
    showOnHomepage: article.showOnHomepage === true,
    homepageOrder: article.homepageOrder === 999 ? "" : String(article.homepageOrder || ""),
  };
}

function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-black text-slate-800">{label}</span>
      {hint && <span className="ml-2 text-xs font-semibold text-slate-400">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function ViewModeIcon({ mode }) {
  if (mode === "rows") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100";

export default function PublishedPage() {
  const [articles, setArticles] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [viewMode, setViewMode] = useState("cards");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteIds, setDeleteIds] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getPublishedArticles(500);
      const nextArticles = Array.isArray(response?.articles) ? response.articles : [];
      setArticles(nextArticles);
      setSelected((current) => new Set([...current].filter((id) => nextArticles.some((item) => item.id === id))));
    } catch (requestError) {
      setError(requestError.message || "Could not load published articles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getPublishedArticles(500)
      .then((response) => {
        if (!active) return;
        setArticles(Array.isArray(response?.articles) ? response.articles : []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load published articles.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!editing && !deleteIds.length) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key !== "Escape" || saving || deleting) return;
      setEditing(null);
      setForm(null);
      setDeleteIds([]);
      setDeleteConfirmation("");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [editing, deleteIds.length, saving, deleting]);

  const categories = useMemo(
    () => [...new Set([...CATEGORIES, ...articles.map((article) => article.category).filter(Boolean)])].sort(),
    [articles],
  );

  const visibleArticles = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    const today = startOfLocalDay(now);
    const relativeDays = dateRange === "7-days" ? 7 : dateRange === "30-days" ? 30 : 0;
    const relativeStart = relativeDays
      ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - (relativeDays - 1))
      : null;
    const customStart = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
    const customEnd = customTo ? new Date(`${customTo}T23:59:59.999`) : null;

    return articles.filter((article) => {
      if (category !== "all" && article.category !== category) return false;
      const publishedDate = articleDate(article);
      if (dateRange !== "all") {
        if (!publishedDate) return false;
        if (["today", "7-days", "30-days"].includes(dateRange) && publishedDate > now) return false;
        if (dateRange === "today" && publishedDate < today) return false;
        if (relativeStart && publishedDate < relativeStart) return false;
        if (dateRange === "custom") {
          if (customStart && publishedDate < customStart) return false;
          if (customEnd && publishedDate > customEnd) return false;
        }
      }
      if (!query) return true;
      return [article.title, article.summary, article.category, article.sourceName, ...(article.tags || [])]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [articles, search, category, dateRange, customFrom, customTo]);

  const selectedArticles = useMemo(
    () => articles.filter((article) => selected.has(article.id)),
    [articles, selected],
  );
  const allVisibleSelected = visibleArticles.length > 0
    && visibleArticles.every((article) => selected.has(article.id));
  const homepageCount = articles.filter((article) => article.showOnHomepage).length;
  const seoReadyCount = articles.filter((article) => article.seoQuality?.passed).length;
  const editingAnalysisTarget = analysisTarget(editing || {});
  const editingAnalysisWords = countWords(form?.ourView || "");
  const editingAnalysisInRange = editingAnalysisWords >= editingAnalysisTarget.minimum
    && editingAnalysisWords <= editingAnalysisTarget.maximum;

  const toggleArticle = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleArticles.forEach((article) => next.delete(article.id));
      else visibleArticles.forEach((article) => next.add(article.id));
      return next;
    });
  };

  const openEditor = (article) => {
    setError("");
    setNotice("");
    setEditing(article);
    setForm(editorForm(article));
  };

  const closeEditor = () => {
    if (saving) return;
    setEditing(null);
    setForm(null);
  };

  const changeField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const saveArticle = async (event) => {
    event.preventDefault();
    if (!editing || !form) return;
    if (!form.title.trim() || !form.summary.trim() || !form.content.trim() || !form.category.trim()) {
      setError("Title, summary, content, and category are required.");
      return;
    }
    const target = analysisTarget(editing);
    const analysisWords = countWords(form.ourView);
    if (analysisWords < target.minimum || analysisWords > target.maximum) {
      setError(`Why this story matters needs ${target.minimum}–${target.maximum} words for this ${target.label}; it currently has ${analysisWords}.`);
      return;
    }

    const splitValues = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);
    const updates = {
      ...form,
      tags: splitValues(form.tags),
      relatedKeywords: splitValues(form.relatedKeywords),
      homepageOrder: form.showOnHomepage ? Number(form.homepageOrder || 1) : 999,
    };

    try {
      setSaving(true);
      setError("");
      const response = await updatePublishedArticle(editing.id, updates);
      setArticles((current) => current.map((article) => (
        article.id === editing.id ? response.article : article
      )));
      setNotice(`Updated “${response.article.title}” on the main site.`);
      setEditing(null);
      setForm(null);
    } catch (requestError) {
      setError(requestError.message || "Could not update the article.");
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (ids) => {
    setError("");
    setNotice("");
    setDeleteIds(ids);
    setDeleteConfirmation("");
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteIds([]);
    setDeleteConfirmation("");
  };

  const confirmDelete = async () => {
    if (deleteConfirmation !== "DELETE" || !deleteIds.length) return;
    try {
      setDeleting(true);
      setError("");
      const response = await deletePublishedArticles(deleteIds);
      const deletedSet = new Set(response.deletedIds || deleteIds);
      setArticles((current) => current.filter((article) => !deletedSet.has(article.id)));
      setSelected((current) => new Set([...current].filter((id) => !deletedSet.has(id))));
      setNotice(`${response.deleted || deleteIds.length} published ${deleteIds.length === 1 ? "article" : "articles"} permanently deleted.`);
      setDeleteIds([]);
      setDeleteConfirmation("");
    } catch (requestError) {
      setError(requestError.message || "Could not delete the selected articles.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[90rem] space-y-5 sm:space-y-6">
        <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl sm:rounded-[2rem]">
          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">Live content control</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">Published news</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Review what is live, make corrections, or safely remove several articles in one action.
              </p>
            </div>
            <a href={PUBLIC_SITE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-black transition hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950">
              Open main site <span className="ml-2" aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="grid border-t border-slate-800 sm:grid-cols-3">
            {[
              [articles.length, "Published"],
              [homepageCount, "Homepage picks"],
              [seoReadyCount, "SEO ready"],
            ].map(([value, label]) => (
              <div key={label} className="border-b border-slate-800 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-8">
                <strong className="text-2xl font-black text-white">{value}</strong>
                <span className="ml-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </header>

        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-800">{error}</div>}
        {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">{notice}</div>}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_13rem_13rem_auto]">
            <label className="relative">
              <span className="sr-only">Search published news</span>
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-10`} placeholder="Search title, source, category, or tag" />
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
                <option value="all">All categories</option>
                {categories.map((item) => <option key={item} value={item}>{item.replace(/-/g, " ")}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by published date</span>
              <select value={dateRange} onChange={(event) => setDateRange(event.target.value)} className={inputClass}>
                <option value="all">All published dates</option>
                <option value="today">Published today</option>
                <option value="7-days">Last 7 days</option>
                <option value="30-days">Last 30 days</option>
                <option value="custom">Custom date range</option>
              </select>
            </label>
            <button type="button" onClick={loadArticles} disabled={loading} className="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {dateRange === "custom" && (
            <div className="mt-4 grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2 lg:max-w-2xl">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-amber-900">Published from</span>
                <input type="date" value={customFrom} max={customTo || undefined} onChange={(event) => setCustomFrom(event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-amber-900">Published to</span>
                <input type="date" value={customTo} min={customFrom || undefined} onChange={(event) => setCustomTo(event.target.value)} className={inputClass} />
              </label>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm font-black text-slate-700">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} disabled={!visibleArticles.length} className="h-5 w-5 rounded border-slate-300 accent-slate-950" />
                Select all shown ({visibleArticles.length})
              </label>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1" aria-label="Article layout">
                {["cards", "rows"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    aria-pressed={viewMode === mode}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-black capitalize transition ${viewMode === mode ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    <ViewModeIcon mode={mode} />
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-slate-500">{selected.size} selected</span>
              {selected.size > 0 && (
                <>
                  <button type="button" onClick={() => setSelected(new Set())} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700">Clear</button>
                  <button type="button" onClick={() => openDelete(selectedArticles.map((article) => article.id))} className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">Delete selected</button>
                </>
              )}
            </div>
          </div>
        </section>

        {loading && !articles.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading published articles">
            {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-72 rounded-3xl border border-slate-200 bg-white p-5"><div className="monitor-skeleton h-full rounded-2xl" /></div>)}
          </section>
        ) : visibleArticles.length && viewMode === "cards" ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Published articles">
            {visibleArticles.map((article) => {
              const isSelected = selected.has(article.id);
              return (
                <article key={article.id} className={`relative flex min-h-72 flex-col rounded-3xl border bg-white p-5 shadow-sm transition sm:p-6 ${isSelected ? "border-amber-400 ring-4 ring-amber-100" : "border-slate-200 hover:-translate-y-0.5 hover:shadow-md"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl text-sm font-black text-slate-600">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleArticle(article.id)} className="h-5 w-5 rounded border-slate-300 accent-slate-950" />
                      Select
                    </label>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-emerald-800">Live</span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-600">{article.category?.replace(/-/g, " ") || "Uncategorised"}</span>
                    {article.featured && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">Featured</span>}
                    {article.showOnHomepage && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">Homepage</span>}
                  </div>
                  <h2 className="mt-4 text-xl font-black leading-7 tracking-[-0.02em] text-slate-950">{article.title || "Untitled article"}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{article.summary || "No summary available."}</p>
                  <div className="mt-auto pt-5">
                    <p className="text-xs font-bold text-slate-400">Published {formatDate(article.publishedAt || article.createdAt)}</p>
                    {article.sourceName && <p className="mt-1 truncate text-xs font-semibold text-slate-500">Source: {article.sourceName}</p>}
                    <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2">
                      <a href={articleUrl(article)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">View</a>
                      <button type="button" onClick={() => openEditor(article)} className="min-h-11 rounded-xl bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-slate-800">Edit</button>
                      <button type="button" onClick={() => openDelete([article.id])} className="min-h-11 rounded-xl border border-red-200 px-3 text-sm font-black text-red-700 transition hover:bg-red-50" aria-label={`Delete ${article.title}`}>Delete</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : visibleArticles.length ? (
          <section className="space-y-3" aria-label="Published articles in rows">
            {visibleArticles.map((article) => {
              const isSelected = selected.has(article.id);
              return (
                <article key={article.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition sm:p-5 ${isSelected ? "border-amber-400 ring-4 ring-amber-100" : "border-slate-200 hover:border-slate-300 hover:shadow-md"}`}>
                  <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-black text-slate-600">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleArticle(article.id)} className="h-5 w-5 rounded border-slate-300 accent-slate-950" />
                      <span className="lg:sr-only">Select {article.title}</span>
                    </label>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em] text-emerald-800">Live</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-black capitalize text-slate-600">{article.category?.replace(/-/g, " ") || "Uncategorised"}</span>
                        {article.featured && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[0.68rem] font-black text-amber-800">Featured</span>}
                        {article.showOnHomepage && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[0.68rem] font-black text-blue-800">Homepage</span>}
                      </div>
                      <h2 className="mt-2 truncate text-lg font-black tracking-[-0.02em] text-slate-950 sm:text-xl">{article.title || "Untitled article"}</h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{article.summary || "No summary available."}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-400">
                        <span>Published {formatDate(article.publishedAt || article.createdAt)}</span>
                        {article.sourceName && <span>Source: {article.sourceName}</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 lg:w-64">
                      <a href={articleUrl(article)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">View</a>
                      <button type="button" onClick={() => openEditor(article)} className="min-h-11 rounded-xl bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-slate-800">Edit</button>
                      <button type="button" onClick={() => openDelete([article.id])} className="min-h-11 rounded-xl border border-red-200 px-3 text-sm font-black text-red-700 transition hover:bg-red-50" aria-label={`Delete ${article.title}`}>Delete</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-black text-slate-950">No published news found</h2>
            <p className="mt-2 text-sm text-slate-600">Try clearing the search or category filter, then refresh the list.</p>
          </section>
        )}
      </div>

      {editing && form && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 p-0 backdrop-blur-sm sm:p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
          <section role="dialog" aria-modal="true" aria-labelledby="edit-published-title" className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[2rem]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Editing a live page</p>
                <h2 id="edit-published-title" className="mt-1 text-2xl font-black text-slate-950">Edit published news</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">Saving updates the public article immediately. Its URL remains unchanged.</p>
              </div>
              <button type="button" onClick={closeEditor} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-700" aria-label="Close editor">×</button>
            </div>
            <form onSubmit={saveArticle} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
                {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-800">{error}</div>}
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Headline" className="md:col-span-2"><input name="title" value={form.title} onChange={changeField} className={inputClass} maxLength={180} required /></Field>
                  <Field label="Summary" className="md:col-span-2"><textarea name="summary" value={form.summary} onChange={changeField} className={inputClass} rows={4} maxLength={1000} required /></Field>
                  <Field label="Article content" hint="Markdown or plain text" className="md:col-span-2"><textarea name="content" value={form.content} onChange={changeField} className={`${inputClass} font-mono leading-6`} rows={14} required /></Field>
                  <Field
                    label="Why this story matters"
                    hint={`${editingAnalysisWords} words · target ${editingAnalysisTarget.minimum}–${editingAnalysisTarget.maximum}`}
                    className="md:col-span-2"
                  >
                    <textarea name="ourView" value={form.ourView} onChange={changeField} className={`${inputClass} leading-7`} rows={10} required />
                    <div className={`mt-3 rounded-xl border px-4 py-3 text-xs font-bold leading-5 ${editingAnalysisInRange ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                      {editingAnalysisInRange
                        ? "Editorial depth is in range. Check that every statement is supported before saving."
                        : `Aim for ${editingAnalysisTarget.minimum}–${editingAnalysisTarget.maximum} words. Use separate paragraphs for what changed, who is affected, the practical consequence, and what readers should watch next.`}
                    </div>
                  </Field>
                  <Field label="Category">
                    <select name="category" value={form.category} onChange={changeField} className={inputClass} required>
                      {categories.map((item) => <option key={item} value={item}>{item.replace(/-/g, " ")}</option>)}
                    </select>
                  </Field>
                  <Field label="Author"><input name="author" value={form.author} onChange={changeField} className={inputClass} /></Field>
                  <Field label="Tags" hint="Comma-separated" className="md:col-span-2"><input name="tags" value={form.tags} onChange={changeField} className={inputClass} /></Field>
                </div>

                <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <h3 className="text-sm font-black text-blue-950">Source record is protected</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-blue-800">Editing does not remove the original attribution attached during publication.</p>
                  <p className="mt-3 text-sm font-black text-blue-950">{editing.sourceName || "Source unavailable"}</p>
                  <div className="mt-2 space-y-1">{(editing.sourceUrls || []).map((url) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs font-bold text-blue-700 underline">{url}</a>)}</div>
                </section>

                <section>
                  <h3 className="text-lg font-black text-slate-950">Search and sharing</h3>
                  <div className="mt-4 grid gap-5 md:grid-cols-2">
                    <Field label="SEO title" hint={`${form.seoTitle.length}/60`}><input name="seoTitle" value={form.seoTitle} onChange={changeField} className={inputClass} maxLength={60} /></Field>
                    <Field label="Focus keyword"><input name="focusKeyword" value={form.focusKeyword} onChange={changeField} className={inputClass} /></Field>
                    <Field label="Meta description" hint={`${form.metaDescription.length}/160`} className="md:col-span-2"><textarea name="metaDescription" value={form.metaDescription} onChange={changeField} className={inputClass} rows={3} maxLength={160} /></Field>
                    <Field label="Related keywords" hint="Comma-separated" className="md:col-span-2"><input name="relatedKeywords" value={form.relatedKeywords} onChange={changeField} className={inputClass} /></Field>
                    <Field label="Social caption" className="md:col-span-2"><textarea name="socialCaption" value={form.socialCaption} onChange={changeField} className={inputClass} rows={3} maxLength={240} /></Field>
                    <Field label="Image URL" className="md:col-span-2"><input type="url" name="image" value={form.image} onChange={changeField} className={inputClass} /></Field>
                    <Field label="Image alternative text" className="md:col-span-2"><input name="imageAltText" value={form.imageAltText} onChange={changeField} className={inputClass} /></Field>
                  </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                    <span><strong className="block text-sm font-black text-slate-950">Featured story</strong><span className="mt-1 block text-xs font-semibold text-slate-500">Use stronger visual emphasis.</span></span>
                    <input type="checkbox" name="featured" checked={form.featured} onChange={changeField} className="h-5 w-5 accent-slate-950" />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                    <span><strong className="block text-sm font-black text-slate-950">Homepage pick</strong><span className="mt-1 block text-xs font-semibold text-slate-500">Show in the selected homepage area.</span></span>
                    <input type="checkbox" name="showOnHomepage" checked={form.showOnHomepage} onChange={changeField} className="h-5 w-5 accent-slate-950" />
                  </label>
                  {form.showOnHomepage && <Field label="Homepage order"><input type="number" min="1" name="homepageOrder" value={form.homepageOrder} onChange={changeField} className={inputClass} required /></Field>}
                </section>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button type="button" onClick={closeEditor} disabled={saving} className="min-h-12 rounded-xl border border-slate-200 px-6 text-sm font-black text-slate-700">Cancel</button>
                <button type="submit" disabled={saving} className="min-h-12 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving live update…" : "Save live update"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteIds.length > 0 && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDelete()}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-published-title" aria-describedby="delete-published-description" className="w-full max-w-lg rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl" aria-hidden="true">!</div>
            <h2 id="delete-published-title" className="mt-5 text-2xl font-black tracking-[-0.03em] text-slate-950">Permanently delete {deleteIds.length} {deleteIds.length === 1 ? "article" : "articles"}?</h2>
            <p id="delete-published-description" className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              This removes the live article and its linked comments, reactions, and bookmarks. This action cannot be undone.
            </p>
            {error && <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-800">{error}</div>}
            <label className="mt-5 block">
              <span className="text-sm font-black text-slate-800">Type DELETE to confirm</span>
              <input autoFocus value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className={`${inputClass} mt-2 border-red-300 focus:border-red-500 focus:ring-red-100`} placeholder="DELETE" autoComplete="off" />
            </label>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={closeDelete} disabled={deleting} className="min-h-12 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-700">Keep articles</button>
              <button type="button" onClick={confirmDelete} disabled={deleteConfirmation !== "DELETE" || deleting} className="min-h-12 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">{deleting ? "Deleting…" : "Delete forever"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

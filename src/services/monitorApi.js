import { auth } from "@/lib/firebase";

const CONFIGURED_API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000/api"
).replace(/\/$/, "");

function isLoopbackHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getApiBaseUrl() {
  if (typeof window === "undefined") {
    return CONFIGURED_API_BASE_URL;
  }

  try {
    const apiUrl = new URL(CONFIGURED_API_BASE_URL);
    const browserHostname = window.location.hostname;

    // On a phone, localhost/127.0.0.1 means the phone itself. When the monitor
    // is opened through the computer's LAN address, send API calls back to that
    // same computer while preserving the configured API port and path.
    if (
      isLoopbackHost(apiUrl.hostname) &&
      !isLoopbackHost(browserHostname)
    ) {
      apiUrl.hostname = browserHostname;
    }

    return apiUrl.toString().replace(/\/$/, "");
  } catch {
    return CONFIGURED_API_BASE_URL;
  }
}

async function request(path, options = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Your administrator session has expired. Sign in again.");
  }
  const idToken = await currentUser.getIdToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.details || data?.error || data?.message || "Request failed"
    );
  }

  return data;
}

export function healthCheck() {
  return request("/health");
}

export function fetchNews() {
  return request("/news/fetch");
}

export function getRawNews() {
  return request("/news/");
}

// CHANGED:
// Supports hours, limit, and includeArchived.
// Removed cursor because backend route does not currently use cursor.
export function getClusters(hours = "", limit = 300, includeArchived = false) {
  const params = new URLSearchParams();

  if (hours) {
    params.append("hours", hours);
  }

  params.append("limit", String(limit));
  params.append("includeArchived", String(includeArchived));

  const query = params.toString();

  return request(`/clusters/${query ? `?${query}` : ""}`);
}

export function getClusterById(clusterId) {
  return request(`/clusters/${clusterId}`);
}

export function generateContent(clusterId) {
  return request(`/content/generate/${clusterId}`, {
    method: "POST",
  });
}

export function markClusterUsed(clusterId) {
  return request(`/clusters/${clusterId}/mark-used`, {
    method: "POST",
  });
}

// ADDED:
// Archives used clusters older than selected number of days.
// Default: older than 1 day.
export function cleanupUsedClusters(days = 1, limit = 100) {
  const params = new URLSearchParams();

  params.append("days", String(days));
  params.append("limit", String(limit));

  return request(`/clusters/cleanup-used?${params.toString()}`, {
    method: "POST",
  });
}

// ADDED:
// Permanently deletes archived clusters older than selected number of days.
// Default: older than 7 days.
// Use carefully.
export function deleteArchivedClusters(days = 7, limit = 50) {
  const params = new URLSearchParams();

  params.append("days", String(days));
  params.append("limit", String(limit));

  return request(`/clusters/delete-archived?${params.toString()}`, {
    method: "POST",
  });
}

export function getSources() {
  return request("/sources/");
}
export function getAutomationStatus() {
  return request("/automation/status");
}

export function runAutomation(options) {
  return request("/automation/run", {
    method: "POST",
    body: JSON.stringify({ options }),
  });
}

export function startAutomation(options, intervalSeconds) {
  return request("/automation/start", {
    method: "POST",
    body: JSON.stringify({ options, intervalSeconds }),
  });
}

export function stopAutomation() {
  return request("/automation/stop", { method: "POST" });
}

export function validateArticleForPublish(clusterId, content) {
  return request(`/publish/${clusterId}/validate`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function publishArticle(clusterId, content) {
  return request(`/publish/${clusterId}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function getPublishedArticles(limit = 200) {
  const params = new URLSearchParams({ limit: String(limit) });
  return request(`/published/?${params.toString()}`);
}

export function updatePublishedArticle(articleId, updates) {
  return request(`/published/${articleId}`, {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  });
}

export function deletePublishedArticles(articleIds) {
  return request("/published/", {
    method: "DELETE",
    body: JSON.stringify({ articleIds }),
  });
}

export function getReviewQueue(state = "active", limit = 200) {
  const params = new URLSearchParams({ state, limit: String(limit) });
  return request(`/reviews/?${params.toString()}`);
}

export function approveReviewSource(clusterId, review) {
  return request(`/reviews/${clusterId}/approve-source`, {
    method: "POST",
    body: JSON.stringify(review),
  });
}

export function approveReviewVerification(clusterId, review) {
  return request(`/reviews/${clusterId}/approve-verification`, {
    method: "POST",
    body: JSON.stringify(review),
  });
}

export function approveReviewContent(clusterId, review) {
  return request(`/reviews/${clusterId}/approve-content`, {
    method: "POST",
    body: JSON.stringify(review),
  });
}

export function approveReviewPlatform(clusterId, review) {
  return request(`/reviews/${clusterId}/approve-platform`, {
    method: "POST",
    body: JSON.stringify(review),
  });
}

export function approveRejectedReview(clusterId, review) {
  return request(`/reviews/${clusterId}/approve-rejected`, {
    method: "POST",
    body: JSON.stringify(review),
  });
}

export function rejectReviewItem(clusterId, review) {
  return request(`/reviews/${clusterId}/reject`, {
    method: "POST",
    body: JSON.stringify(review),
  });
}

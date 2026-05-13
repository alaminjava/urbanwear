import axios from "axios";

function resolveApiBaseUrl() {
  const rawUrl = (import.meta.env.VITE_API_URL || "").trim();
  const isBrowser = typeof window !== "undefined";

  // Service methods already call /api/..., so a base ending in /api would produce
  // /api/api/... and hit the backend not-found handler in some deployments.
  if (!rawUrl || rawUrl === "/api" || rawUrl.endsWith("/api")) {
    if (!rawUrl && import.meta.env.DEV && isBrowser && window.location.hostname === "localhost" && window.location.port === "5174") {
      return "http://127.0.0.1:5001";
    }
    return rawUrl.endsWith("/api") ? rawUrl.slice(0, -4) : "";
  }

  return rawUrl.replace(/\/$/, "");
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

export function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

export const APP_BASENAME = "/wg-studio";
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "/api";

export const DEFAULT_QUERY_STALE_MS = 5_000;

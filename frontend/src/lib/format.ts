import { getUiLocale } from "../core/i18n";

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${BYTE_UNITS[unitIndex]}`;
}

export function formatDateTime(value: string | null): string {
  const locale = getUiLocale();
  if (!value) {
    return locale === "ja" ? "なし" : "Never";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string | null): string {
  const locale = getUiLocale();
  if (!value) {
    return locale === "ja" ? "オフライン" : "Offline";
  }

  const now = Date.now();
  const then = new Date(value).getTime();
  const deltaSeconds = Math.max(0, Math.floor((now - then) / 1000));

  if (deltaSeconds < 60) {
    return locale === "ja" ? `${deltaSeconds}秒前` : `${deltaSeconds}s ago`;
  }
  if (deltaSeconds < 3600) {
    return locale === "ja"
      ? `${Math.floor(deltaSeconds / 60)}分前`
      : `${Math.floor(deltaSeconds / 60)}m ago`;
  }
  if (deltaSeconds < 86400) {
    return locale === "ja"
      ? `${Math.floor(deltaSeconds / 3600)}時間前`
      : `${Math.floor(deltaSeconds / 3600)}h ago`;
  }
  return locale === "ja"
    ? `${Math.floor(deltaSeconds / 86400)}日前`
    : `${Math.floor(deltaSeconds / 86400)}d ago`;
}

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
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string | null): string {
  if (!value) {
    return "Offline";
  }

  const now = Date.now();
  const then = new Date(value).getTime();
  const deltaSeconds = Math.max(0, Math.floor((now - then) / 1000));

  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }
  if (deltaSeconds < 3600) {
    return `${Math.floor(deltaSeconds / 60)}m ago`;
  }
  if (deltaSeconds < 86400) {
    return `${Math.floor(deltaSeconds / 3600)}h ago`;
  }
  return `${Math.floor(deltaSeconds / 86400)}d ago`;
}

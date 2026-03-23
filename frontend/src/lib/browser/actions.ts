export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to the legacy textarea path below.
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function confirmAction(message: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.confirm(message);
}

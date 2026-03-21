import { useMemo, useState } from "react";

import { t } from "../lib/i18n";
import type { RevealedPeerArtifacts } from "../types";

export function RevealModal({
  artifacts,
  onClose,
}: {
  artifacts: RevealedPeerArtifacts;
  onClose: () => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");

  const qrImageSrc = useMemo(() => {
    const normalizedSvg = artifacts.qr_svg
      .replace(/<svg:svg\b/g, "<svg")
      .replace(/<\/svg:svg>/g, "</svg>")
      .replace(/<svg:/g, "<")
      .replace(/<\/svg:/g, "</");

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizedSvg)}`;
  }, [artifacts.qr_svg]);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(artifacts.config_text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = artifacts.config_text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copied) {
          throw new Error("copy failed");
        }
      }
      setCopyState("done");
    } catch {
      setCopyState("failed");
    }
  }

  function handleDownloadConfig() {
    const blob = new Blob([artifacts.config_text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${artifacts.peer_name}.conf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadQr() {
    const link = document.createElement("a");
    link.href = qrImageSrc;
    link.download = `${artifacts.peer_name}.svg`;
    link.click();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <h2>{t("reveal.title", "Reveal WireGuard Configuration")}</h2>
          <button className="ghost-button" onClick={onClose}>
            {t("common.close", "Close")}
          </button>
        </div>
        <div className="warning-banner">
          {t("reveal.warning", "This configuration is revealed only once. Download or scan it now.")}
        </div>
        <div className="reveal-grid">
          <div className="qr-card">
            <img src={qrImageSrc} alt={`${artifacts.peer_name} QR code`} />
          </div>
          <div className="page-stack">
            <pre className="code-block">{artifacts.config_text}</pre>
            <div className="modal-actions">
              <button className="secondary-button" onClick={handleDownloadConfig}>
                {t("reveal.download_config", "Download config")}
              </button>
              <button className="secondary-button" onClick={handleDownloadQr}>
                {t("reveal.download_qr", "Download QR")}
              </button>
              <button className="ghost-button" onClick={handleCopy}>
                {copyState === "done"
                  ? t("reveal.copied", "Copied")
                  : copyState === "failed"
                    ? t("reveal.copy_failed", "Copy failed")
                    : t("reveal.copy", "Copy config")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

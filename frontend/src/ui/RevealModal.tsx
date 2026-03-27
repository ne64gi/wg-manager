import { useMemo, useState } from "react";

import { copyText, downloadBlob, downloadDataUrl } from "../core/browser/actions";
import { t } from "../core/i18n";
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
      const copied = await copyText(artifacts.config_text);
      if (!copied) {
        throw new Error("copy failed");
      }
      setCopyState("done");
    } catch {
      setCopyState("failed");
    }
  }

  function handleDownloadConfig() {
    const blob = new Blob([artifacts.config_text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${artifacts.peer_name}.conf`);
  }

  function handleDownloadQr() {
    downloadDataUrl(qrImageSrc, `${artifacts.peer_name}.svg`);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" data-testid="reveal-modal" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <h2>{t("reveal.title", "Reveal WireGuard Configuration")}</h2>
          <button className="ghost-button" data-testid="reveal-close" onClick={onClose}>
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
              <button className="secondary-button" data-testid="reveal-download-config" onClick={handleDownloadConfig}>
                {t("reveal.download_config", "Download config")}
              </button>
              <button className="secondary-button" data-testid="reveal-download-qr" onClick={handleDownloadQr}>
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

import { useMemo, useState } from "react";

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
      await navigator.clipboard.writeText(artifacts.config_text);
      setCopyState("done");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <h2>Reveal WireGuard Configuration</h2>
          <button className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="warning-banner">
          This configuration is revealed only once. Download or scan it now.
        </div>
        <div className="reveal-grid">
          <div className="qr-card">
            <img src={qrImageSrc} alt={`${artifacts.peer_name} QR code`} />
          </div>
          <div className="page-stack">
            <pre className="code-block">{artifacts.config_text}</pre>
            <div className="modal-actions">
              <button className="ghost-button" onClick={handleCopy}>
                {copyState === "done"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Copy failed"
                    : "Copy config"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

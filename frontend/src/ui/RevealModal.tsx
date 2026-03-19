import type { RevealedPeerArtifacts } from "../types";

export function RevealModal({
  artifacts,
  onClose,
}: {
  artifacts: RevealedPeerArtifacts;
  onClose: () => void;
}) {
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
          <div
            className="qr-card"
            dangerouslySetInnerHTML={{ __html: artifacts.qr_svg }}
          />
          <pre className="code-block">{artifacts.config_text}</pre>
        </div>
      </div>
    </div>
  );
}

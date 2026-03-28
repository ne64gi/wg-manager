import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../core/auth/AuthContext";
import { t } from "../core/i18n";
import { getServerConfigPreview } from "../lib/api";
import { queryKeys } from "../modules/queryKeys";

export function ApplyPreviewModal({
  onClose,
  onApply,
  isApplying,
}: {
  onClose: () => void;
  onApply: () => Promise<unknown>;
  isApplying: boolean;
}) {
  const auth = useAuth();
  const [applyError, setApplyError] = useState<string | null>(null);
  const previewQuery = useQuery({
    queryKey: queryKeys.serverConfigPreview,
    queryFn: async () => getServerConfigPreview((await auth.getValidAccessToken()) ?? ""),
    enabled: auth.isAuthenticated,
  });

  async function handleApply() {
    setApplyError(null);
    try {
      await onApply();
      onClose();
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : t("common.apply_failed", "Apply failed."));
    }
  }

  const preview = previewQuery.data;
  const diffLines = preview?.unified_diff ? preview.unified_diff.split("\n") : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card apply-preview-modal"
        data-testid="apply-preview-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-header">
          <h2>{t("apply_preview.title", "Review server config changes")}</h2>
          <button className="ghost-button" onClick={onClose}>
            {t("common.close", "Close")}
          </button>
        </div>

        <div className="muted-text">
          {t(
            "apply_preview.subtitle",
            "Compare the current server config with the candidate config before applying.",
          )}
        </div>

        {previewQuery.isPending ? (
          <div className="info-banner">{t("common.loading", "Loading...")}</div>
        ) : previewQuery.isError ? (
          <div className="warning-banner">
            {previewQuery.error instanceof Error
              ? previewQuery.error.message
              : t("apply_preview.load_failed", "Failed to load config preview.")}
          </div>
        ) : preview ? (
          <div className="page-stack">
            <div className="stats-grid stats-grid-compact apply-preview-stats">
              <div className="stat-card">
                <div className="stat-label">{t("apply_preview.current_lines", "Current lines")}</div>
                <div className="stat-value">{preview.current_line_count}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{t("apply_preview.candidate_lines", "Candidate lines")}</div>
                <div className="stat-value">{preview.candidate_line_count}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{t("apply_preview.changed_lines", "Changed lines")}</div>
                <div className="stat-value">{preview.changed_line_count}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{t("dashboard.total_peers", "Total peers")}</div>
                <div className="stat-value">{preview.peer_count}</div>
              </div>
            </div>

            {preview.has_changes ? (
              <div className="diff-block" data-testid="apply-preview-diff">
                {diffLines.map((line, index) => (
                  <div
                    className={`diff-line ${
                      line.startsWith("+") && !line.startsWith("+++")
                        ? "diff-line-added"
                        : line.startsWith("-") && !line.startsWith("---")
                          ? "diff-line-removed"
                          : line.startsWith("@@")
                            ? "diff-line-hunk"
                            : "diff-line-neutral"
                    }`}
                    key={`${index}-${line}`}
                  >
                    {line || " "}
                  </div>
                ))}
              </div>
            ) : (
              <div className="info-banner">
                {t(
                  "apply_preview.no_changes",
                  "The candidate config matches the current server config. Applying is optional.",
                )}
              </div>
            )}

            {!preview.current_config_text ? (
              <div className="muted-text">
                {t(
                  "apply_preview.no_current",
                  "No current server config file was found. The candidate config will be written on first apply.",
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {applyError ? <div className="warning-banner">{applyError}</div> : null}

        <div className="modal-actions">
          <button
            className="ghost-button"
            onClick={() => previewQuery.refetch()}
            disabled={previewQuery.isFetching}
          >
            {previewQuery.isFetching
              ? t("apply_preview.refreshing", "Refreshing...")
              : t("apply_preview.refresh", "Refresh preview")}
          </button>
          <button
            className="secondary-button"
            onClick={handleApply}
            disabled={isApplying || previewQuery.isPending}
          >
            {isApplying ? t("peers.applying", "Applying...") : t("peers.apply", "Apply config")}
          </button>
        </div>
      </div>
    </div>
  );
}

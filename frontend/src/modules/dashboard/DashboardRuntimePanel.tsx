import { t } from "../../core/i18n";
import { formatDateTime, formatDurationCompact } from "../../lib/format";
import type { SyncState, SystemVersion, WireGuardOverview } from "../../types";
import { Panel } from "../../design/ui/Cards";

export function DashboardRuntimePanel({
  overview,
  syncState,
  systemVersion,
}: {
  overview: WireGuardOverview | undefined;
  syncState: SyncState | undefined;
  systemVersion: SystemVersion | undefined;
}) {
  const runtimeStatusClassName =
    systemVersion?.runtime_running === true
      ? "runtime-status-badge runtime-status-badge-online"
      : "runtime-status-badge runtime-status-badge-offline";

  return (
    <Panel title={t("dashboard.runtime_overview", "Runtime and system")}>
      <div className="runtime-overview-list" data-testid="dashboard-runtime-panel">
        <div className="runtime-overview-row">
          <span>{t("dashboard.runtime_interface", "Interface")}</span>
          <strong>
            {overview?.interface_name ??
              systemVersion?.interface_name ??
              syncState?.interface_name ??
              "wg0"}
          </strong>
        </div>
        <div className="runtime-overview-row">
          <span>{t("dashboard.runtime_adapter", "Runtime adapter")}</span>
          <strong>{systemVersion?.runtime_adapter ?? "-"}</strong>
        </div>
        <div className="runtime-overview-row">
          <span>{t("dashboard.runtime_status", "Runtime status")}</span>
          <strong className={runtimeStatusClassName}>
            {systemVersion?.runtime_status ?? (systemVersion?.runtime_running ? "running" : "-")}
          </strong>
        </div>
        <div className="runtime-overview-row">
          <span>{t("dashboard.runtime_uptime", "Runtime uptime")}</span>
          <strong data-testid="dashboard-runtime-uptime">
            {formatDurationCompact(systemVersion?.runtime_uptime_seconds ?? null)}
          </strong>
        </div>
        <div className="runtime-overview-row">
          <span>{t("dashboard.runtime_container", "Runtime container")}</span>
          <strong>{systemVersion?.runtime_container_name ?? "-"}</strong>
        </div>
        <div className="runtime-overview-row">
          <span>{t("dashboard.runtime_online", "Online / total")}</span>
          <strong>
            {overview?.online_peer_count ?? 0}/{overview?.peer_count ?? 0}
          </strong>
        </div>
        <div className="runtime-overview-row">
          <span>{t("dashboard.runtime_last_sync", "Last runtime sync")}</span>
          <strong>{formatDateTime(syncState?.last_runtime_sync_at ?? null)}</strong>
        </div>
        <div className="runtime-overview-row">
          <span>{t("dashboard.runtime_last_generated", "Last generated")}</span>
          <strong>{formatDateTime(syncState?.last_generated_at ?? null)}</strong>
        </div>
        <div className="runtime-overview-row">
          <span>{t("dashboard.runtime_last_server_change", "Last server change")}</span>
          <strong>{formatDateTime(systemVersion?.last_server_state_change_at ?? null)}</strong>
        </div>
        <div className="runtime-overview-row">
          <span>{t("dashboard.runtime_version", "System version")}</span>
          <strong>{systemVersion?.version ?? "-"}</strong>
        </div>
      </div>
    </Panel>
  );
}

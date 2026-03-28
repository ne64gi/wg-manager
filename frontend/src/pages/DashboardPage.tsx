import { useMemo } from "react";

import { formatBytes, formatDateTime } from "../lib/format";
import { t } from "../core/i18n";
import { getDashboardPanelsForSlot, type DashboardPanelEntry } from "../modules/dashboard/panelRegistry";
import { DashboardRuntimePanel } from "../modules/dashboard/DashboardRuntimePanel";
import { DashboardTimelinePanel } from "../modules/dashboard/DashboardTimelinePanel";
import { DashboardTopologyPanel } from "../modules/dashboard/DashboardTopologyPanel";
import { translateDriftReason, useDashboardData } from "../modules/dashboard/useDashboardData";
import { StatCard, Panel } from "../design/ui/Cards";

export function DashboardPage() {
  const {
    overview,
    historyPoints,
    historyWindowHours,
    syncState,
    systemVersion,
    hasRuntimeDrift,
    hasPendingGeneration,
    topologyGroups,
    setHistoryWindowHours,
    applyMutation,
  } = useDashboardData();
  const dashboardPanels = useMemo<DashboardPanelEntry[]>(
    () => [
      {
        id: "sync-state",
        slot: "dashboard-top-sync",
        spanClassName: "dashboard-panel-span-5",
        content: (
          <Panel title={t("dashboard.sync_state", "Apply and drift status")}>
            <div className="page-stack" data-testid="dashboard-sync-state">
              <div className="action-row">
                <div className={`status-pill ${syncState?.status === "synced" ? "status-pill-online" : ""}`}>
                  {syncState?.status === "synced"
                    ? t("dashboard.sync_synced", "Synced")
                    : syncState?.status === "runtime_unavailable"
                      ? t("dashboard.sync_unavailable", "Runtime unavailable")
                      : t("dashboard.sync_drifted", "Apply required")}
                </div>
                {hasRuntimeDrift ? (
                  <button
                    className="secondary-button"
                    onClick={() => applyMutation.mutate()}
                    disabled={applyMutation.isPending}
                    data-testid="dashboard-apply-button"
                  >
                    {applyMutation.isPending
                      ? t("peers.applying", "Applying...")
                      : t("peers.apply", "Apply config")}
                  </button>
                ) : null}
              </div>
              <div className="muted-text">
                {t("dashboard.sync_counts", "Desired peers:")} {syncState?.desired_peer_count ?? 0} /{" "}
                {t("dashboard.sync_runtime", "Runtime peers:")} {syncState?.runtime_peer_count ?? 0}
              </div>
              <div className="muted-text">
                {t("dashboard.sync_pending_generation", "Pending config generation:")}{" "}
                {syncState?.pending_generation_count ?? 0}
              </div>
              <div className="muted-text">
                {t("dashboard.sync_last_generated", "Last generated:")}{" "}
                {formatDateTime(syncState?.last_generated_at ?? null)}
              </div>
              {hasPendingGeneration ? (
                <div className="info-banner">
                  {t(
                    "dashboard.pending_generation_notice",
                    "{count} peer configurations have not been revealed or downloaded yet. Use Reveal or bulk download when needed.",
                  ).replace("{count}", String(syncState?.pending_generation_count ?? 0))}
                </div>
              ) : null}
              {hasRuntimeDrift ? (
                <div className="page-stack">
                  {syncState?.drift_reasons.map((reason) => (
                    <div className="warning-banner" key={reason}>
                      {translateDriftReason(reason)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted-text">
                  {syncState?.status === "runtime_unavailable"
                    ? t(
                        "dashboard.sync_runtime_unavailable_detail",
                        "Could not read the WireGuard runtime state. Check runtime connectivity.",
                      )
                    : t("dashboard.sync_healthy", "Runtime state matches the desired WireGuard state.")}
                </div>
              )}
            </div>
          </Panel>
        ),
      },
      {
        id: "timeline",
        slot: "dashboard-top-timeline",
        spanClassName: "dashboard-panel-span-4",
        content: (
          <DashboardTimelinePanel
            historyPoints={historyPoints}
            historyWindowHours={historyWindowHours}
            onHistoryWindowHoursChange={setHistoryWindowHours}
          />
        ),
      },
      {
        id: "runtime-overview",
        slot: "dashboard-top-side",
        spanClassName: "dashboard-panel-span-3 dashboard-side-stack",
        content: <DashboardRuntimePanel overview={overview} syncState={syncState} systemVersion={systemVersion} />,
      },
      {
        id: "topology",
        slot: "dashboard-bottom-topology",
        spanClassName: "dashboard-panel-span-12",
        content: <DashboardTopologyPanel topologyGroups={topologyGroups} />,
      },
    ],
    [
      applyMutation,
      hasPendingGeneration,
      hasRuntimeDrift,
      historyPoints,
      historyWindowHours,
      overview,
      setHistoryWindowHours,
      syncState,
      systemVersion,
      topologyGroups,
    ],
  );

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("nav.dashboard", "Dashboard")}</div>
          <h1>{t("dashboard.title", "System overview")}</h1>
        </div>
      </div>

      <div className="stats-grid dashboard-stats-grid">
        <StatCard title={t("dashboard.total_peers", "Total peers")} value={`${overview?.peer_count ?? 0}`} />
        <StatCard
          title={t("dashboard.online_peers", "Online peers")}
          value={`${overview?.online_peer_count ?? 0}`}
          accent="#79d483"
        />
        <StatCard
          title={t("dashboard.traffic", "Traffic")}
          value={`${formatBytes(overview?.total_received_bytes ?? 0)} / ${formatBytes(
            overview?.total_sent_bytes ?? 0,
          )}`}
        />
        <StatCard title={t("dashboard.total_usage", "Total usage")} value={formatBytes(overview?.total_usage_bytes ?? 0)} />
      </div>

      <div className="two-column-grid dashboard-top-grid">
        {getDashboardPanelsForSlot("dashboard-top-sync", dashboardPanels).map((panel) => (
          <div className={panel.spanClassName} key={panel.id}>
            {panel.content}
          </div>
        ))}
        {getDashboardPanelsForSlot("dashboard-top-timeline", dashboardPanels).map((panel) => (
          <div className={panel.spanClassName} key={panel.id}>
            {panel.content}
          </div>
        ))}
        {getDashboardPanelsForSlot("dashboard-top-side", dashboardPanels).map((panel) => (
          <div className={panel.spanClassName} key={panel.id}>
            {panel.content}
          </div>
        ))}
        {getDashboardPanelsForSlot("dashboard-bottom-topology", dashboardPanels).map((panel) => (
          <div className={panel.spanClassName} key={panel.id}>
            {panel.content}
          </div>
        ))}
      </div>
    </div>
  );
}

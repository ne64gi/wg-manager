import { useMemo } from "react";

import { formatBytes, formatDateTime } from "../lib/format";
import { t } from "../core/i18n";
import { getDashboardPanelsForSlot, type DashboardPanelEntry } from "../modules/dashboard/panelRegistry";
import { translateDriftReason, useDashboardData } from "../modules/dashboard/useDashboardData";
import { StatCard, Panel } from "../design/ui/Cards";

export function DashboardPage() {
  const {
    overview,
    historyPoints,
    syncState,
    systemVersion,
    hasRuntimeDrift,
    hasPendingGeneration,
    timelinePath,
    onlinePath,
    topologyGroups,
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
          <Panel title={t("dashboard.timeline", "Traffic timeline (24h)")}>
            <div className="chart-placeholder">
              <div className="chart-grid" />
              {timelinePath ? (
                <svg
                  className="chart-svg"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path className="chart-area" d={`${timelinePath} L 100 100 L 0 100 Z`} />
                  <path className="chart-stroke" d={timelinePath} />
                  <path className="chart-stroke-secondary" d={onlinePath ?? timelinePath} />
                </svg>
              ) : null}
              <div className="chart-overlay">
                <div className="chart-overlay-title">
                  {historyPoints.length > 0
                    ? `${historyPoints.length} ${t("dashboard.timeline_recorded", "traffic snapshots recorded")}`
                    : t("dashboard.timeline_ready", "History collection warming up")}
                </div>
                <div className="muted-text">
                  {historyPoints.length > 0
                    ? `${t("dashboard.timeline_latest", "Latest total usage")}: ${formatBytes(
                        historyPoints[historyPoints.length - 1]?.total_usage_bytes ?? 0,
                      )}`
                    : t(
                        "dashboard.timeline_ready_desc",
                        "The chart area is ready and will populate as snapshot points accumulate.",
                      )}
                </div>
              </div>
            </div>
          </Panel>
        ),
      },
      {
        id: "runtime-overview",
        slot: "dashboard-top-side",
        spanClassName: "dashboard-panel-span-3 dashboard-side-stack",
        content: (
          <Panel title={t("dashboard.runtime_overview", "Runtime and system")}>
            <div className="runtime-overview-list">
              <div className="runtime-overview-row">
                <span>{t("dashboard.runtime_interface", "Interface")}</span>
                <strong>{overview?.interface_name ?? syncState?.interface_name ?? "wg0"}</strong>
              </div>
              <div className="runtime-overview-row">
                <span>{t("dashboard.runtime_adapter", "Runtime adapter")}</span>
                <strong>{systemVersion?.runtime_adapter ?? "-"}</strong>
              </div>
              <div className="runtime-overview-row">
                <span>{t("dashboard.runtime_online", "Online / total")}</span>
                <strong>{overview?.online_peer_count ?? 0}/{overview?.peer_count ?? 0}</strong>
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
                <span>{t("dashboard.runtime_version", "System version")}</span>
                <strong>{systemVersion?.version ?? "-"}</strong>
              </div>
            </div>
            <div className="muted-text">
              {t(
                "dashboard.runtime_panel_hint",
                "This side slot is intentionally replaceable so future dashboard panels can swap in here.",
              )}
            </div>
          </Panel>
        ),
      },
      {
        id: "topology",
        slot: "dashboard-bottom-topology",
        spanClassName: "dashboard-panel-span-12",
        content: (
          <Panel title={t("dashboard.topology_preview", "Network topology preview")}>
            <div className="topology-preview" data-testid="dashboard-topology-preview">
              {topologyGroups.length ? (
                topologyGroups.map((group) => (
                  <section className="topology-group" key={group.groupId}>
                    <div className="topology-node topology-node-group">
                      <div className="topology-node-title">{group.groupName}</div>
                      <div className="topology-node-subtitle">
                        {group.scope} · {group.userCount} {t("nav.users", "Users")} · {group.peerCount}{" "}
                        {t("table.peers", "Peers")}
                      </div>
                    </div>
                    <div className="topology-user-list">
                      {group.users.length ? (
                        group.users.map((user) => (
                          <div className="topology-user-branch" key={user.user_id}>
                            <div className="topology-connector" aria-hidden="true" />
                            <div className="topology-node topology-node-user">
                              <div className="topology-node-title">{user.user_name}</div>
                              <div className="topology-node-subtitle">
                                {user.peer_count} {t("table.peers", "Peers")} · {user.online_peer_count}{" "}
                                {t("table.online", "Online")}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="muted-text">
                          {t("dashboard.no_topology_users", "No user nodes available for this group yet.")}
                        </div>
                      )}
                    </div>
                  </section>
                ))
              ) : (
                <div className="muted-text">
                  {t("dashboard.no_topology_data", "Topology preview will appear once groups and users exist.")}
                </div>
              )}
            </div>
          </Panel>
        ),
      },
    ],
    [
      applyMutation,
      hasPendingGeneration,
      hasRuntimeDrift,
      historyPoints,
      onlinePath,
      overview,
      syncState,
      systemVersion,
      timelinePath,
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

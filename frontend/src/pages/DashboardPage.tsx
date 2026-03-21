import { useQuery } from "@tanstack/react-query";

import {
  getGroupSummaries,
  getOverview,
  getOverviewHistory,
  getSyncState,
  getUserSummaries,
} from "../lib/api";
import { formatBytes, formatDateTime } from "../lib/format";
import { t } from "../lib/i18n";
import { useAuth } from "../modules/auth/AuthContext";
import { useGuiSettingsQuery } from "../modules/gui/useGuiSettingsQuery";
import { queryKeys } from "../modules/queryKeys";
import { StatCard, Panel } from "../ui/Cards";
import { DataTable } from "../ui/Table";

export function DashboardPage() {
  const auth = useAuth();
  const guiSettingsQuery = useGuiSettingsQuery();
  const overviewRefreshMs =
    (guiSettingsQuery.data?.overview_refresh_seconds ?? 5) * 1000;

  const overviewQuery = useQuery({
    queryKey: queryKeys.overview,
    queryFn: async () => getOverview((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: overviewRefreshMs,
  });
  const usersQuery = useQuery({
    queryKey: queryKeys.userSummaries,
    queryFn: async () => getUserSummaries((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: overviewRefreshMs,
  });
  const groupsQuery = useQuery({
    queryKey: queryKeys.groupSummaries,
    queryFn: async () => getGroupSummaries((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: overviewRefreshMs,
  });
  const historyQuery = useQuery({
    queryKey: queryKeys.overviewHistory(24),
    queryFn: async () => getOverviewHistory((await auth.getValidAccessToken()) ?? "", 24),
    refetchInterval: overviewRefreshMs,
  });
  const syncStateQuery = useQuery({
    queryKey: queryKeys.syncState,
    queryFn: async () => getSyncState((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: overviewRefreshMs,
  });

  const overview = overviewQuery.data;
  const syncState = syncStateQuery.data;
  const historyPoints = historyQuery.data ?? [];
  const timelinePath = buildTimelinePath(historyPoints.map((point) => point.total_usage_bytes));
  const onlinePath = buildTimelinePath(historyPoints.map((point) => point.online_peer_count));

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("nav.dashboard", "Dashboard")}</div>
          <h1>{t("dashboard.title", "System overview")}</h1>
        </div>
      </div>

      <div className="stats-grid">
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

      <div className="two-column-grid">
        <Panel title={t("dashboard.sync_state", "Apply and drift status")}>
          <div className="page-stack">
            <div className={`status-pill ${syncState?.status === "synced" ? "status-online" : ""}`}>
              {syncState?.status === "synced"
                ? t("dashboard.sync_synced", "Synced")
                : syncState?.status === "runtime_unavailable"
                  ? t("dashboard.sync_unavailable", "Runtime unavailable")
                  : t("dashboard.sync_drifted", "Apply required")}
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
            {syncState?.drift_reasons?.length ? (
              <div className="page-stack">
                {syncState.drift_reasons.map((reason) => (
                  <div className="warning-banner" key={reason}>{reason}</div>
                ))}
              </div>
            ) : (
              <div className="muted-text">
                {t("dashboard.sync_healthy", "Runtime state matches the desired WireGuard state.")}
              </div>
            )}
          </div>
        </Panel>
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
        <Panel title={t("dashboard.group_online", "Online peers by group")}>
          <div className="bar-list">
            {(groupsQuery.data ?? []).map((item) => {
              const width =
                item.peer_count > 0
                  ? Math.max(8, Math.round((item.online_peer_count / item.peer_count) * 100))
                  : 0;
              return (
                <div className="bar-row" key={item.group_id}>
                  <div className="bar-row-header">
                    <span>{item.group_name}</span>
                    <span>
                      {item.online_peer_count}/{item.peer_count}
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
            {groupsQuery.data?.length ? null : (
              <div className="muted-text">{t("dashboard.no_group_data", "No group summary data yet.")}</div>
            )}
          </div>
        </Panel>
      </div>

      <div className="two-column-grid">
        <Panel title={t("dashboard.user_traffic", "User traffic")}>
          <DataTable headers={[t("table.user", "User"), t("table.group", "Group"), t("table.peers", "Peers"), t("table.online", "Online"), t("table.traffic", "Traffic")]}>
            {(usersQuery.data ?? []).map((item) => (
              <tr key={item.user_id}>
                <td>{item.user_name}</td>
                <td>{item.group_name}</td>
                <td>{item.peer_count}</td>
                <td>{item.online_peer_count}</td>
                <td>{formatBytes(item.total_usage_bytes)}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>
        <Panel title={t("dashboard.group_traffic", "Group traffic")}>
          <DataTable headers={[t("table.group", "Group"), t("table.scope", "Scope"), t("nav.users", "Users"), t("table.peers", "Peers"), t("table.traffic", "Traffic")]}>
            {(groupsQuery.data ?? []).map((item) => (
              <tr key={item.group_id}>
                <td>{item.group_name}</td>
                <td>{item.group_scope}</td>
                <td>{item.user_count}</td>
                <td>{item.peer_count}</td>
                <td>{formatBytes(item.total_usage_bytes)}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>
    </div>
  );
}

function buildTimelinePath(values: number[]): string | null {
  if (values.length === 0) {
    return null;
  }

  if (values.length === 1) {
    const y = 52;
    return `M 0 ${y} L 100 ${y}`;
  }

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = Math.max(1, maxValue - minValue);

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const normalized = (value - minValue) / range;
      const y = 88 - normalized * 58;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

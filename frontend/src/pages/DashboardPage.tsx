import { useQuery } from "@tanstack/react-query";

import {
  getGroupSummaries,
  getOverview,
  getOverviewHistory,
  getUserSummaries,
} from "../lib/api";
import { formatBytes } from "../lib/format";
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

  const overview = overviewQuery.data;
  const historyPoints = historyQuery.data ?? [];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1>WireGuard fleet overview</h1>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Total peers" value={`${overview?.peer_count ?? 0}`} />
        <StatCard
          title="Online peers"
          value={`${overview?.online_peer_count ?? 0}`}
          accent="#79d483"
        />
        <StatCard
          title="Traffic"
          value={`${formatBytes(overview?.total_received_bytes ?? 0)} / ${formatBytes(
            overview?.total_sent_bytes ?? 0,
          )}`}
        />
        <StatCard
          title="Total usage"
          value={formatBytes(overview?.total_usage_bytes ?? 0)}
        />
      </div>

      <div className="two-column-grid">
        <Panel title="Traffic timeline (24h)">
          <div className="chart-placeholder">
            <div className="chart-grid" />
            <div className="chart-line chart-line-primary" />
            <div className="chart-line chart-line-secondary" />
            <div className="chart-overlay">
              <div className="chart-overlay-title">
                {historyPoints.length > 0
                  ? `${historyPoints.length} traffic snapshots recorded`
                  : "History collection warming up"}
              </div>
              <div className="muted-text">
                {historyPoints.length > 0
                  ? `Latest total usage: ${formatBytes(
                      historyPoints[historyPoints.length - 1]?.total_usage_bytes ?? 0,
                    )}`
                  : "The chart area is ready and will populate as snapshot points accumulate."}
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="Online peers by group">
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
              <div className="muted-text">No group summary data yet.</div>
            )}
          </div>
        </Panel>
      </div>

      <div className="two-column-grid">
        <Panel title="User traffic">
          <DataTable headers={["User", "Group", "Peers", "Online", "Traffic"]}>
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
        <Panel title="Group traffic">
          <DataTable headers={["Group", "Scope", "Users", "Peers", "Traffic"]}>
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

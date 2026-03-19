import { useQuery } from "@tanstack/react-query";

import { getGroupSummaries, getOverview, getUserSummaries } from "../lib/api";
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

  const overview = overviewQuery.data;

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

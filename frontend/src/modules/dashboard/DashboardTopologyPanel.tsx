import { t } from "../../core/i18n";
import { formatBytes, formatRelativeTime } from "../../lib/format";
import type { TopologyGroup } from "../../types";
import { Panel } from "../../design/ui/Cards";

export function DashboardTopologyPanel({
  topologyGroups,
}: {
  topologyGroups: TopologyGroup[];
}) {
  return (
    <Panel title={t("dashboard.topology_preview", "Network topology preview")}>
      <div className="topology-preview" data-testid="dashboard-topology-preview">
        {topologyGroups.length ? (
          topologyGroups.map((group) => (
            <section className="topology-group" key={group.group_id}>
              <div className="topology-node topology-node-group">
                <div className="topology-node-title">{group.group_name}</div>
                <div className="topology-node-subtitle">
                  {group.group_scope} · {group.user_count} {t("nav.users", "Users")} · {group.peer_count}{" "}
                  {t("table.peers", "Peers")} · {group.online_peer_count} {t("table.online", "Online")}
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
                        <div className="topology-peer-list">
                          {user.peers.map((peer) => (
                            <div className="topology-peer-chip" key={peer.peer_id}>
                              <div className="topology-peer-name-row">
                                <span className="topology-peer-name">{peer.peer_name}</span>
                                <span className={`status-pill ${peer.is_online ? "status-pill-online" : ""}`}>
                                  {peer.is_online
                                    ? t("common.online", "Online")
                                    : t("common.offline", "Offline")}
                                </span>
                              </div>
                              <div className="topology-peer-meta">
                                {peer.assigned_ip} · {formatBytes(peer.total_bytes)} ·{" "}
                                {formatRelativeTime(peer.latest_handshake_at)}
                              </div>
                            </div>
                          ))}
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
  );
}

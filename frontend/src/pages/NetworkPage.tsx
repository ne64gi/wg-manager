import { useMemo, useState, type CSSProperties } from "react";

import { Panel, StatCard } from "../design/ui/Cards";
import { t } from "../core/i18n";
import { formatDateTime } from "../lib/format";
import { useNetworkPageData } from "../modules/network/useNetworkPageData";
import type { TopologyGroup, TopologyPeer, TopologyUser } from "../types";

type LayoutMode = "constellation" | "stacked";
type NetworkSceneVars = CSSProperties & Record<string, string>;

export function NetworkPage() {
  const { topologyGroups, metrics, isLoading } = useNetworkPageData();
  const [selectedGroupId, setSelectedGroupId] = useState<number | "all">("all");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("constellation");
  const [autoRotate, setAutoRotate] = useState(true);

  const visibleGroups = useMemo(
    () =>
      selectedGroupId === "all"
        ? topologyGroups
        : topologyGroups.filter((group) => group.group_id === selectedGroupId),
    [selectedGroupId, topologyGroups],
  );

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("nav.network", "Network")}</div>
          <h1 data-testid="network-page-heading">{t("network.title", "Network map")}</h1>
          <p className="page-subtitle">
            {t(
              "network.subtitle",
              "Render the current Group -> User -> Peer topology as a 3D-friendly scene that can later be replaced by a richer renderer.",
            )}
          </p>
        </div>
      </div>

      <div className="stats-grid network-stats-grid">
        <StatCard title={t("network.groups", "Groups")} value={`${metrics.totalGroups}`} />
        <StatCard title={t("network.users", "Users")} value={`${metrics.totalUsers}`} />
        <StatCard
          title={t("network.online_peers", "Online peers")}
          value={`${metrics.onlinePeers}`}
          accent="#79d483"
        />
        <StatCard title={t("network.hidden_peers", "Hidden / unrevealed")} value={`${metrics.hiddenPeers}`} />
      </div>

      <div className="two-column-grid network-layout-grid">
        <div className="dashboard-panel-span-8">
          <Panel
            title={t("network.scene", "3D topology scene")}
            actions={
              <div className="network-toolbar">
                <select
                  value={selectedGroupId}
                  onChange={(event) =>
                    setSelectedGroupId(
                      event.target.value === "all" ? "all" : Number(event.target.value),
                    )
                  }
                >
                  <option value="all">{t("network.all_groups", "All groups")}</option>
                  {topologyGroups.map((group) => (
                    <option key={group.group_id} value={group.group_id}>
                      {group.group_name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`secondary-button ${layoutMode === "constellation" ? "secondary-button-active" : ""}`}
                  onClick={() => setLayoutMode("constellation")}
                >
                  {t("network.layout_constellation", "Constellation")}
                </button>
                <button
                  type="button"
                  className={`secondary-button ${layoutMode === "stacked" ? "secondary-button-active" : ""}`}
                  onClick={() => setLayoutMode("stacked")}
                >
                  {t("network.layout_stacked", "Stacked")}
                </button>
                <button
                  type="button"
                  className={`secondary-button ${autoRotate ? "secondary-button-active" : ""}`}
                  onClick={() => setAutoRotate((current) => !current)}
                >
                  {autoRotate ? t("network.rotation_on", "Auto-rotate on") : t("network.rotation_off", "Auto-rotate off")}
                </button>
              </div>
            }
          >
            {visibleGroups.length ? (
              <div
                className={`network-scene-shell ${autoRotate ? "network-scene-shell-rotating" : ""}`}
                data-testid="network-3d-scene"
              >
                <div className={`network-scene network-scene-${layoutMode}`}>
                  <div className="network-scene-grid" aria-hidden="true" />
                  {visibleGroups.map((group, index) => (
                    <NetworkCluster
                      group={group}
                      groupIndex={index}
                      groupCount={visibleGroups.length}
                      key={group.group_id}
                      layoutMode={layoutMode}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="network-empty-state">
                <strong>{t("network.no_data", "No network nodes are available yet.")}</strong>
                <span>
                  {isLoading
                    ? t("network.loading", "Loading topology...")
                    : t("network.no_data_hint", "Create groups, users, and peers to populate this map.")}
                </span>
              </div>
            )}
          </Panel>
        </div>

        <div className="dashboard-panel-span-4 network-side-stack">
          <Panel title={t("network.legend", "Legend")}>
            <div className="network-legend-list">
              <div className="network-legend-item">
                <span className="network-dot network-dot-group" />
                <div>
                  <strong>{t("table.group", "Group")}</strong>
                  <div className="muted-text">{t("network.legend_group", "Network plane and allocation boundary.")}</div>
                </div>
              </div>
              <div className="network-legend-item">
                <span className="network-dot network-dot-user" />
                <div>
                  <strong>{t("table.user", "User")}</strong>
                  <div className="muted-text">{t("network.legend_user", "Operator-owned identity hub.")}</div>
                </div>
              </div>
              <div className="network-legend-item">
                <span className="network-dot network-dot-peer" />
                <div>
                  <strong>{t("table.peers", "Peers")}</strong>
                  <div className="muted-text">{t("network.legend_peer", "Client endpoints orbiting each user node.")}</div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title={t("network.focus_summary", "Focus summary")}>
            <div className="network-group-summary-list">
              {visibleGroups.map((group) => (
                <section className="network-group-summary" key={group.group_id}>
                  <div className="network-group-summary-header">
                    <strong>{group.group_name}</strong>
                    <span className={`status-pill ${group.online_peer_count ? "status-pill-online" : ""}`}>
                      {group.online_peer_count} / {group.peer_count}
                    </span>
                  </div>
                  <div className="muted-text">
                    {group.group_scope} · {group.user_count} {t("network.users", "Users")}
                  </div>
                  <div className="network-mini-user-list">
                    {group.users.map((user) => (
                      <div className="network-mini-user" key={user.user_id}>
                        <span>{user.user_name}</span>
                        <span>
                          {user.online_peer_count}/{user.peer_count}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function NetworkCluster({
  group,
  groupIndex,
  groupCount,
  layoutMode,
}: {
  group: TopologyGroup;
  groupIndex: number;
  groupCount: number;
  layoutMode: LayoutMode;
}) {
  const baseX = (groupIndex - (groupCount - 1) / 2) * (layoutMode === "stacked" ? 220 : 320);
  const baseZ = layoutMode === "stacked" ? groupIndex * -120 : groupIndex % 2 === 0 ? -60 : 70;
  const style: NetworkSceneVars = {
    "--network-cluster-x": `${baseX}px`,
    "--network-cluster-z": `${baseZ}px`,
    "--network-cluster-tilt": layoutMode === "stacked" ? "12deg" : "18deg",
  };

  return (
    <section className="network-cluster-3d" style={style}>
      <div className="network-cluster-surface">
        <div className="network-cluster-card">
          <div className="network-cluster-title-row">
            <strong>{group.group_name}</strong>
            <span className={`status-pill ${group.online_peer_count ? "status-pill-online" : ""}`}>
              {group.online_peer_count} {t("table.online", "Online")}
            </span>
          </div>
          <div className="network-cluster-meta">
            {group.group_scope} · {group.user_count} {t("network.users", "Users")} · {group.peer_count}{" "}
            {t("table.peers", "Peers")}
          </div>
        </div>
        <div className="network-user-layer">
          {group.users.map((user, index) => (
            <NetworkUserNode
              key={user.user_id}
              layoutMode={layoutMode}
              user={user}
              userCount={group.users.length}
              userIndex={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function NetworkUserNode({
  user,
  userIndex,
  userCount,
  layoutMode,
}: {
  user: TopologyUser;
  userIndex: number;
  userCount: number;
  layoutMode: LayoutMode;
}) {
  const columnX = (userIndex - (userCount - 1) / 2) * (layoutMode === "stacked" ? 110 : 140);
  const columnZ = layoutMode === "stacked" ? userIndex * -35 : userIndex % 2 === 0 ? 30 : -20;
  const style: NetworkSceneVars = {
    "--network-user-x": `${columnX}px`,
    "--network-user-z": `${columnZ}px`,
  };

  return (
    <div className="network-user-node-3d" style={style}>
      <div className="network-user-card">
        <strong>{user.user_name}</strong>
        <span>
          {user.online_peer_count}/{user.peer_count} {t("table.online", "Online")}
        </span>
      </div>
      <div className="network-peer-ring">
        {user.peers.map((peer, index) => (
          <NetworkPeerNode key={peer.peer_id} peer={peer} peerCount={user.peers.length} peerIndex={index} />
        ))}
      </div>
    </div>
  );
}

function NetworkPeerNode({
  peer,
  peerIndex,
  peerCount,
}: {
  peer: TopologyPeer;
  peerIndex: number;
  peerCount: number;
}) {
  const angle = (Math.PI * 2 * peerIndex) / Math.max(peerCount, 1);
  const radius = peerCount > 1 ? 58 : 0;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const style: NetworkSceneVars = {
    "--network-peer-x": `${x.toFixed(2)}px`,
    "--network-peer-z": `${z.toFixed(2)}px`,
  };

  return (
    <div
      className={`network-peer-node-3d ${peer.is_online ? "network-peer-node-online" : ""} ${
        peer.is_revealed ? "" : "network-peer-node-hidden"
      }`}
      style={style}
      title={`${peer.peer_name} · ${peer.assigned_ip}`}
    >
      <span className="network-peer-name">{peer.peer_name}</span>
      <span className="network-peer-ip">{peer.assigned_ip}</span>
      <span className="network-peer-stamp">
        {peer.latest_handshake_at
          ? formatDateTime(peer.latest_handshake_at)
          : t("network.no_handshake", "No handshake yet")}
      </span>
    </div>
  );
}

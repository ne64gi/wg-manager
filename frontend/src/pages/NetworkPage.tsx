import { useMemo, useState } from "react";

import { Panel, StatCard } from "../design/ui/Cards";
import { t } from "../core/i18n";
import { formatBytes } from "../lib/format";
import {
  NetworkGraph,
  type NetworkGraphLayout,
  type NetworkGraphSelection,
} from "../modules/network/NetworkGraph";
import { useNetworkPageData } from "../modules/network/useNetworkPageData";

export function NetworkPage() {
  const { topologyGroups, metrics, isLoading } = useNetworkPageData();
  const [selectedGroupId, setSelectedGroupId] = useState<number | "all">("all");
  const [layoutMode, setLayoutMode] = useState<NetworkGraphLayout>("organic");
  const [selection, setSelection] = useState<NetworkGraphSelection>(null);

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
              "Read the current Group -> User -> Peer relationships as an operator-friendly graph instead of a decorative 3D scene.",
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

      <div className="dashboard-top-grid network-layout-grid">
        <div className="dashboard-panel-span-12">
          <Panel
            title={t("network.scene", "Relationship graph")}
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
                  className={`secondary-button ${layoutMode === "organic" ? "secondary-button-active" : ""}`}
                  onClick={() => setLayoutMode("organic")}
                >
                  {t("network.layout_organic", "Organic")}
                </button>
                <button
                  type="button"
                  className={`secondary-button ${layoutMode === "hierarchy" ? "secondary-button-active" : ""}`}
                  onClick={() => setLayoutMode("hierarchy")}
                >
                  {t("network.layout_hierarchy", "Hierarchy")}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setSelection(null)}
                >
                  {t("network.clear_selection", "Clear selection")}
                </button>
              </div>
            }
          >
            {visibleGroups.length ? (
              <div className="network-graph-shell">
                <NetworkGraph
                  groups={visibleGroups}
                  layoutMode={layoutMode}
                  onSelectionChange={setSelection}
                />
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
      </div>

      <div className="dashboard-bottom-grid network-inspector-grid">
        <div className="dashboard-panel-span-6 network-side-stack">
          <Panel title={t("network.legend", "Legend")}>
            <div className="network-legend-list">
              <div className="network-legend-item">
                <span className="network-dot network-dot-server" />
                <div>
                  <strong>{t("network.server", "Server")}</strong>
                  <div className="muted-text">{t("network.server_subtitle", "WireGuard control plane root")}</div>
                </div>
              </div>
              <div className="network-legend-item">
                <span className="network-dot network-dot-group" />
                <div>
                  <strong>{t("table.group", "Group")}</strong>
                  <div className="muted-text">{t("network.legend_group", "Allocation boundary and policy scope.")}</div>
                </div>
              </div>
              <div className="network-legend-item">
                <span className="network-dot network-dot-user" />
                <div>
                  <strong>{t("table.user", "User")}</strong>
                  <div className="muted-text">{t("network.legend_user", "Identity hub between groups and client peers.")}</div>
                </div>
              </div>
              <div className="network-legend-item">
                <span className="network-dot network-dot-peer" />
                <div>
                  <strong>{t("table.peers", "Peers")}</strong>
                  <div className="muted-text">{t("network.legend_peer", "Client endpoints with status and traffic context.")}</div>
                </div>
              </div>
              <div className="muted-text network-legend-note">
                {t(
                  "network.legend_status_note",
                  "Green border means online, gray means offline, dashed means not revealed, and faded means inactive.",
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="dashboard-panel-span-6 network-side-stack">
          <Panel title={t("network.focus_details", "Node details")}>
            {selection ? (
              <div className="network-detail-card">
                <div>
                  <strong>{selection.title}</strong>
                  <div className="muted-text">{selection.subtitle}</div>
                </div>
                <div className="network-detail-list">
                  {selection.metrics.map((metric) => (
                    <div className="network-detail-row" key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="network-selection-empty">
                <strong>{t("network.focus_none", "Select a node to inspect it.")}</strong>
                <span className="muted-text">
                  {t(
                    "network.focus_none_hint",
                    "Group, user, and peer nodes expose scope, membership, traffic, and last-seen context.",
                  )}
                </span>
              </div>
            )}
          </Panel>
        </div>
      </div>

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
              <div className="network-summary-traffic">
                {formatBytes(
                  group.users.reduce(
                    (sum, user) => sum + user.peers.reduce((peerSum, peer) => peerSum + peer.total_bytes, 0),
                    0,
                  ),
                )}
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
  );
}

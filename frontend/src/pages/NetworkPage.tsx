import { useEffect, useMemo, useState } from "react";

import { Panel, StatCard } from "../design/ui/Cards";
import { t } from "../core/i18n";
import { formatBytes } from "../lib/format";
import {
  NetworkGraph,
  type NetworkGraphSelection,
} from "../modules/network/NetworkGraph";
import { useNetworkPageData } from "../modules/network/useNetworkPageData";

export function NetworkPage() {
  const { topologyGroups, metrics, isLoading, toggleSelectionMutation } = useNetworkPageData();
  const [selectedGroupId, setSelectedGroupId] = useState<number | "all">("all");
  const [selection, setSelection] = useState<NetworkGraphSelection>(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [graphMode, setGraphMode] = useState<"status" | "traffic">("traffic");
  const [clearSelectionToken, setClearSelectionToken] = useState(0);

  function toggleOnlineOnly() {
    setShowOnlineOnly((current) => {
      const next = !current;
      if (next) {
        setShowHiddenOnly(false);
      }
      return next;
    });
  }

  function toggleHiddenOnly() {
    setShowHiddenOnly((current) => {
      const next = !current;
      if (next) {
        setShowOnlineOnly(false);
      }
      return next;
    });
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem("wg-studio:network-view");
    if (!raw) {
      return;
    }

    try {
      const saved = JSON.parse(raw) as {
        selectedGroupId?: number | "all";
        showOnlineOnly?: boolean;
        showActiveOnly?: boolean;
        showHiddenOnly?: boolean;
        graphMode?: "status" | "traffic";
      };
      setSelectedGroupId(saved.selectedGroupId ?? "all");
      setShowOnlineOnly(saved.showOnlineOnly ?? false);
      setShowActiveOnly(saved.showActiveOnly ?? false);
      setShowHiddenOnly(saved.showHiddenOnly ?? false);
      setGraphMode(saved.graphMode ?? "traffic");
    } catch {
      // Ignore invalid persisted filter state.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      "wg-studio:network-view",
      JSON.stringify({
        selectedGroupId,
        showOnlineOnly,
        showActiveOnly,
        showHiddenOnly,
        graphMode,
      }),
    );
  }, [graphMode, selectedGroupId, showActiveOnly, showHiddenOnly, showOnlineOnly]);

  const visibleGroups = useMemo(
    () => {
      const groupScoped =
        selectedGroupId === "all"
          ? topologyGroups
          : topologyGroups.filter((group) => group.group_id === selectedGroupId);

      return groupScoped
        .map((group) => {
          const users = group.users
            .map((user) => {
              const peers = user.peers.filter((peer) => {
                if (showOnlineOnly && !peer.is_online) {
                  return false;
                }
                if (showActiveOnly && !peer.is_active) {
                  return false;
                }
                if (showHiddenOnly && peer.is_revealed) {
                  return false;
                }
                return true;
              });

              return {
                ...user,
                peer_count: peers.length,
                active_peer_count: peers.filter((peer) => peer.is_active).length,
                online_peer_count: peers.filter((peer) => peer.is_online).length,
                peers,
              };
            })
            .filter((user) => {
              if (showActiveOnly && !user.is_active && user.peers.length === 0) {
                return false;
              }
              return user.peers.length > 0 || (!showOnlineOnly && !showHiddenOnly);
            });

          return {
            ...group,
            user_count: users.length,
            peer_count: users.reduce((sum, user) => sum + user.peer_count, 0),
            active_peer_count: users.reduce((sum, user) => sum + user.active_peer_count, 0),
            online_peer_count: users.reduce((sum, user) => sum + user.online_peer_count, 0),
            users,
          };
        })
        .filter((group) => {
          if (showActiveOnly && !group.is_active && group.users.length === 0) {
            return false;
          }
          return group.users.length > 0 || (!showOnlineOnly && !showHiddenOnly);
        });
    },
    [selectedGroupId, showActiveOnly, showHiddenOnly, showOnlineOnly, topologyGroups],
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
                <div className="network-chip-row">
                  <button
                    type="button"
                    className={`toggle-chip ${showOnlineOnly ? "toggle-chip-active" : ""}`}
                    onClick={toggleOnlineOnly}
                  >
                    {t("network.filter_online", "Online only")}
                  </button>
                  <button
                    type="button"
                    className={`toggle-chip ${showActiveOnly ? "toggle-chip-active" : ""}`}
                    onClick={() => setShowActiveOnly((current) => !current)}
                  >
                    {t("network.filter_active", "Active only")}
                  </button>
                  <button
                    type="button"
                    className={`toggle-chip ${showHiddenOnly ? "toggle-chip-active" : ""}`}
                    onClick={toggleHiddenOnly}
                  >
                    {t("network.filter_hidden", "Hidden only")}
                  </button>
                </div>
                <div className="network-chip-row">
                  <button
                    type="button"
                    className={`tab-button ${graphMode === "status" ? "active" : ""}`}
                    onClick={() => setGraphMode("status")}
                  >
                    {t("network.mode_status", "Status mode")}
                  </button>
                  <button
                    type="button"
                    className={`tab-button ${graphMode === "traffic" ? "active" : ""}`}
                    onClick={() => setGraphMode("traffic")}
                  >
                    {t("network.mode_traffic", "Traffic mode")}
                  </button>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSelection(null);
                    setClearSelectionToken((current) => current + 1);
                  }}
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
                  mode={graphMode}
                  clearSelectionToken={clearSelectionToken}
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
              <div className="muted-text network-legend-note">
                {t(
                  "network.legend_size_note",
                  "Larger user and peer nodes indicate heavier traffic usage.",
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
                {selection.kind !== "server" ? (
                  <div className="network-detail-actions">
                    <div className={`status-pill ${selection.isActive ? "status-pill-online" : ""}`}>
                      {selection.isActive
                        ? t("common.enabled", "Enabled")
                        : t("common.disabled", "Disabled")}
                    </div>
                    <button
                      type="button"
                      className={selection.isActive ? "danger-button" : "secondary-button"}
                      disabled={toggleSelectionMutation.isPending}
                      onClick={() => toggleSelectionMutation.mutate(selection)}
                    >
                      {toggleSelectionMutation.isPending
                        ? t("network.updating", "Updating...")
                        : selection.isActive
                          ? t("network.disable_selected", "Disable from graph")
                          : t("network.enable_selected", "Enable from graph")}
                    </button>
                  </div>
                ) : null}
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
        <div className="network-summary-grid">
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
          <div className="network-hotspot-card">
            <div className="panel-header">
              <h2>{t("network.hotspots", "Traffic hotspots")}</h2>
            </div>
            <div className="network-hotspot-list">
              {metrics.topTalkers.map((peer) => (
                <div className="network-hotspot-row" key={peer.peerId}>
                  <div>
                    <strong>{peer.peerName}</strong>
                    <div className="muted-text">
                      {peer.userName} / {peer.groupName}
                    </div>
                  </div>
                  <div className="network-hotspot-meta">
                    <span className={`status-pill ${peer.isOnline ? "status-pill-online" : ""}`}>
                      {peer.isOnline ? t("common.online", "Online") : t("common.offline", "Offline")}
                    </span>
                    <span className="muted-text">
                      Rx {formatBytes(peer.receivedBytes)} / Tx {formatBytes(peer.sentBytes)}
                    </span>
                    <strong>{formatBytes(peer.totalBytes)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

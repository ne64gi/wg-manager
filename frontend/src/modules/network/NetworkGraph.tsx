import { useEffect, useMemo, useRef } from "react";

import cytoscape, { type ElementDefinition } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";

import { t } from "../../core/i18n";
import { formatBytes, formatDateTime, formatRelativeTime } from "../../lib/format";
import type { TopologyGroup } from "../../types";

cytoscape.use(coseBilkent);

export type NetworkGraphSelection = {
  kind: "server" | "group" | "user" | "peer";
  entityId: number | null;
  title: string;
  subtitle: string;
  isActive: boolean;
  metrics: Array<{ label: string; value: string }>;
} | null;

export function NetworkGraph({
  groups,
  mode,
  clearSelectionToken,
  onSelectionChange,
}: {
  groups: TopologyGroup[];
  mode: "status" | "traffic";
  clearSelectionToken: number;
  onSelectionChange: (selection: NetworkGraphSelection) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<cytoscape.Core | null>(null);

  const elements = useMemo(() => buildGraphElements(groups, mode), [groups, mode]);
  const hierarchyPositions = useMemo(() => buildHierarchyPositions(groups), [groups]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const graph = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#283244",
            label: "data(label)",
            color: "#f7f4f3",
            "text-wrap": "wrap",
            "text-max-width": "120px",
            "font-size": "11px",
            "font-weight": 600,
            "text-valign": "center",
            "text-halign": "center",
            "border-width": 3,
            "border-color": "#95a0b3",
            width: 110,
            height: 72,
            padding: "10px",
            "overlay-opacity": 0,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "curve-style": "bezier",
            "line-color": "#65738c",
            "target-arrow-shape": "none",
            opacity: 0.78,
          },
        },
        {
          selector: ".graph-node-server",
          style: {
            shape: "round-rectangle",
            "background-color": "#162033",
            "border-color": "#f0d06b",
            color: "#fff7d8",
            width: 196,
            height: 128,
            "font-size": "14px",
            "font-weight": 700,
            "text-max-width": "130px",
            padding: "8px",
          },
        },
        {
          selector: ".graph-node-group",
          style: {
            shape: "round-rectangle",
            "background-color": "rgba(50, 64, 87, 0.22)",
            "border-color": "#8f9db3",
            "font-size": "12px",
            "font-weight": 700,
            "text-max-width": "132px",
            "text-valign": "top",
            "text-halign": "center",
            padding: "24px",
            "border-style": "solid",
            "min-width": 280,
            "min-height": 230,
          },
        },
        {
          selector: ".graph-node-user",
          style: {
            shape: "round-rectangle",
            "background-color": "#33455c",
            "border-color": "#91a0b8",
            width: "data(nodeWidth)",
            height: "data(nodeHeight)",
            "font-size": "data(fontSize)",
            "text-max-width": "104px",
          },
        },
        {
          selector: ".graph-node-peer",
          style: {
            shape: "ellipse",
            "background-color": "#364150",
            "border-color": "#8b96a8",
            width: "data(nodeWidth)",
            height: "data(nodeHeight)",
            "font-size": "data(fontSize)",
            "text-max-width": "64px",
          },
        },
        {
          selector: ".graph-node-online",
          style: {
            "border-color": "#79d483",
            "border-width": 3,
            "shadow-blur": 16,
            "shadow-color": "#79d483",
            "shadow-opacity": 0.22,
          },
        },
        {
          selector: ".graph-node-offline",
          style: {
            "border-color": "#8d96a5",
            "shadow-opacity": 0,
          },
        },
        {
          selector: ".graph-node-hidden",
          style: {
            "border-style": "dashed",
            opacity: 0.68,
          },
        },
        {
          selector: ".graph-node-inactive",
          style: {
            opacity: 0.42,
          },
        },
        {
          selector: ".graph-dimmed",
          style: {
            opacity: 0.14,
          },
        },
        {
          selector: ".graph-emphasized",
          style: {
            opacity: 1,
          },
        },
        {
          selector: ":parent",
          style: {
            "background-opacity": 1,
            "text-margin-y": -8,
          },
        },
        {
          selector: ".graph-edge-server",
          style: {
            width: 3,
            "line-color": "#8b96a8",
          },
        },
        {
          selector: ".graph-edge-group",
          style: {
            width: 2,
            "line-color": "#75839d",
          },
        },
        {
          selector: ".graph-edge-peer",
          style: {
            width: 2,
            "line-color": "#637791",
          },
        },
        {
          selector: ".graph-edge-hidden",
          style: {
            "line-style": "dashed",
            opacity: 0.42,
          },
        },
        {
          selector: ":selected",
          style: {
            "border-color": "#f0d06b",
            "border-width": 4,
            "shadow-blur": 20,
            "shadow-color": "#f0d06b",
            "shadow-opacity": 0.28,
          },
        },
      ] as any,
    });
    graphRef.current = graph;
    graph.layout(
      ({
        name: "preset",
        fit: true,
        padding: 36,
        positions: (node: cytoscape.NodeSingular) => hierarchyPositions[node.id()] ?? node.position(),
      }) as any,
    ).run();

    const emitSelection = () => {
      const selectedNode = graph.$("node:selected").first() as cytoscape.NodeSingular;
      if (!selectedNode.nonempty()) {
        graph.elements().removeClass("graph-dimmed graph-emphasized");
        onSelectionChange(null);
        return;
      }

      const focusElements = selectedNode
        .closedNeighborhood()
        .union(selectedNode.predecessors())
        .union(selectedNode.successors())
        .union(selectedNode.ancestors())
        .union(selectedNode.descendants());
      graph.elements().addClass("graph-dimmed").removeClass("graph-emphasized");
      focusElements.removeClass("graph-dimmed").addClass("graph-emphasized");

      const data = selectedNode.data() as {
        kind: "server" | "group" | "user" | "peer";
        entityId: number | null;
        title: string;
        subtitle: string;
        isActive: boolean;
        metrics: Array<{ label: string; value: string }>;
      };

      onSelectionChange({
        kind: data.kind,
        entityId: data.entityId,
        title: data.title,
        subtitle: data.subtitle,
        isActive: data.isActive,
        metrics: data.metrics,
      });
    };

    graph.on("select unselect", "node", emitSelection);
    graph.on("tap", (event) => {
      if (event.target === graph) {
        graph.elements().unselect();
        onSelectionChange(null);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      graph.resize();
      graph.fit(undefined, 36);
    });
    resizeObserver.observe(containerRef.current);
    graph.fit(undefined, 36);

    return () => {
      resizeObserver.disconnect();
      graphRef.current = null;
      graph.destroy();
    };
  }, [elements, hierarchyPositions, onSelectionChange]);

  useEffect(() => {
    if (!graphRef.current) {
      return;
    }
    const graph = graphRef.current;

    graph.elements().unselect();
    graph.elements().removeClass("graph-dimmed graph-emphasized");
    onSelectionChange(null);
  }, [clearSelectionToken, onSelectionChange]);

  return <div className="network-graph-canvas" data-testid="network-3d-scene" ref={containerRef} />;
}

function buildGraphElements(groups: TopologyGroup[], mode: "status" | "traffic"): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  const totals = groups.reduce(
    (accumulator, group) => ({
      users: accumulator.users + group.user_count,
      peers: accumulator.peers + group.peer_count,
      onlinePeers: accumulator.onlinePeers + group.online_peer_count,
    }),
    { users: 0, peers: 0, onlinePeers: 0 },
  );
  const serverId = "server:root";

  elements.push({
    data: {
      id: serverId,
      label: `${t("network.server", "Server")}\n${groups.length} groups · ${totals.peers} peers`,
      kind: "server",
      entityId: null,
      title: t("network.server", "Server"),
      subtitle: t("network.server_subtitle", "WireGuard control plane root"),
      isActive: true,
      weight: 4,
      metrics: [
        { label: t("network.groups", "Groups"), value: String(groups.length) },
        { label: t("network.users", "Users"), value: String(totals.users) },
        { label: t("table.peers", "Peers"), value: String(totals.peers) },
        { label: t("network.online_peers", "Online peers"), value: String(totals.onlinePeers) },
      ],
    },
    classes: "graph-node-server",
  });

  for (const group of groups) {
    const groupId = `group:${group.group_id}`;
    const groupTrafficBytes = group.users.reduce(
      (sum, user) =>
        sum + user.peers.reduce((peerSum, peer) => peerSum + peer.total_bytes, 0),
      0,
    );
    elements.push({
      data: {
        id: groupId,
        label:
          mode === "traffic"
            ? `${group.group_name}\n${group.user_count} users · ${formatCompactBytes(groupTrafficBytes)}`
            : `${group.group_name}\n${group.online_peer_count}/${group.peer_count} online`,
        kind: "group",
        entityId: group.group_id,
        title: group.group_name,
        subtitle: t("table.group", "Group"),
        isActive: group.is_active,
        weight: 3,
        metrics: [
          { label: t("table.scope", "Scope"), value: group.group_scope },
          { label: t("network.users", "Users"), value: String(group.user_count) },
          { label: t("table.peers", "Peers"), value: String(group.peer_count) },
          { label: t("network.online_peers", "Online peers"), value: String(group.online_peer_count) },
          { label: t("table.traffic", "Traffic"), value: formatBytes(groupTrafficBytes) },
        ],
      },
      classes: buildClasses("graph-node-group", group.is_active, group.online_peer_count > 0, true),
    });
    elements.push({
      data: { id: `${serverId}->${groupId}`, source: serverId, target: groupId },
      classes: "graph-edge-server",
    });

    for (const user of group.users) {
      const userId = `user:${user.user_id}`;
      const userTrafficBytes = user.peers.reduce(
        (sum, peer) => sum + peer.total_bytes,
        0,
      );
      elements.push({
        data: {
          id: userId,
          parent: groupId,
          label:
            mode === "traffic"
              ? `${user.user_name}\n${user.online_peer_count}/${user.peer_count} · ${formatCompactBytes(userTrafficBytes)}`
              : `${user.user_name}\n${user.online_peer_count}/${user.peer_count} online`,
          kind: "user",
          entityId: user.user_id,
          title: user.user_name,
          subtitle: `${t("table.user", "User")} · ${group.group_name}`,
          isActive: user.is_active,
          nodeWidth: mode === "traffic" ? scaleTrafficSize(userTrafficBytes, groups, "user") : 132,
          nodeHeight: mode === "traffic" ? scaleTrafficSize(userTrafficBytes, groups, "user", true) : 88,
          fontSize: 11,
          weight: 2,
          metrics: [
            { label: t("table.group", "Group"), value: group.group_name },
            { label: t("table.peers", "Peers"), value: String(user.peer_count) },
            { label: t("network.online_peers", "Online peers"), value: String(user.online_peer_count) },
            { label: t("table.traffic", "Traffic"), value: formatBytes(userTrafficBytes) },
            {
              label: t("common.status", "Status"),
              value: user.is_active ? t("common.active", "Active") : t("common.inactive", "Inactive"),
            },
          ],
        },
        classes: buildClasses("graph-node-user", user.is_active, user.online_peer_count > 0, true),
      });
      elements.push({
        data: { id: `${groupId}->${userId}`, source: groupId, target: userId },
        classes: "graph-edge-group",
      });

      for (const peer of user.peers) {
        const peerId = `peer:${peer.peer_id}`;
        elements.push({
          data: {
            id: peerId,
            parent: groupId,
            label:
              mode === "traffic"
                ? `${peer.peer_name}\n${formatCompactBytes(peer.total_bytes)}`
                : `${peer.peer_name}\n${peer.is_online ? t("common.online", "Online") : t("common.offline", "Offline")}`,
            kind: "peer",
            entityId: peer.peer_id,
            title: peer.peer_name,
            subtitle: `${t("table.peers", "Peers")} · ${user.user_name}`,
            isActive: peer.is_active,
            nodeWidth: mode === "traffic" ? scaleTrafficSize(peer.total_bytes, groups, "peer") : 74,
            nodeHeight: mode === "traffic" ? scaleTrafficSize(peer.total_bytes, groups, "peer", true) : 74,
            fontSize: 10,
            weight: 1,
            metrics: [
              { label: t("table.user", "User"), value: user.user_name },
              { label: t("table.group", "Group"), value: group.group_name },
              { label: t("network.detail_address", "Address"), value: peer.assigned_ip },
              {
                label: t("common.status", "Status"),
                value: peer.is_online ? t("common.online", "Online") : t("common.offline", "Offline"),
              },
              {
                label: t("table.traffic", "Traffic"),
                value: formatBytes(peer.total_bytes),
              },
              {
                label: t("network.detail_last_seen", "Last seen"),
                value: peer.latest_handshake_at
                  ? `${formatRelativeTime(peer.latest_handshake_at)} · ${formatDateTime(peer.latest_handshake_at)}`
                  : t("network.no_handshake", "No handshake yet"),
              },
              {
                label: t("network.detail_revealed", "Revealed"),
                value: peer.is_revealed ? t("common.on", "On") : t("common.off", "Off"),
              },
            ],
          },
          classes: buildClasses("graph-node-peer", peer.is_active, peer.is_online, peer.is_revealed),
        });
        elements.push({
          data: { id: `${userId}->${peerId}`, source: userId, target: peerId },
          classes: `graph-edge-peer${peer.is_revealed ? "" : " graph-edge-hidden"}`,
        });
      }
    }
  }

  return elements;
}

function buildClasses(baseClass: string, isActive: boolean, isOnline: boolean, isRevealed: boolean): string {
  return [
    baseClass,
    isActive ? "" : "graph-node-inactive",
    isOnline ? "graph-node-online" : "graph-node-offline",
    isRevealed ? "" : "graph-node-hidden",
  ]
    .filter(Boolean)
    .join(" ");
}

function scaleTrafficSize(
  trafficBytes: number,
  groups: TopologyGroup[],
  kind: "user" | "peer",
  forHeight = false,
) {
  const values =
    kind === "user"
      ? groups.flatMap((group) =>
          group.users.map((user) =>
            user.peers.reduce((sum, peer) => sum + peer.total_bytes, 0),
          ),
        )
      : groups.flatMap((group) =>
          group.users.flatMap((user) => user.peers.map((peer) => peer.total_bytes)),
        );
  const maxValue = Math.max(...values, 1);
  const minSize = kind === "user" ? (forHeight ? 88 : 132) : 74;
  const maxSize = kind === "user" ? (forHeight ? 116 : 168) : 116;
  const normalized = Math.max(0, Math.min(1, trafficBytes / maxValue));

  return Math.round(minSize + (maxSize - minSize) * normalized);
}

function formatCompactBytes(value: number): string {
  if (value >= 1024 ** 3) {
    return `${(value / 1024 ** 3).toFixed(1)} GB`;
  }
  if (value >= 1024 ** 2) {
    return `${(value / 1024 ** 2).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${value} B`;
}

function buildHierarchyPositions(groups: TopologyGroup[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {
    "server:root": { x: 0, y: 0 },
  };

  const groupGapX = 420;
  const groupCenterY = 270;
  const userGapX = 170;
  const userCenterY = groupCenterY + 36;
  const peerGapX = 88;
  const peerGapY = 86;
  const peerStartY = userCenterY + 118;

  groups.forEach((group, groupIndex) => {
    const groupOffsetX = (groupIndex - (groups.length - 1) / 2) * groupGapX;

    group.users.forEach((user, userIndex) => {
      const userId = `user:${user.user_id}`;
      const userOffsetX = (userIndex - (group.users.length - 1) / 2) * userGapX;
      positions[userId] = {
        x: groupOffsetX + userOffsetX,
        y: userCenterY,
      };

      user.peers.forEach((peer, peerIndex) => {
        const peerId = `peer:${peer.peer_id}`;
        const peersInRow = Math.max(1, Math.min(3, user.peers.length));
        const row = Math.floor(peerIndex / peersInRow);
        const column = peerIndex % peersInRow;
        const centeredColumn = column - (Math.min(peersInRow, user.peers.length) - 1) / 2;

        positions[peerId] = {
          x: groupOffsetX + userOffsetX + centeredColumn * peerGapX,
          y: peerStartY + row * peerGapY,
        };
      });
    });
  });

  return positions;
}

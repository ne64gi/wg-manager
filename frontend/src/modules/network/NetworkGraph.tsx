import { useEffect, useMemo, useRef } from "react";

import cytoscape, { type ElementDefinition } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";

import { t } from "../../core/i18n";
import { formatBytes, formatDateTime, formatRelativeTime } from "../../lib/format";
import type { TopologyGroup } from "../../types";

cytoscape.use(coseBilkent);

export type NetworkGraphLayout = "organic" | "hierarchy";

export type NetworkGraphSelection = {
  kind: "server" | "group" | "user" | "peer";
  title: string;
  subtitle: string;
  metrics: Array<{ label: string; value: string }>;
} | null;

export function NetworkGraph({
  groups,
  layoutMode,
  onSelectionChange,
}: {
  groups: TopologyGroup[];
  layoutMode: NetworkGraphLayout;
  onSelectionChange: (selection: NetworkGraphSelection) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const elements = useMemo(() => buildGraphElements(groups), [groups]);

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
            width: "label",
            height: "label",
            padding: "14px",
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
            "font-size": "12px",
            "text-max-width": "150px",
            padding: "18px",
          },
        },
        {
          selector: ".graph-node-group",
          style: {
            shape: "round-rectangle",
            "background-color": "#324057",
            "border-color": "#8f9db3",
          },
        },
        {
          selector: ".graph-node-user",
          style: {
            shape: "round-rectangle",
            "background-color": "#33455c",
            "border-color": "#91a0b8",
          },
        },
        {
          selector: ".graph-node-peer",
          style: {
            shape: "ellipse",
            "background-color": "#364150",
            "border-color": "#8b96a8",
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
    graph.layout(
      (layoutMode === "hierarchy"
        ? {
            name: "breadthfirst",
            directed: true,
            roots: "[id = 'server:root']",
            spacingFactor: 1.1,
            padding: 36,
          }
        : {
            name: "concentric",
            animate: false,
            padding: 36,
            spacingFactor: 1.15,
            concentric: (node: cytoscape.NodeSingular) => {
              const weight = node.data("weight");
              return typeof weight === "number" ? weight : 0;
            },
            levelWidth: () => 1,
          }) as any,
    ).run();

    const emitSelection = () => {
      const selectedNode = graph.$("node:selected").first();
      if (!selectedNode.nonempty()) {
        onSelectionChange(null);
        return;
      }

      const data = selectedNode.data() as {
        kind: "server" | "group" | "user" | "peer";
        title: string;
        subtitle: string;
        metrics: Array<{ label: string; value: string }>;
      };

      onSelectionChange({
        kind: data.kind,
        title: data.title,
        subtitle: data.subtitle,
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
      graph.destroy();
    };
  }, [elements, layoutMode, onSelectionChange]);

  return <div className="network-graph-canvas" data-testid="network-3d-scene" ref={containerRef} />;
}

function buildGraphElements(groups: TopologyGroup[]): ElementDefinition[] {
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
      title: t("network.server", "Server"),
      subtitle: t("network.server_subtitle", "WireGuard control plane root"),
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
    elements.push({
      data: {
        id: groupId,
        label: `${group.group_name}\n${group.user_count} users · ${group.peer_count} peers`,
        kind: "group",
        title: group.group_name,
        subtitle: t("table.group", "Group"),
        weight: 3,
        metrics: [
          { label: t("table.scope", "Scope"), value: group.group_scope },
          { label: t("network.users", "Users"), value: String(group.user_count) },
          { label: t("table.peers", "Peers"), value: String(group.peer_count) },
          { label: t("network.online_peers", "Online peers"), value: String(group.online_peer_count) },
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
      elements.push({
        data: {
          id: userId,
          label: `${user.user_name}\n${user.online_peer_count}/${user.peer_count} online`,
          kind: "user",
          title: user.user_name,
          subtitle: `${t("table.user", "User")} · ${group.group_name}`,
          weight: 2,
          metrics: [
            { label: t("table.group", "Group"), value: group.group_name },
            { label: t("table.peers", "Peers"), value: String(user.peer_count) },
            { label: t("network.online_peers", "Online peers"), value: String(user.online_peer_count) },
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
            label: `${peer.peer_name}\n${peer.assigned_ip}`,
            kind: "peer",
            title: peer.peer_name,
            subtitle: `${t("table.peers", "Peers")} · ${user.user_name}`,
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

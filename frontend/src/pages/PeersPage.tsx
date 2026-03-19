import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyServerConfig,
  deletePeer,
  getPeerStatuses,
  revealPeerArtifacts,
  revokePeer,
} from "../lib/api";
import { formatBytes, formatRelativeTime } from "../lib/format";
import { useAuth } from "../modules/auth/AuthContext";
import { useGuiSettingsQuery } from "../modules/gui/useGuiSettingsQuery";
import { queryKeys } from "../modules/queryKeys";
import type { RevealedPeerArtifacts } from "../types";
import { Panel, StatCard } from "../ui/Cards";
import { RevealModal } from "../ui/RevealModal";
import { DataTable } from "../ui/Table";

export function PeersPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<RevealedPeerArtifacts | null>(null);
  const guiSettingsQuery = useGuiSettingsQuery();
  const peersRefreshMs =
    (guiSettingsQuery.data?.peers_refresh_seconds ?? 10) * 1000;

  const peerStatusesQuery = useQuery({
    queryKey: queryKeys.peerStatuses,
    queryFn: async () => getPeerStatuses((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: peersRefreshMs,
  });

  const revealMutation = useMutation({
    mutationFn: async (peerId: number) =>
      revealPeerArtifacts(peerId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async (artifacts) => {
      setRevealed(artifacts);
      await queryClient.invalidateQueries({ queryKey: queryKeys.peerStatuses });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (peerId: number) =>
      revokePeer(peerId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      if (guiSettingsQuery.data?.refresh_after_apply) {
        await applyServerConfig((await auth.getValidAccessToken()) ?? "");
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.peerStatuses });
      await queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (peerId: number) =>
      deletePeer(peerId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      if (guiSettingsQuery.data?.refresh_after_apply) {
        await applyServerConfig((await auth.getValidAccessToken()) ?? "");
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.peerStatuses });
      await queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => applyServerConfig((await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.peerStatuses });
      await queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });

  const peers = peerStatusesQuery.data ?? [];
  const onlineCount = peers.filter((peer) => peer.is_online).length;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">Peers</div>
          <h1>Peer management</h1>
        </div>
        <button className="primary-button" onClick={() => applyMutation.mutate()}>
          {applyMutation.isPending ? "Applying..." : "Apply config"}
        </button>
      </div>

      <div className="stats-grid">
        <StatCard title="Total peers" value={`${peers.length}`} />
        <StatCard title="Online" value={`${onlineCount}`} accent="#79d483" />
        <StatCard
          title="Total traffic"
          value={formatBytes(peers.reduce((sum, peer) => sum + peer.total_bytes, 0))}
        />
      </div>

      <Panel title="Peer list">
        <DataTable
          headers={[
            "Status",
            "Peer",
            "User",
            "Assigned IP",
            "Routes",
            "Handshake",
            "Traffic",
            "Reveal",
            "Actions",
          ]}
        >
          {peers.map((peer) => (
            <tr key={peer.peer_id}>
              <td>
                <span className={`status-pill ${peer.is_online ? "status-online" : ""}`}>
                  {peer.is_online ? "Online" : "Offline"}
                </span>
              </td>
              <td>{peer.peer_name}</td>
              <td>{peer.user_name}</td>
              <td>{peer.assigned_ip}</td>
              <td>{peer.effective_allowed_ips.join(", ")}</td>
              <td>{formatRelativeTime(peer.latest_handshake_at)}</td>
              <td>{formatBytes(peer.total_bytes)}</td>
              <td>{peer.is_revealed ? "Consumed" : "Pending"}</td>
              <td className="action-row">
                <button
                  className="ghost-button"
                  disabled={peer.is_revealed || revealMutation.isPending}
                  onClick={() => revealMutation.mutate(peer.peer_id)}
                >
                  Reveal
                </button>
                <button
                  className="ghost-button"
                  onClick={() => revokeMutation.mutate(peer.peer_id)}
                >
                  Revoke
                </button>
                <button
                  className="danger-button"
                  onClick={() => deleteMutation.mutate(peer.peer_id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>

      {revealed ? (
        <RevealModal artifacts={revealed} onClose={() => setRevealed(null)} />
      ) : null}
    </div>
  );
}

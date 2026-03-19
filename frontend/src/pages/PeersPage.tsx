import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyServerConfig,
  createPeer,
  deletePeer,
  getPeerStatuses,
  revealPeerArtifacts,
  revokePeer,
  listUsers,
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [assignedIp, setAssignedIp] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const guiSettingsQuery = useGuiSettingsQuery();
  const peersRefreshMs =
    (guiSettingsQuery.data?.peers_refresh_seconds ?? 10) * 1000;

  const peerStatusesQuery = useQuery({
    queryKey: queryKeys.peerStatuses,
    queryFn: async () => getPeerStatuses((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: peersRefreshMs,
  });
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => listUsers((await auth.getValidAccessToken()) ?? ""),
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      createPeer((await auth.getValidAccessToken()) ?? "", {
        user_id: Number(userId),
        name,
        assigned_ip: assignedIp || undefined,
      }),
    onSuccess: async () => {
      setCreateError(null);
      if (guiSettingsQuery.data?.refresh_after_apply) {
        await applyServerConfig((await auth.getValidAccessToken()) ?? "");
      }
      setIsCreateOpen(false);
      setUserId("");
      setName("");
      setAssignedIp("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.peers });
      await queryClient.invalidateQueries({ queryKey: queryKeys.peerStatuses });
      await queryClient.invalidateQueries({ queryKey: queryKeys.overview });
      await queryClient.invalidateQueries({ queryKey: queryKeys.overviewHistory(24) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.userSummaries });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupSummaries });
    },
    onError: (error) => {
      setCreateError(error instanceof Error ? error.message : "Failed to create peer");
    },
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
  const filteredPeers = peers.filter((peer) => {
    const needle = searchText.trim().toLowerCase();
    if (!needle) {
      return true;
    }

    return [
      peer.peer_name,
      peer.user_name,
      peer.assigned_ip,
      peer.endpoint ?? "",
      peer.effective_allowed_ips.join(" "),
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
  const onlineCount = peers.filter((peer) => peer.is_online).length;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">Peers</div>
          <h1>Peer management</h1>
        </div>
      </div>
      <div className="toolbar-card toolbar-row">
        <button className="success-button" onClick={() => setIsCreateOpen(true)}>
          + Add peer
        </button>
        <label className="toolbar-search">
          <span>Search</span>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Peer, user, IP, route..."
          />
        </label>
        <button className="secondary-button" onClick={() => applyMutation.mutate()}>
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
          {filteredPeers.map((peer) => (
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
      {isCreateOpen ? (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>Add peer</h2>
              <button className="ghost-button" onClick={() => setIsCreateOpen(false)}>
                Close
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>User</span>
                <select value={userId} onChange={(event) => setUserId(event.target.value)}>
                  <option value="">Select user</option>
                  {(usersQuery.data ?? []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="field">
                <span>Assigned IP</span>
                <input
                  value={assignedIp}
                  onChange={(event) => setAssignedIp(event.target.value)}
                  placeholder="optional"
                />
              </label>
            </div>
            {createError ? <div className="error-banner">{createError}</div> : null}
            <div className="modal-actions">
              <button
                className="primary-button"
                disabled={!userId || !name || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending
                  ? "Creating..."
                  : guiSettingsQuery.data?.refresh_after_apply
                    ? "Create and apply"
                    : "Create peer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

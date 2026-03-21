import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyServerConfig,
  createPeer,
  deletePeer,
  getPeerStatuses,
  listGroups,
  listUsers,
  reissuePeer,
  revealPeerArtifacts,
  updatePeer,
} from "../lib/api";
import { formatBytes } from "../lib/format";
import { useAuth } from "../modules/auth/AuthContext";
import { useGuiSettingsQuery } from "../modules/gui/useGuiSettingsQuery";
import { queryKeys } from "../modules/queryKeys";
import type { RevealedPeerArtifacts, User } from "../types";
import { Panel, StatCard } from "../ui/Cards";
import { MobileInfoPopover } from "../ui/MobileInfoPopover";
import { RevealModal } from "../ui/RevealModal";
import { DataTable } from "../ui/Table";
import { useToast } from "../ui/ToastProvider";

type PeerFormState = {
  userId: string;
  name: string;
  assignedIp: string;
  description: string;
  isActive: boolean;
};

const DEFAULT_CREATE_FORM: PeerFormState = {
  userId: "",
  name: "",
  assignedIp: "",
  description: "",
  isActive: true,
};

export function PeersPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<RevealedPeerArtifacts | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [createForm, setCreateForm] = useState<PeerFormState>(DEFAULT_CREATE_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const guiSettingsQuery = useGuiSettingsQuery();
  const { pushToast } = useToast();
  const peersRefreshMs = (guiSettingsQuery.data?.peers_refresh_seconds ?? 10) * 1000;

  const peerStatusesQuery = useQuery({
    queryKey: queryKeys.peerStatuses,
    queryFn: async () => getPeerStatuses((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: peersRefreshMs,
  });
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => listUsers((await auth.getValidAccessToken()) ?? ""),
  });
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => listGroups((await auth.getValidAccessToken()) ?? ""),
  });

  const users = usersQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const activeUsers = useMemo(() => users.filter((user) => user.is_active), [users]);

  async function refreshQueries() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.peers });
    await queryClient.invalidateQueries({ queryKey: queryKeys.peerStatuses });
    await queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    await queryClient.invalidateQueries({ queryKey: queryKeys.overviewHistory(24) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.userSummaries });
    await queryClient.invalidateQueries({ queryKey: queryKeys.groupSummaries });
  }

  async function applyIfNeeded(successNotice?: string) {
    if (!guiSettingsQuery.data?.refresh_after_apply) {
      if (successNotice) {
        pushToast(successNotice);
      }
      return;
    }

    try {
      await applyServerConfig((await auth.getValidAccessToken()) ?? "");
      pushToast(successNotice ?? "Config applied.");
    } catch (error) {
      pushToast(
        error instanceof Error
          ? `${successNotice ?? "Change saved."} Apply failed: ${error.message}`
          : `${successNotice ?? "Change saved."} Apply failed.`,
        "error",
      );
    }
  }

  function closeCreateModal() {
    setIsCreateOpen(false);
    setCreateError(null);
    setCreateForm(DEFAULT_CREATE_FORM);
  }

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    if (!activeUsers.length) {
      if (createForm.userId) {
        setCreateForm((current) => ({ ...current, userId: "" }));
      }
      return;
    }

    const selectedIsActive = activeUsers.some(
      (user) => String(user.id) === createForm.userId,
    );
    if (!selectedIsActive) {
      setCreateForm((current) => ({
        ...current,
        userId: String(activeUsers[0].id),
      }));
    }
  }, [activeUsers, createForm.userId, isCreateOpen]);

  const createMutation = useMutation({
    mutationFn: async () =>
      createPeer((await auth.getValidAccessToken()) ?? "", {
        user_id: Number(createForm.userId),
        name: createForm.name,
        assigned_ip: createForm.assignedIp || undefined,
        description: createForm.description,
        is_active: createForm.isActive,
      }),
    onSuccess: async () => {
      closeCreateModal();
      await applyIfNeeded("Peer created.");
      await refreshQueries();
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
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : "Failed to reveal peer artifacts",
        "error",
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      peerId,
      isActive,
    }: {
      peerId: number;
      isActive: boolean;
    }) =>
      updatePeer((await auth.getValidAccessToken()) ?? "", peerId, {
        is_active: !isActive,
      }),
    onSuccess: async (_, variables) => {
      await applyIfNeeded(variables.isActive ? "Peer disabled." : "Peer enabled.");
      await refreshQueries();
    },
  });

  const reissueMutation = useMutation({
    mutationFn: async (peerId: number) =>
      reissuePeer(peerId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      await applyIfNeeded("Peer keys regenerated.");
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : "Failed to reissue peer keys",
        "error",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (peerId: number) =>
      deletePeer(peerId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      await applyIfNeeded("Peer deleted.");
      await refreshQueries();
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => applyServerConfig((await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      pushToast("Config applied.");
      await refreshQueries();
    },
  });

  const peers = peerStatusesQuery.data ?? [];
  const userMap = useMemo(
    () => new Map(users.map((user: User) => [user.id, user] as const)),
    [users],
  );
  const groupMap = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name] as const)),
    [groups],
  );
  const filteredPeers = peers.filter((peer) => {
    const needle = searchText.trim().toLowerCase();
    if (!needle) {
      return true;
    }

    const peerUser = userMap.get(peer.user_id);
    const groupName = peerUser ? groupMap.get(peerUser.group_id) ?? "" : "";

    return [
      peer.peer_name,
      peer.user_name,
      groupName,
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
      <div className="stats-grid stats-grid-compact">
        <StatCard title="Total peers" value={`${peers.length}`} />
        <StatCard title="Online" value={`${onlineCount}`} accent="#79d483" />
        <StatCard
          title="Total traffic"
          value={formatBytes(peers.reduce((sum, peer) => sum + peer.total_bytes, 0))}
        />
      </div>
      <div className="toolbar-card toolbar-row">
        <button className="success-button" onClick={() => setIsCreateOpen(true)}>
          + Add peer
        </button>
        <button className="secondary-button" onClick={() => applyMutation.mutate()}>
          {applyMutation.isPending ? "Applying..." : "Apply config"}
        </button>
      </div>
      <Panel title="Peer list">
        <div className="table-toolbar">
          <label className="toolbar-search">
            <span>Search</span>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Peer, user, group, IP, route..."
            />
          </label>
        </div>
        <div className="desktop-table">
          <DataTable
            headers={[
              "Status",
              "Toggle",
              "Peer",
              "IP",
              "Routes",
              "Traffic",
              "Reveal / Reissue",
              "Delete",
            ]}
          >
            {filteredPeers.map((peer) => {
              const peerUser = userMap.get(peer.user_id);
              const groupName = peerUser ? groupMap.get(peerUser.group_id) ?? "—" : "—";

              return (
                <tr key={peer.peer_id}>
                  <td>
                    <div className={`status-pill ${peer.is_online ? "status-online" : ""}`}>
                      {peer.is_online ? "Online" : "Offline"}
                    </div>
                  </td>
                  <td>
                    <button
                      className={`toggle-chip ${peer.is_active ? "toggle-chip-on" : ""}`}
                      onClick={() =>
                        toggleMutation.mutate({
                          peerId: peer.peer_id,
                          isActive: peer.is_active,
                        })
                      }
                    >
                      {peer.is_active ? "On" : "Off"}
                    </button>
                  </td>
                  <td>
                    <div>{peer.peer_name}</div>
                    <div className="muted-text">
                      {peer.user_name} / {groupName}
                    </div>
                  </td>
                  <td>{peer.assigned_ip}</td>
                  <td>{peer.effective_allowed_ips.join(", ")}</td>
                  <td>{formatBytes(peer.total_bytes)}</td>
                  <td className="action-row">
                    {(() => {
                      const userIsActive = peerUser?.is_active ?? false;
                      const groupIsActive = peerUser
                        ? groups.some((group) => group.id === peerUser.group_id && group.is_active)
                        : false;
                      const canManageSecrets = peer.is_active && userIsActive && groupIsActive;

                      return (
                        <>
                          <button
                            className="ghost-button"
                            disabled={peer.is_revealed || revealMutation.isPending || !canManageSecrets}
                            onClick={() => revealMutation.mutate(peer.peer_id)}
                          >
                            Reveal
                          </button>
                          <button
                            className="secondary-button"
                            disabled={!canManageSecrets || reissueMutation.isPending}
                            onClick={() => reissueMutation.mutate(peer.peer_id)}
                          >
                            Reissue
                          </button>
                          <div className="muted-text">
                            {peer.is_revealed
                              ? "Consumed"
                              : !canManageSecrets
                                ? "Inactive upstream"
                                : "Pending"}
                          </div>
                        </>
                      );
                    })()}
                  </td>
                  <td>
                    <button
                      className="danger-button"
                      onClick={() => {
                        if (window.confirm(`Delete peer "${peer.peer_name}"?`)) {
                          deleteMutation.mutate(peer.peer_id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </div>
        <div className="mobile-list">
          {filteredPeers.map((peer) => {
            const peerUser = userMap.get(peer.user_id);
            const groupName = peerUser ? groupMap.get(peerUser.group_id) ?? "—" : "—";
            const userIsActive = peerUser?.is_active ?? false;
            const groupIsActive = peerUser
              ? groups.some((group) => group.id === peerUser.group_id && group.is_active)
              : false;
            const canManageSecrets = peer.is_active && userIsActive && groupIsActive;

            return (
              <article key={peer.peer_id} className="mobile-record">
                <div className="mobile-record-main">
                  <div>
                    <div className="mobile-record-title">{peer.peer_name}</div>
                    <div className="mobile-record-subtitle">
                      {peer.user_name} / {groupName}
                    </div>
                  </div>
                  <div className={`status-pill ${peer.is_online ? "status-online" : ""}`}>
                    {peer.is_online ? "Online" : "Offline"}
                  </div>
                </div>
                <div className="mobile-record-meta">
                  <span>{peer.assigned_ip}</span>
                  <span>{formatBytes(peer.total_bytes)}</span>
                </div>
                <div className="mobile-record-actions">
                  <button
                    className={`toggle-chip ${peer.is_active ? "toggle-chip-on" : ""}`}
                    onClick={() =>
                      toggleMutation.mutate({
                        peerId: peer.peer_id,
                        isActive: peer.is_active,
                      })
                    }
                  >
                    {peer.is_active ? "On" : "Off"}
                  </button>
                  <MobileInfoPopover>
                    <div className="mobile-info-grid">
                      <div><strong>IP</strong></div>
                      <div>{peer.assigned_ip}</div>
                      <div><strong>Routes</strong></div>
                      <div>{peer.effective_allowed_ips.join(", ")}</div>
                      <div><strong>Traffic</strong></div>
                      <div>{formatBytes(peer.total_bytes)}</div>
                      <div><strong>Status</strong></div>
                      <div>
                        {peer.is_revealed
                          ? "Consumed"
                          : !canManageSecrets
                            ? "Inactive upstream"
                            : "Pending"}
                      </div>
                    </div>
                  </MobileInfoPopover>
                  <button
                    className="ghost-button"
                    disabled={peer.is_revealed || revealMutation.isPending || !canManageSecrets}
                    onClick={() => revealMutation.mutate(peer.peer_id)}
                  >
                    Reveal
                  </button>
                  <button
                    className="secondary-button"
                    disabled={!canManageSecrets || reissueMutation.isPending}
                    onClick={() => reissueMutation.mutate(peer.peer_id)}
                  >
                    Reissue
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      if (window.confirm(`Delete peer "${peer.peer_name}"?`)) {
                        deleteMutation.mutate(peer.peer_id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      {revealed ? (
        <RevealModal artifacts={revealed} onClose={() => setRevealed(null)} />
      ) : null}
      {isCreateOpen ? (
        <div className="modal-backdrop" onClick={closeCreateModal}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>Add peer</h2>
              <button className="ghost-button" onClick={closeCreateModal}>
                Close
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>User</span>
                <select
                  value={createForm.userId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, userId: event.target.value }))
                  }
                >
                  <option value="">
                    {activeUsers.length ? "Select active user" : "No active users available"}
                  </option>
                  {activeUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <div className="muted-text">
                  Inactive users cannot receive new peers.
                </div>
              </label>
              <label className="field">
                <span>Name</span>
                <input
                  value={createForm.name}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Assigned IP</span>
                <input
                  value={createForm.assignedIp}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, assignedIp: event.target.value }))
                  }
                  placeholder="optional"
                />
              </label>
              <label className="field">
                <span>Description</span>
                <input
                  value={createForm.description}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="field-checkbox field-span-2">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                <div>
                  <strong>Enabled</strong>
                  <div className="muted-text">Create this peer in an active state.</div>
                </div>
              </label>
            </div>
            {createError ? <div className="error-banner">{createError}</div> : null}
            <div className="modal-actions">
              <button
                className="primary-button"
                disabled={
                  !createForm.userId ||
                  !createForm.name ||
                  !activeUsers.length ||
                  createMutation.isPending
                }
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

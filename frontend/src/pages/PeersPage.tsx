import { confirmAction } from "../lib/browser/actions";
import { formatBytes } from "../lib/format";
import { t } from "../lib/i18n";
import { Panel, StatCard } from "../ui/Cards";
import { MobileInfoPopover } from "../ui/MobileInfoPopover";
import { RevealModal } from "../ui/RevealModal";
import { DataTable } from "../ui/Table";
import {
  canManagePeerSecrets,
  formatDeleteConfirm,
  usePeersPageData,
} from "../modules/peers/usePeersPageData";

export function PeersPage() {
  const {
    guiSettingsQuery,
    revealed,
    setRevealed,
    isCreateOpen,
    setIsCreateOpen,
    searchText,
    setSearchText,
    createForm,
    setCreateForm,
    groups,
    peers,
    activeUsers,
    userMap,
    groupMap,
    filteredPeers,
    onlineCount,
    createMutation,
    revealMutation,
    toggleMutation,
    reissueMutation,
    deleteMutation,
    applyMutation,
    closeCreateModal,
  } = usePeersPageData();

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("nav.peers", "Peers")}</div>
          <h1>{t("peers.title", "Peer management")}</h1>
        </div>
      </div>
      <div className="stats-grid stats-grid-compact">
        <StatCard title={t("peers.total", "Total peers")} value={`${peers.length}`} />
        <StatCard title={t("peers.online_total", "Online")} value={`${onlineCount}`} accent="#79d483" />
        <StatCard
          title={t("peers.total_traffic", "Total traffic")}
          value={formatBytes(peers.reduce((sum, peer) => sum + peer.total_bytes, 0))}
        />
      </div>
      <div className="toolbar-card toolbar-row">
        <button className="success-button" data-testid="peers-add-button" onClick={() => setIsCreateOpen(true)}>
          {t("peers.add", "+ Add peer")}
        </button>
        <button className="secondary-button" data-testid="peers-apply-button" onClick={() => applyMutation.mutate()}>
          {applyMutation.isPending ? t("peers.applying", "Applying...") : t("peers.apply", "Apply config")}
        </button>
      </div>
      <Panel title={t("peers.list", "Peer list")}>
        <div className="table-toolbar">
          <label className="toolbar-search">
            <span>{t("common.search", "Search")}</span>
            <input
              data-testid="peers-search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={t("peers.search_placeholder", "Peer, user, group, IP, route...")}
            />
          </label>
        </div>
        <div className="desktop-table">
          <DataTable
            headers={[
              t("common.status", "Status"),
              t("common.toggle", "Toggle"),
              t("peers.peer", "Peer"),
              t("peers.ip", "IP"),
              t("peers.routes", "Routes"),
              t("table.traffic", "Traffic"),
              t("peers.reveal_reissue", "Reveal / Reissue"),
              t("common.delete", "Delete"),
            ]}
          >
            {filteredPeers.map((peer) => {
              const peerUser = userMap.get(peer.user_id);
              const groupName = peerUser ? groupMap.get(peerUser.group_id) ?? "—" : "—";

              return (
                <tr key={peer.peer_id}>
                  <td>
                    <div className={`status-pill ${peer.is_online ? "status-online" : ""}`}>
                      {peer.is_online ? t("common.online", "Online") : t("common.offline", "Offline")}
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
                      {peer.is_active ? t("common.on", "On") : t("common.off", "Off")}
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
                      const canManageSecrets = canManagePeerSecrets(peer, peerUser, groups);

                      return (
                        <>
                          <button
                            className="ghost-button"
                            data-testid="peer-reveal-button"
                            disabled={peer.is_revealed || revealMutation.isPending || !canManageSecrets}
                            onClick={() => revealMutation.mutate(peer.peer_id)}
                          >
                            {t("peers.reveal", "Reveal")}
                          </button>
                          <button
                            className="secondary-button"
                            data-testid="peer-reissue-button"
                            disabled={!canManageSecrets || reissueMutation.isPending}
                            onClick={() => reissueMutation.mutate(peer.peer_id)}
                          >
                            {t("peers.reissue", "Reissue")}
                          </button>
                          <div className="muted-text">
                            {peer.is_revealed
                              ? t("peers.revealed", "Revealed")
                              : !canManageSecrets
                                ? t("peers.inactive_upstream", "Inactive upstream")
                                : t("peers.not_revealed", "Not revealed")}
                          </div>
                        </>
                      );
                    })()}
                  </td>
                  <td>
                    <button
                      className="danger-button"
                      onClick={() => {
                        if (confirmAction(formatDeleteConfirm(peer.peer_name))) {
                          deleteMutation.mutate(peer.peer_id);
                        }
                      }}
                    >
                      {t("common.delete", "Delete")}
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
            const canManageSecrets = canManagePeerSecrets(peer, peerUser, groups);

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
                    {peer.is_online ? t("common.online", "Online") : t("common.offline", "Offline")}
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
                    {peer.is_active ? t("common.on", "On") : t("common.off", "Off")}
                  </button>
                  <MobileInfoPopover>
                    <div className="mobile-info-grid">
                      <div><strong>{t("peers.ip", "IP")}</strong></div>
                      <div>{peer.assigned_ip}</div>
                      <div><strong>{t("peers.routes", "Routes")}</strong></div>
                      <div>{peer.effective_allowed_ips.join(", ")}</div>
                      <div><strong>{t("table.traffic", "Traffic")}</strong></div>
                      <div>{formatBytes(peer.total_bytes)}</div>
                      <div><strong>{t("common.status", "Status")}</strong></div>
                      <div>
                        {peer.is_revealed
                          ? t("peers.revealed", "Revealed")
                          : !canManageSecrets
                            ? t("peers.inactive_upstream", "Inactive upstream")
                            : t("peers.not_revealed", "Not revealed")}
                      </div>
                    </div>
                  </MobileInfoPopover>
                  <button
                    className="ghost-button"
                    data-testid="peer-reveal-button"
                    disabled={peer.is_revealed || revealMutation.isPending || !canManageSecrets}
                    onClick={() => revealMutation.mutate(peer.peer_id)}
                  >
                    {t("peers.reveal", "Reveal")}
                  </button>
                  <button
                    className="secondary-button"
                    data-testid="peer-reissue-button"
                    disabled={!canManageSecrets || reissueMutation.isPending}
                    onClick={() => reissueMutation.mutate(peer.peer_id)}
                  >
                    {t("peers.reissue", "Reissue")}
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      if (confirmAction(formatDeleteConfirm(peer.peer_name))) {
                        deleteMutation.mutate(peer.peer_id);
                      }
                    }}
                  >
                    {t("common.delete", "Delete")}
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
          <div className="modal-card modal-compact" data-testid="peers-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>{t("peers.add_title", "Add peer")}</h2>
              <button className="ghost-button" onClick={closeCreateModal}>
                {t("common.close", "Close")}
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>{t("table.user", "User")}</span>
                <select
                  data-testid="peers-create-user"
                  value={createForm.userId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, userId: event.target.value }))
                  }
                >
                  <option value="">
                    {activeUsers.length
                      ? t("peers.select_active_user", "Select active user")
                      : t("peers.no_active_users", "No active users available")}
                  </option>
                  {activeUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <div className="muted-text">
                  {t("peers.active_user_hint", "Inactive users cannot receive new peers.")}
                </div>
              </label>
              <label className="field">
                <span>{t("peers.peer", "Name")}</span>
                <input
                  data-testid="peers-create-name"
                  value={createForm.name}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>{t("peers.assigned_ip", "Assigned IP")}</span>
                <input
                  data-testid="peers-create-assigned-ip"
                  value={createForm.assignedIp}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, assignedIp: event.target.value }))
                  }
                  placeholder={t("peers.optional", "optional")}
                />
              </label>
              <label className="field">
                <span>{t("common.description", "Description")}</span>
                <input
                  data-testid="peers-create-description"
                  value={createForm.description}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="field-checkbox field-span-2">
                <input
                  data-testid="peers-create-enabled"
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                <div>
                  <strong>{t("common.enabled", "Enabled")}</strong>
                  <div className="muted-text">{t("peers.create_active", "Create this peer in an active state.")}</div>
                </div>
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="primary-button"
                data-testid="peers-create-submit"
                disabled={
                  !createForm.userId ||
                  !createForm.name ||
                  !activeUsers.length ||
                  createMutation.isPending
                }
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending
                  ? t("peers.creating", "Creating...")
                  : guiSettingsQuery.data?.refresh_after_apply
                    ? t("peers.create_apply", "Create and apply")
                    : t("peers.create", "Create peer")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

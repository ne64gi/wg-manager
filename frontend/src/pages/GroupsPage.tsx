import { confirmAction, downloadBlob } from "../lib/browser/actions";
import { t } from "../lib/i18n";
import {
  formatDeleteConfirm,
  getBundleWarningText,
  normalizeNetworkCidr,
  SCOPE_EXAMPLE,
  SCOPE_PREFIX,
  useGroupsPageData,
} from "../modules/groups/useGroupsPageData";
import { Panel } from "../ui/Cards";
import { MobileInfoPopover } from "../ui/MobileInfoPopover";
import { DataTable } from "../ui/Table";

export function GroupsPage() {
  const {
    groups,
    activeCount,
    isCreateOpen,
    setIsCreateOpen,
    editingGroup,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    createScopeError,
    updateCreateFormField,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    createMutation,
    updateMutation,
    toggleMutation,
    deleteMutation,
    bundleMutation,
  } = useGroupsPageData();

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("nav.groups", "Groups")}</div>
          <h1>{t("groups.title", "Group management")}</h1>
        </div>
      </div>
      <div className="stats-grid stats-grid-compact">
        <div className="stat-card">
          <div className="stat-label">{t("groups.total", "Total groups")}</div>
          <div className="stat-value">{groups.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("groups.enabled_total", "Enabled")}</div>
          <div className="stat-value">{activeCount}</div>
        </div>
      </div>
      <div className="toolbar-card">
        <button className="success-button" data-testid="groups-add-button" onClick={() => setIsCreateOpen(true)}>
          {t("groups.add", "+ Add group")}
        </button>
      </div>
      <Panel title={t("groups.list", "Group list")}>
        <div className="desktop-table">
          <DataTable
            headers={[
              t("common.status", "Status"),
              t("groups.name", "Name"),
              t("table.scope", "Scope"),
              t("groups.network", "Network"),
              t("groups.allowed_ips", "Allowed IPs"),
              t("groups.dns", "DNS"),
              t("common.actions", "Actions"),
            ]}
          >
            {groups.map((group) => (
              <tr key={group.id}>
                <td>
                  <button
                    className={`toggle-chip ${group.is_active ? "toggle-chip-on" : ""}`}
                    onClick={() => toggleMutation.mutate(group)}
                  >
                    {group.is_active ? t("common.on", "On") : t("common.off", "Off")}
                  </button>
                </td>
                <td>{group.name}</td>
                <td>{t(`groups.scope_${group.scope}`, group.scope)}</td>
                <td>{group.network_cidr}</td>
                <td>{group.default_allowed_ips.join(", ")}</td>
                <td>{group.dns_servers?.join(", ") || "—"}</td>
                <td className="action-row">
                  <button
                    className="secondary-button"
                    onClick={() => bundleMutation.mutate(group)}
                  >
                    {t("groups.bundle", "Download bundle")}
                  </button>
                  <button className="ghost-button" onClick={() => openEditModal(group)}>
                    {t("common.edit", "Edit")}
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      if (confirmAction(formatDeleteConfirm(group.name))) {
                        deleteMutation.mutate(group.id);
                      }
                    }}
                  >
                    {t("common.delete", "Delete")}
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
        <div className="mobile-list">
          {groups.map((group) => (
            <article key={group.id} className="mobile-record">
              <div className="mobile-record-main">
                <div>
                  <div className="mobile-record-title">{group.name}</div>
                  <div className="mobile-record-subtitle">
                    {t(`groups.scope_${group.scope}`, group.scope)} / {group.network_cidr}
                  </div>
                </div>
                <div className={`status-pill ${group.is_active ? "status-online" : ""}`}>
                      {group.is_active ? t("common.enabled", "Enabled") : t("common.disabled", "Disabled")}
                </div>
              </div>
              <div className="mobile-record-actions">
                <button
                  className={`toggle-chip ${group.is_active ? "toggle-chip-on" : ""}`}
                  onClick={() => toggleMutation.mutate(group)}
                >
                  {group.is_active ? t("common.on", "On") : t("common.off", "Off")}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => bundleMutation.mutate(group)}
                >
                  {t("groups.bundle", "Download bundle")}
                </button>
                <button className="ghost-button" onClick={() => openEditModal(group)}>
                  {t("common.edit", "Edit")}
                </button>
                <MobileInfoPopover>
                  <div className="mobile-info-grid">
                    <div><strong>{t("groups.allowed_ips", "Allowed IPs")}</strong></div>
                    <div>{group.default_allowed_ips.join(", ")}</div>
                    <div><strong>{t("groups.dns", "DNS")}</strong></div>
                    <div>{group.dns_servers?.join(", ") || "—"}</div>
                    <div><strong>{t("common.description", "Description")}</strong></div>
                    <div>{group.description || "—"}</div>
                  </div>
                </MobileInfoPopover>
                <button
                  className="danger-button"
                  onClick={() => {
                    if (confirmAction(formatDeleteConfirm(group.name))) {
                      deleteMutation.mutate(group.id);
                    }
                  }}
                >
                  {t("common.delete", "Delete")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </Panel>
      {isCreateOpen ? (
        <div className="modal-backdrop" onClick={closeCreateModal}>
          <div className="modal-card modal-compact" data-testid="groups-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>{t("groups.add_title", "Add group")}</h2>
              <button className="ghost-button" onClick={closeCreateModal}>
                {t("common.close", "Close")}
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>{t("groups.name", "Name")}</span>
                <input
                  data-testid="groups-create-name"
                  value={createForm.name}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("name", event.target.value)}
                />
              </label>
              <label className="field">
                <span>{t("groups.scope", "Scope")}</span>
                <select
                  data-testid="groups-create-scope"
                  value={createForm.scope}
                  onChange={(event) => updateCreateFormField("scope", event.target.value)}
                >
                  <option value="single_site">{t("groups.scope_single_site", "Single site")}</option>
                  <option value="multi_site">{t("groups.scope_multi_site", "Multi site")}</option>
                  <option value="admin">{t("groups.scope_admin", "Admin")}</option>
                </select>
              </label>
              <label className="field">
                <span>{t("groups.network_cidr", "Network CIDR")}</span>
                <input
                  data-testid="groups-create-network-cidr"
                  value={createForm.networkCidr}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("networkCidr", event.target.value)}
                  onBlur={(event) =>
                    updateCreateFormField("networkCidr", normalizeNetworkCidr(event.target.value))
                  }
                  placeholder={SCOPE_EXAMPLE[createForm.scope] ?? "10.10.1.0/24"}
                />
                <div className="muted-text">
                  {t("groups.scope", "Scope")}: {t(`groups.scope_${createForm.scope}`, createForm.scope)} /{SCOPE_PREFIX[createForm.scope] ?? 24}
                </div>
              </label>
              <label className="field">
                <span>{t("groups.allowed_ips", "Allowed IPs")}</span>
                <input
                  data-testid="groups-create-allowed-ips"
                  value={createForm.allowedIps}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("allowedIps", event.target.value)}
                  placeholder="10.10.1.0/24"
                />
              </label>
              <label className="field">
                <span>{t("groups.dns_servers", "DNS servers")}</span>
                <input
                  data-testid="groups-create-dns-servers"
                  value={createForm.dnsServers}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("dnsServers", event.target.value)}
                  placeholder="1.1.1.1, 8.8.8.8"
                />
              </label>
              <label className="field field-span-2">
                <span>{t("groups.description", "Description")}</span>
                <input
                  data-testid="groups-create-description"
                  value={createForm.description}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("description", event.target.value)}
                  placeholder={t("groups.create_note_placeholder", "Optional note")}
                />
              </label>
              <label className="field-checkbox field-span-2">
                <input
                  data-testid="groups-create-enabled"
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(event) => updateCreateFormField("isActive", event.target.checked)}
                />
                <div>
                  <strong>{t("common.enabled", "Enabled")}</strong>
                  <div className="muted-text">{t("groups.create_active", "Create this group in an active state.")}</div>
                </div>
              </label>
            </div>
            {createScopeError ? <div className="error-banner">{createScopeError}</div> : null}
            <div className="modal-actions">
              <button
                className="primary-button"
                data-testid="groups-create-submit"
                disabled={
                  !createForm.name ||
                  !createForm.networkCidr ||
                  !createForm.allowedIps ||
                  Boolean(createScopeError) ||
                  createMutation.isPending
                }
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? t("groups.creating", "Creating...") : t("groups.create", "Create group")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editingGroup ? (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>{t("groups.edit_title", "Edit group")}</h2>
              <button className="ghost-button" onClick={closeEditModal}>
                {t("common.close", "Close")}
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>{t("groups.name", "Name")}</span>
                <input
                  value={editForm.name}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>{t("groups.scope", "Scope")}</span>
                <input value={t(`groups.scope_${editForm.scope}`, editForm.scope)} disabled />
              </label>
              <label className="field">
                <span>{t("groups.network_cidr", "Network CIDR")}</span>
                <input value={editForm.networkCidr} disabled />
              </label>
              <label className="field">
                <span>{t("groups.allowed_ips", "Allowed IPs")}</span>
                <input
                  value={editForm.allowedIps}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, allowedIps: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>{t("groups.dns_servers", "DNS servers")}</span>
                <input
                  value={editForm.dnsServers}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, dnsServers: event.target.value }))
                  }
                />
              </label>
              <label className="field field-span-2">
                <span>{t("groups.description", "Description")}</span>
                <input
                  value={editForm.description}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="field-checkbox field-span-2">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                <div>
                  <strong>{t("common.enabled", "Enabled")}</strong>
                  <div className="muted-text">{t("groups.disable_hint", "Disable to stop new active use from this group.")}</div>
                </div>
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="primary-button"
                disabled={!editForm.name || !editForm.allowedIps || updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    groupId: editingGroup.id,
                    form: editForm,
                  })
                }
              >
                {updateMutation.isPending ? t("groups.saving", "Saving...") : t("groups.save_changes", "Save changes")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

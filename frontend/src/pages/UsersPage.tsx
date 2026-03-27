import { confirmAction, downloadBlob } from "../lib/browser/actions";
import { t } from "../lib/i18n";
import {
  formatDeleteConfirm,
  getBundleWarningText,
  useUsersPageData,
} from "../modules/users/useUsersPageData";
import { Panel } from "../ui/Cards";
import { MobileInfoPopover } from "../ui/MobileInfoPopover";
import { DataTable } from "../ui/Table";

export function UsersPage() {
  const {
    groups,
    users,
    activeCount,
    groupNames,
    filteredUsers,
    searchText,
    setSearchText,
    isCreateOpen,
    setIsCreateOpen,
    filterGroupId,
    setFilterGroupId,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    editingUser,
    createMutation,
    updateMutation,
    toggleMutation,
    deleteMutation,
    bundleMutation,
    closeCreateModal,
    openEditModal,
    closeEditModal,
  } = useUsersPageData();

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("nav.users", "Users")}</div>
          <h1>{t("users.title", "User management")}</h1>
        </div>
      </div>
      <div className="stats-grid stats-grid-compact">
        <div className="stat-card">
          <div className="stat-label">{t("users.total", "Total users")}</div>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("users.enabled_total", "Enabled")}</div>
          <div className="stat-value">{activeCount}</div>
        </div>
      </div>
      <div className="toolbar-card">
        <button className="success-button" data-testid="users-add-button" onClick={() => setIsCreateOpen(true)}>
          {t("users.add", "+ Add user")}
        </button>
      </div>
      <div className="toolbar-card">
        <label className="toolbar-search">
          <span>{t("common.search", "Search")}</span>
          <input
            data-testid="users-search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={t("users.search_placeholder", "User, group, route...")}
          />
        </label>
      </div>
      <div className="toolbar-card">
        <label className="toolbar-field">
          <span>{t("users.group_filter", "Group filter")}</span>
          <select
            data-testid="users-group-filter"
            value={filterGroupId}
            onChange={(event) => setFilterGroupId(event.target.value)}
          >
            <option value="all">{t("users.all_groups", "All groups")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Panel title={t("users.list", "User list")}>
        <div className="desktop-table">
          <DataTable headers={[t("common.status", "Status"), t("users.name", "Name"), t("table.group", "Group"), t("users.override_routes", "Override routes"), t("common.actions", "Actions")]}>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <button
                    className={`toggle-chip ${user.is_active ? "toggle-chip-active" : ""}`}
                    onClick={() => toggleMutation.mutate(user)}
                  >
                    {user.is_active ? t("common.on", "On") : t("common.off", "Off")}
                  </button>
                </td>
                <td>{user.name}</td>
                <td>{groupNames.get(user.group_id) ?? `Group ${user.group_id}`}</td>
                <td>{user.allowed_ips_override?.join(", ") || t("users.inherit_group", "Inherit group defaults")}</td>
                <td className="action-row">
                  <button
                    className="secondary-button"
                    data-testid={`users-download-bundle-${user.id}`}
                    onClick={() => bundleMutation.mutate(user)}
                  >
                    {t("users.bundle", "Download bundle")}
                  </button>
                  <button className="ghost-button" onClick={() => openEditModal(user)}>
                    {t("common.edit", "Edit")}
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      if (confirmAction(formatDeleteConfirm(user.name))) {
                        deleteMutation.mutate(user.id);
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
          {filteredUsers.map((user) => (
            <article key={user.id} className="mobile-record">
              <div className="mobile-record-main">
                <div>
                  <div className="mobile-record-title">{user.name}</div>
                  <div className="mobile-record-subtitle">
                    {groupNames.get(user.group_id) ?? `Group ${user.group_id}`}
                  </div>
                </div>
                <div className={`status-pill ${user.is_active ? "status-pill-online" : ""}`}>
                  {user.is_active ? t("common.enabled", "Enabled") : t("common.disabled", "Disabled")}
                </div>
              </div>
              <div className="mobile-record-actions">
                <button
                  className={`toggle-chip ${user.is_active ? "toggle-chip-active" : ""}`}
                  onClick={() => toggleMutation.mutate(user)}
                >
                  {user.is_active ? t("common.on", "On") : t("common.off", "Off")}
                </button>
                <button
                  className="secondary-button"
                  data-testid={`users-download-bundle-${user.id}`}
                  onClick={() => bundleMutation.mutate(user)}
                >
                  {t("users.bundle", "Download bundle")}
                </button>
                <button className="ghost-button" onClick={() => openEditModal(user)}>
                  {t("common.edit", "Edit")}
                </button>
                <MobileInfoPopover>
                  <div className="mobile-info-grid">
                    <div><strong>{t("users.override_routes", "Override routes")}</strong></div>
                    <div>{user.allowed_ips_override?.join(", ") || t("users.inherit_group", "Inherit group defaults")}</div>
                    <div><strong>{t("common.description", "Description")}</strong></div>
                    <div>{user.description || "—"}</div>
                  </div>
                </MobileInfoPopover>
                <button
                  className="danger-button"
                  onClick={() => {
                    if (confirmAction(formatDeleteConfirm(user.name))) {
                      deleteMutation.mutate(user.id);
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
          <div className="modal-card modal-compact" data-testid="users-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>{t("users.add_title", "Add user")}</h2>
              <button className="ghost-button" onClick={closeCreateModal}>
                {t("common.close", "Close")}
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>{t("table.group", "Group")}</span>
                <select
                  data-testid="users-create-group"
                  value={createForm.groupId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, groupId: event.target.value }))
                  }
                >
                  <option value="">{t("users.select_group", "Select group")}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("users.name", "Name")}</span>
                <input
                  data-testid="users-create-name"
                  value={createForm.name}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field field-span-2">
                <span>{t("users.override_routes", "Override routes")}</span>
                <input
                  data-testid="users-create-override-routes"
                  value={createForm.overrideRoutes}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      overrideRoutes: event.target.value,
                    }))
                  }
                  placeholder="10.10.1.254/32"
                />
              </label>
              <label className="field field-span-2">
                <span>{t("common.description", "Description")}</span>
                <input
                  data-testid="users-create-description"
                  value={createForm.description}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="field-checkbox field-span-2">
                <input
                  data-testid="users-create-enabled"
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                <div>
                  <strong>{t("common.enabled", "Enabled")}</strong>
                  <div className="muted-text">{t("users.create_active", "Create this user in an active state.")}</div>
                </div>
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="primary-button"
                data-testid="users-create-submit"
                disabled={!createForm.groupId || !createForm.name || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? t("users.creating", "Creating...") : t("users.create", "Create user")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editingUser ? (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>{t("users.edit_title", "Edit user")}</h2>
              <button className="ghost-button" onClick={closeEditModal}>
                {t("common.close", "Close")}
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>{t("table.group", "Group")}</span>
                <input value={groupNames.get(Number(editForm.groupId)) ?? editForm.groupId} disabled />
              </label>
              <label className="field">
                <span>{t("users.name", "Name")}</span>
                <input
                  value={editForm.name}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field field-span-2">
                <span>{t("users.override_routes", "Override routes")}</span>
                <input
                  value={editForm.overrideRoutes}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      overrideRoutes: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field field-span-2">
                <span>{t("common.description", "Description")}</span>
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
                  <div className="muted-text">{t("users.disable_hint", "Disable to stop peer activity for this user.")}</div>
                </div>
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="primary-button"
                disabled={!editForm.name || updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    userId: editingUser.id,
                    form: editForm,
                  })
                }
              >
                {updateMutation.isPending ? t("users.saving", "Saving...") : t("users.save_changes", "Save changes")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

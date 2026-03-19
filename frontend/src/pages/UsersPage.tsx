import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createUser, listGroups, listUsers } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { queryKeys } from "../modules/queryKeys";
import { Panel } from "../ui/Cards";
import { DataTable } from "../ui/Table";

export function UsersPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [name, setName] = useState("");
  const [overrideRoutes, setOverrideRoutes] = useState("");
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => listUsers((await auth.getValidAccessToken()) ?? ""),
  });
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => listGroups((await auth.getValidAccessToken()) ?? ""),
  });
  const createMutation = useMutation({
    mutationFn: async () =>
      createUser((await auth.getValidAccessToken()) ?? "", {
        group_id: Number(groupId),
        name,
        allowed_ips_override: overrideRoutes
          ? overrideRoutes
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : undefined,
      }),
    onSuccess: async () => {
      setIsCreateOpen(false);
      setGroupId("");
      setName("");
      setOverrideRoutes("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });

  const groupNames = useMemo(
    () =>
      new Map((groupsQuery.data ?? []).map((group) => [group.id, group.name] as const)),
    [groupsQuery.data],
  );

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">Users</div>
          <h1>User policy assignments</h1>
        </div>
      </div>
      <div className="toolbar-card">
        <button className="success-button" onClick={() => setIsCreateOpen(true)}>
          + Add user
        </button>
      </div>
      <Panel title="Users">
        <DataTable headers={["Name", "Group", "Override routes", "Status"]}>
          {(usersQuery.data ?? []).map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{groupNames.get(user.group_id) ?? `Group ${user.group_id}`}</td>
              <td>{user.allowed_ips_override?.join(", ") || "Inherit group defaults"}</td>
              <td>{user.is_active ? "Active" : "Disabled"}</td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      {isCreateOpen ? (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>Add user</h2>
              <button className="ghost-button" onClick={() => setIsCreateOpen(false)}>
                Close
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Group</span>
                <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                  <option value="">Select group</option>
                  {(groupsQuery.data ?? []).map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="field field-span-2">
                <span>Override routes</span>
                <input
                  value={overrideRoutes}
                  onChange={(event) => setOverrideRoutes(event.target.value)}
                  placeholder="10.10.1.254/32"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="primary-button" onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? "Creating..." : "Create user"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

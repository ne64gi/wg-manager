import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { listGroups, listUsers } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { queryKeys } from "../modules/queryKeys";
import { Panel } from "../ui/Cards";
import { DataTable } from "../ui/Table";

export function UsersPage() {
  const auth = useAuth();
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => listUsers((await auth.getValidAccessToken()) ?? ""),
  });
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => listGroups((await auth.getValidAccessToken()) ?? ""),
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
    </div>
  );
}

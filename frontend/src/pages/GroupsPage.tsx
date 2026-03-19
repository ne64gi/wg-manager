import { useQuery } from "@tanstack/react-query";

import { listGroups } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { Panel } from "../ui/Cards";
import { DataTable } from "../ui/Table";
import { queryKeys } from "../modules/queryKeys";

export function GroupsPage() {
  const auth = useAuth();
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => listGroups((await auth.getValidAccessToken()) ?? ""),
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">Groups</div>
          <h1>Network groups</h1>
        </div>
      </div>
      <Panel title="Groups">
        <DataTable
          headers={["Name", "Scope", "Network", "Allowed IPs", "DNS", "Allocation"]}
        >
          {(groupsQuery.data ?? []).map((group) => (
            <tr key={group.id}>
              <td>{group.name}</td>
              <td>{group.scope}</td>
              <td>{group.network_cidr}</td>
              <td>{group.default_allowed_ips.join(", ")}</td>
              <td>{group.dns_servers?.join(", ") || "—"}</td>
              <td>start @{group.allocation_start_host}</td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}

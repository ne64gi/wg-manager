import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createGroup, listGroups } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { Panel } from "../ui/Cards";
import { DataTable } from "../ui/Table";
import { queryKeys } from "../modules/queryKeys";

export function GroupsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("single_site");
  const [networkCidr, setNetworkCidr] = useState("");
  const [allowedIps, setAllowedIps] = useState("");
  const [dnsServers, setDnsServers] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => listGroups((await auth.getValidAccessToken()) ?? ""),
  });
  const createMutation = useMutation({
    mutationFn: async () =>
      createGroup((await auth.getValidAccessToken()) ?? "", {
        name,
        scope,
        network_cidr: networkCidr,
        default_allowed_ips: allowedIps
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        dns_servers: dnsServers
          ? dnsServers
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : undefined,
      }),
    onSuccess: async () => {
      setCreateError(null);
      setIsCreateOpen(false);
      setName("");
      setScope("single_site");
      setNetworkCidr("");
      setAllowedIps("");
      setDnsServers("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupSummaries });
    },
    onError: (error) => {
      setCreateError(error instanceof Error ? error.message : "Failed to create group");
    },
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">Groups</div>
          <h1>Network groups</h1>
        </div>
      </div>
      <div className="toolbar-card">
        <button className="success-button" onClick={() => setIsCreateOpen(true)}>
          + Add group
        </button>
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
      {isCreateOpen ? (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>Add group</h2>
              <button className="ghost-button" onClick={() => setIsCreateOpen(false)}>
                Close
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="field">
                <span>Scope</span>
                <select value={scope} onChange={(event) => setScope(event.target.value)}>
                  <option value="single_site">single_site</option>
                  <option value="multi_site">multi_site</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label className="field">
                <span>Network CIDR</span>
                <input
                  value={networkCidr}
                  onChange={(event) => setNetworkCidr(event.target.value)}
                  placeholder="10.10.1.0/24"
                />
              </label>
              <label className="field">
                <span>Allowed IPs</span>
                <input
                  value={allowedIps}
                  onChange={(event) => setAllowedIps(event.target.value)}
                  placeholder="10.10.1.0/24"
                />
              </label>
              <label className="field">
                <span>DNS servers</span>
                <input
                  value={dnsServers}
                  onChange={(event) => setDnsServers(event.target.value)}
                  placeholder="1.1.1.1, 8.8.8.8"
                />
              </label>
            </div>
            {createError ? <div className="error-banner">{createError}</div> : null}
            <div className="modal-actions">
              <button
                className="primary-button"
                disabled={!name || !networkCidr || !allowedIps || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating..." : "Create group"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

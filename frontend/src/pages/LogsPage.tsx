import { useQuery } from "@tanstack/react-query";

import { listGuiLogs } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { useAuth } from "../modules/auth/AuthContext";
import { queryKeys } from "../modules/queryKeys";
import { Panel } from "../ui/Cards";
import { DataTable } from "../ui/Table";

export function LogsPage() {
  const auth = useAuth();
  const logsQuery = useQuery({
    queryKey: queryKeys.guiLogs(100),
    queryFn: async () => listGuiLogs((await auth.getValidAccessToken()) ?? "", 100),
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">Logs</div>
          <h1>GUI activity log</h1>
        </div>
      </div>
      <Panel title="Recent logs">
        <DataTable headers={["Time", "Level", "Category", "Message", "User"]}>
          {(logsQuery.data ?? []).map((entry) => (
            <tr key={entry.id}>
              <td>{formatDateTime(entry.occurred_at)}</td>
              <td>{entry.level}</td>
              <td>{entry.category}</td>
              <td>{entry.message}</td>
              <td>{entry.username ?? "system"}</td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}

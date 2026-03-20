import { useQuery } from "@tanstack/react-query";

import { listGuiLogs } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { t } from "../lib/i18n";
import { useAuth } from "../modules/auth/AuthContext";
import { useGuiSettingsQuery } from "../modules/gui/useGuiSettingsQuery";
import { queryKeys } from "../modules/queryKeys";
import { Panel } from "../ui/Cards";
import { DataTable } from "../ui/Table";

export function LogsPage() {
  const auth = useAuth();
  const guiSettingsQuery = useGuiSettingsQuery();
  const logsQuery = useQuery({
    queryKey: queryKeys.guiLogs(100),
    queryFn: async () => listGuiLogs((await auth.getValidAccessToken()) ?? "", 100),
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("nav.logs", "Logs")}</div>
          <h1>{t("logs.title", "GUI activity log")}</h1>
        </div>
      </div>
      <div className="toolbar-card">
        <div className="muted-text">
          {t("logs.current_level", "Current error log level")}:{" "}
          <strong>{guiSettingsQuery.data?.error_log_level ?? "warning"}</strong>
        </div>
      </div>
      <Panel title={t("logs.recent", "Recent logs")}>
        <DataTable headers={[t("table.time", "Time"), t("table.level", "Level"), t("table.category", "Category"), t("table.message", "Message"), t("table.user", "User")]}>
          {(logsQuery.data ?? []).map((entry) => (
            <tr key={entry.id}>
              <td>{formatDateTime(entry.occurred_at)}</td>
              <td>
                <span className={`log-level-pill log-level-${entry.level}`}>
                  {entry.level}
                </span>
              </td>
              <td>{entry.category}</td>
              <td>{entry.message}</td>
              <td>{entry.username ?? t("logs.system", "system")}</td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}

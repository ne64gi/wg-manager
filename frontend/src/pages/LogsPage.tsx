import { formatDateTime } from "../lib/format";
import { t } from "../core/i18n";
import { Panel } from "../design/ui/Cards";
import { DataTable } from "../design/ui/Table";
import { useLogsPageData } from "../modules/gui/useLogsPageData";

export function LogsPage() {
  const {
    tab,
    setTab,
    logs,
    total,
    from,
    to,
    offset,
    limit,
    search,
    setSearch,
    previousPage,
    nextPage,
  } = useLogsPageData();

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("nav.logs", "Logs")}</div>
          <h1>{t("logs.title", "Logs")}</h1>
        </div>
      </div>

      <div className="tabs settings-tabs">
        <button
          type="button"
          className={`tab-button ${tab === "operation" ? "active" : ""}`}
          onClick={() => setTab("operation")}
        >
          <span>{t("logs.operation_tab", "Operation log")}</span>
        </button>
        <button
          type="button"
          className={`tab-button ${tab === "audit" ? "active" : ""}`}
          onClick={() => setTab("audit")}
        >
          <span>{t("logs.audit_tab", "Audit log")}</span>
        </button>
      </div>

      <div className="toolbar-card toolbar-card-wrap">
        <label className="toolbar-field toolbar-field-grow">
          <span>{t("logs.search", "Search")}</span>
          <input
            data-testid="logs-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("logs.search_placeholder", "Message, user, category")}
          />
        </label>
      </div>

      {tab === "operation" ? (
        <Panel title={t("logs.operation_tab", "Operation log")}>
          {logs.length === 0 ? (
            <div className="muted-text">{t("logs.empty", "No logs match the current filters.")}</div>
          ) : null}
          <DataTable
            headers={[
              t("table.time", "Time"),
              t("table.category", "Action"),
              t("table.scope", "Entity"),
              t("table.message", "Source"),
            ]}
          >
            {logs.map((entry) => {
              const operation = entry as {
                id: number;
                occurred_at: string;
                action: string;
                entity_type: string;
                source: string;
              };
              return (
                <tr key={operation.id}>
                  <td>{formatDateTime(operation.occurred_at)}</td>
                  <td>{operation.action}</td>
                  <td>{operation.entity_type}</td>
                  <td>{operation.source}</td>
                </tr>
              );
            })}
          </DataTable>
          <div className="table-pagination" data-testid="logs-pagination">
            <button className="ghost-button" disabled={offset === 0} onClick={previousPage}>
              {t("logs.prev_page", "Previous")}
            </button>
            <div className="muted-text">
              {t("logs.page_status", "{from}-{to} / {total}")
                .replace("{from}", String(from))
                .replace("{to}", String(to))
                .replace("{total}", String(total))}
            </div>
            <button
              className="ghost-button"
              disabled={offset + limit >= total}
              onClick={nextPage}
            >
              {t("logs.next_page", "Next")}
            </button>
          </div>
        </Panel>
      ) : (
        <Panel title={t("logs.audit_tab", "Audit log")}>
          {logs.length === 0 ? (
            <div className="muted-text">{t("logs.empty", "No logs match the current filters.")}</div>
          ) : null}
          <DataTable
            headers={[
              t("table.time", "Time"),
              t("table.category", "Category"),
              t("table.level", "Outcome"),
              t("table.message", "Action"),
              t("table.user", "User"),
            ]}
          >
            {logs.map((entry) => {
              const audit = entry as {
                id: number;
                occurred_at: string;
                category: string;
                outcome: string;
                action: string;
                username: string | null;
              };
              return (
                <tr key={audit.id}>
                  <td>{formatDateTime(audit.occurred_at)}</td>
                  <td>{audit.category}</td>
                  <td>{audit.outcome}</td>
                  <td>{audit.action}</td>
                  <td>{audit.username ?? t("logs.system", "system")}</td>
                </tr>
              );
            })}
          </DataTable>
          <div className="table-pagination" data-testid="logs-pagination">
            <button className="ghost-button" disabled={offset === 0} onClick={previousPage}>
              {t("logs.prev_page", "Previous")}
            </button>
            <div className="muted-text">
              {t("logs.page_status", "{from}-{to} / {total}")
                .replace("{from}", String(from))
                .replace("{to}", String(to))
                .replace("{total}", String(total))}
            </div>
            <button
              className="ghost-button"
              disabled={offset + limit >= total}
              onClick={nextPage}
            >
              {t("logs.next_page", "Next")}
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}

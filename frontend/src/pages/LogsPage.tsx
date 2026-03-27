import { formatDateTime } from "../lib/format";
import { t } from "../lib/i18n";
import { useGuiLogsPageData } from "../modules/gui/useGuiLogsPageData";
import { Panel } from "../design/ui/Cards";
import { DataTable } from "../design/ui/Table";

export function LogsPage() {
  const {
    guiSettingsQuery,
    logs,
    total,
    from,
    to,
    offset,
    level,
    category,
    search,
    limit,
    categoryOptions,
    setLevel,
    setCategory,
    setSearch,
    previousPage,
    nextPage,
  } = useGuiLogsPageData();

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("nav.logs", "Logs")}</div>
          <h1>{t("logs.title", "Activity log")}</h1>
        </div>
      </div>
      <div className="toolbar-card">
        <div className="muted-text">
          {t("logs.current_level", "Current error log level")}:{" "}
          <strong>
            {t(
              `log_level.${guiSettingsQuery.data?.error_log_level ?? "warning"}`,
              guiSettingsQuery.data?.error_log_level ?? "warning",
            )}
          </strong>
        </div>
      </div>
      <div className="toolbar-card toolbar-card-wrap">
        <label className="toolbar-field">
          <span>{t("logs.level_filter", "Level")}</span>
          <select
            data-testid="logs-level-filter"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            <option value="">{t("logs.all_levels", "All levels")}</option>
            <option value="debug">{t("log_level.debug", "debug")}</option>
            <option value="info">{t("log_level.info", "info")}</option>
            <option value="warning">{t("log_level.warning", "warning")}</option>
            <option value="error">{t("log_level.error", "error")}</option>
            <option value="critical">{t("log_level.critical", "critical")}</option>
          </select>
        </label>
        <label className="toolbar-field">
          <span>{t("logs.category_filter", "Category")}</span>
          <select
            data-testid="logs-category-filter"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">{t("logs.all_categories", "All categories")}</option>
            {categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
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
      <Panel title={t("logs.recent", "Recent logs")}>
        {logs.length === 0 ? (
          <div className="muted-text">{t("logs.empty", "No logs match the current filters.")}</div>
        ) : null}
        <DataTable
          headers={[
            t("table.time", "Time"),
            t("table.level", "Level"),
            t("table.category", "Category"),
            t("table.message", "Message"),
            t("table.user", "User"),
          ]}
        >
          {logs.map((entry) => (
            <tr key={entry.id}>
              <td>{formatDateTime(entry.occurred_at)}</td>
              <td>
                <span className={`log-level-pill log-level-${entry.level}`}>
                  {t(`log_level.${entry.level}`, entry.level)}
                </span>
              </td>
              <td>{entry.category}</td>
              <td>{entry.message}</td>
              <td>{entry.username ?? t("logs.system", "system")}</td>
            </tr>
          ))}
        </DataTable>
        <div className="table-pagination" data-testid="logs-pagination">
          <button
            className="ghost-button"
            disabled={offset === 0}
            onClick={previousPage}
          >
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
    </div>
  );
}

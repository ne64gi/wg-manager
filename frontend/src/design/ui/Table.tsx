import type { PropsWithChildren, ReactNode } from "react";

export type DataTableHeader =
  | ReactNode
  | {
      label: ReactNode;
      sortable?: boolean;
      sortDirection?: "asc" | "desc" | null;
      onToggleSort?: () => void;
    };

export function DataTable({
  headers,
  children,
}: PropsWithChildren<{ headers: DataTableHeader[] }>) {
  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>
                {typeof header === "object" &&
                header !== null &&
                "label" in header ? (
                  header.sortable && header.onToggleSort ? (
                    <button
                      type="button"
                      className={`table-sort-button ${header.sortDirection ? "table-sort-button-active" : ""}`}
                      onClick={header.onToggleSort}
                    >
                      <span>{header.label}</span>
                      <span className="table-sort-glyph" aria-hidden="true">
                        {header.sortDirection === "asc"
                          ? "↑"
                          : header.sortDirection === "desc"
                            ? "↓"
                            : "↕"}
                      </span>
                    </button>
                  ) : (
                    header.label
                  )
                ) : (
                  header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

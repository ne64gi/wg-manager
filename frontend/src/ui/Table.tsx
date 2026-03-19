import type { PropsWithChildren, ReactNode } from "react";

export function DataTable({
  headers,
  children,
}: PropsWithChildren<{ headers: ReactNode[] }>) {
  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

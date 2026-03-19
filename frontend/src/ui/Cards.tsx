import type { PropsWithChildren, ReactNode } from "react";

export function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{title}</div>
      <div className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
}: PropsWithChildren<{ title: string; actions?: ReactNode }>) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listAuditLogs, listOperationLogs } from "../../lib/api";
import { useAuth } from "../../core/auth/AuthContext";

export function useLogsPageData() {
  const auth = useAuth();
  const [tab, setTab] = useState<"operation" | "audit">("operation");
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const limit = 50;
  const operationEntityOptions = useMemo(
    () => ["authorization", "group", "user", "peer", "login_user", "gui_settings", "initial_settings"],
    [],
  );
  const auditCategoryOptions = useMemo(
    () => ["auth", "authz", "login_user", "settings"],
    [],
  );

  const operationLogsQuery = useQuery({
    queryKey: ["gui", "operation-logs", limit, offset, search],
    queryFn: async () =>
      listOperationLogs((await auth.getValidAccessToken()) ?? "", {
        limit,
        offset,
        search: search || undefined,
      }),
    enabled: tab === "operation",
  });

  const auditLogsQuery = useQuery({
    queryKey: ["gui", "audit-logs", limit, offset, search],
    queryFn: async () =>
      listAuditLogs((await auth.getValidAccessToken()) ?? "", {
        limit,
        offset,
        search: search || undefined,
      }),
    enabled: tab === "audit",
  });

  const activeQuery = tab === "operation" ? operationLogsQuery : auditLogsQuery;
  const logs = activeQuery.data?.items ?? [];
  const total = activeQuery.data?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  return {
    tab,
    setTab: (nextTab: "operation" | "audit") => {
      setOffset(0);
      setSearch("");
      setTab(nextTab);
    },
    logs,
    total,
    from,
    to,
    offset,
    limit,
    search,
    setSearch: (value: string) => {
      setOffset(0);
      setSearch(value);
    },
    previousPage: () => setOffset((current) => Math.max(0, current - limit)),
    nextPage: () => setOffset((current) => current + limit),
    operationEntityOptions,
    auditCategoryOptions,
  };
}

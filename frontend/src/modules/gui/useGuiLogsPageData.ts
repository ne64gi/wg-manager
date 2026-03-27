import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listGuiLogs } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useGuiSettingsQuery } from "./useGuiSettingsQuery";
import { queryKeys } from "../queryKeys";

export function useGuiLogsPageData() {
  const auth = useAuth();
  const guiSettingsQuery = useGuiSettingsQuery();
  const [offset, setOffset] = useState(0);
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const limit = 50;
  const categoryOptions = useMemo(
    () => ["auth", "settings", "secret", "server", "peer", "group", "user"],
    [],
  );

  const logsQuery = useQuery({
    queryKey: queryKeys.guiLogs({ limit, offset, level, category, search }),
    queryFn: async () =>
      listGuiLogs((await auth.getValidAccessToken()) ?? "", {
        limit,
        offset,
        level: level || undefined,
        category: category || undefined,
        search: search || undefined,
      }),
  });

  const logs = logsQuery.data?.items ?? [];
  const total = logsQuery.data?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  return {
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
    setLevel: (value: string) => {
      setOffset(0);
      setLevel(value);
    },
    setCategory: (value: string) => {
      setOffset(0);
      setCategory(value);
    },
    setSearch: (value: string) => {
      setOffset(0);
      setSearch(value);
    },
    previousPage: () => setOffset((current) => Math.max(0, current - limit)),
    nextPage: () => setOffset((current) => current + limit),
  };
}

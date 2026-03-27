import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  applyServerConfig,
  getGroupSummaries,
  getOverview,
  getOverviewHistory,
  getSyncState,
  getUserSummaries,
} from "../../lib/api";
import { t } from "../../core/i18n";
import type { UserTrafficSummary } from "../../types";
import { useToast } from "../../design/ui/ToastProvider";
import { useAuth } from "../../core/auth/AuthContext";
import { useGuiSettingsQuery } from "../gui/useGuiSettingsQuery";
import { queryKeys } from "../queryKeys";

export function useDashboardData() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const guiSettingsQuery = useGuiSettingsQuery();
  const { pushToast } = useToast();
  const overviewRefreshMs = (guiSettingsQuery.data?.overview_refresh_seconds ?? 5) * 1000;

  const applyMutation = useMutation({
    mutationFn: async () => applyServerConfig((await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      pushToast(t("peers.apply_notice", "Config applied."));
      await queryClient.invalidateQueries({ queryKey: queryKeys.overview });
      await queryClient.invalidateQueries({ queryKey: queryKeys.overviewHistory(24) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.userSummaries });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupSummaries });
      await queryClient.invalidateQueries({ queryKey: queryKeys.peerStatuses });
      await queryClient.invalidateQueries({ queryKey: queryKeys.syncState });
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("common.apply_failed", "Apply failed."),
        "error",
      );
    },
  });

  const overviewQuery = useQuery({
    queryKey: queryKeys.overview,
    queryFn: async () => getOverview((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: overviewRefreshMs,
  });
  const usersQuery = useQuery({
    queryKey: queryKeys.userSummaries,
    queryFn: async () => getUserSummaries((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: overviewRefreshMs,
  });
  const groupsQuery = useQuery({
    queryKey: queryKeys.groupSummaries,
    queryFn: async () => getGroupSummaries((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: overviewRefreshMs,
  });
  const historyQuery = useQuery({
    queryKey: queryKeys.overviewHistory(24),
    queryFn: async () => getOverviewHistory((await auth.getValidAccessToken()) ?? "", 24),
    refetchInterval: overviewRefreshMs,
  });
  const syncStateQuery = useQuery({
    queryKey: queryKeys.syncState,
    queryFn: async () => getSyncState((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: overviewRefreshMs,
  });

  const overview = overviewQuery.data;
  const groups = groupsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const historyPoints = historyQuery.data ?? [];
  const syncState = syncStateQuery.data;
  const hasRuntimeDrift = (syncState?.drift_reasons?.length ?? 0) > 0;
  const hasPendingGeneration = (syncState?.pending_generation_count ?? 0) > 0;
  const timelinePath = buildTimelinePath(historyPoints.map((point) => point.total_usage_bytes));
  const onlinePath = buildTimelinePath(historyPoints.map((point) => point.online_peer_count));
  const userSummariesByGroup = useMemo(() => {
    const result = new Map<number, UserTrafficSummary[]>();
    for (const user of users) {
      const current = result.get(user.group_id) ?? [];
      current.push(user);
      result.set(user.group_id, current);
    }
    return result;
  }, [users]);
  const topologyGroups = useMemo(
    () =>
      groups.map((group) => ({
        groupId: group.group_id,
        groupName: group.group_name,
        scope: group.group_scope,
        userCount: group.user_count,
        peerCount: group.peer_count,
        users: (userSummariesByGroup.get(group.group_id) ?? []).slice(0, 4),
      })),
    [groups, userSummariesByGroup],
  );

  return {
    overview,
    groups,
    historyPoints,
    syncState,
    hasRuntimeDrift,
    hasPendingGeneration,
    timelinePath,
    onlinePath,
    userSummariesByGroup,
    topologyGroups,
    applyMutation,
  };
}

export function translateDriftReason(reason: string): string {
  const missingMatch = reason.match(/^(\d+)\s+desired peers are missing from runtime$/);
  if (missingMatch) {
    return t("dashboard.drift_missing_runtime", "{count} required peers are not present in the runtime.").replace(
      "{count}",
      missingMatch[1],
    );
  }

  const unexpectedMatch = reason.match(/^(\d+)\s+runtime peers are not managed by current state$/);
  if (unexpectedMatch) {
    return t("dashboard.drift_unmanaged_runtime", "{count} runtime peers are not part of the current managed state.").replace(
      "{count}",
      unexpectedMatch[1],
    );
  }

  const allowedIpsMatch = reason.match(
    /^(\d+)\s+peers have runtime allowed IPs that differ from desired state$/,
  );
  if (allowedIpsMatch) {
    return t(
      "dashboard.drift_allowed_ips",
      "{count} peers have runtime AllowedIPs that do not match the expected state.",
    ).replace("{count}", allowedIpsMatch[1]);
  }

  return reason;
}

function buildTimelinePath(values: number[]): string | null {
  if (values.length === 0) {
    return null;
  }

  if (values.length === 1) {
    const y = 52;
    return `M 0 ${y} L 100 ${y}`;
  }

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = Math.max(1, maxValue - minValue);

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const normalized = (value - minValue) / range;
      const y = 88 - normalized * 58;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

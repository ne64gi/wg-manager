import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  applyServerConfig,
  getTopology,
  getSystemVersion,
  getOverview,
  getOverviewHistory,
  getSyncState,
} from "../../lib/api";
import { t } from "../../core/i18n";
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
  const [historyWindowHours, setHistoryWindowHours] = useState(24);

  const applyMutation = useMutation({
    mutationFn: async () => applyServerConfig((await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      pushToast(t("peers.apply_notice", "Config applied."));
      await queryClient.invalidateQueries({ queryKey: queryKeys.overview });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.overviewHistory(historyWindowHours),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.peerStatuses });
      await queryClient.invalidateQueries({ queryKey: queryKeys.serverConfigPreview });
      await queryClient.invalidateQueries({ queryKey: queryKeys.syncState });
      await queryClient.invalidateQueries({ queryKey: queryKeys.topology });
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
  const historyQuery = useQuery({
    queryKey: queryKeys.overviewHistory(historyWindowHours),
    queryFn: async () =>
      getOverviewHistory((await auth.getValidAccessToken()) ?? "", historyWindowHours),
    refetchInterval: overviewRefreshMs,
  });
  const syncStateQuery = useQuery({
    queryKey: queryKeys.syncState,
    queryFn: async () => getSyncState((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: overviewRefreshMs,
  });
  const systemVersionQuery = useQuery({
    queryKey: queryKeys.systemVersion,
    queryFn: async () => getSystemVersion((await auth.getValidAccessToken()) ?? ""),
    enabled: auth.isAuthenticated,
    refetchInterval: overviewRefreshMs,
  });
  const topologyQuery = useQuery({
    queryKey: queryKeys.topology,
    queryFn: async () => getTopology((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: overviewRefreshMs,
  });

  const overview = overviewQuery.data;
  const historyPoints = historyQuery.data ?? [];
  const syncState = syncStateQuery.data;
  const systemVersion = systemVersionQuery.data;
  const topologyGroups = topologyQuery.data ?? [];
  const hasRuntimeDrift = (syncState?.drift_reasons?.length ?? 0) > 0;
  const hasPendingGeneration = (syncState?.pending_generation_count ?? 0) > 0;

  return {
    overview,
    historyPoints,
    historyWindowHours,
    syncState,
    systemVersion,
    hasRuntimeDrift,
    hasPendingGeneration,
    topologyGroups,
    setHistoryWindowHours,
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

import type {
  GroupTrafficSummary,
  PeerStatus,
  SyncState,
  TopologyGroup,
  UserTrafficSummary,
  WireGuardOverview,
  WireGuardOverviewHistoryPoint,
} from "../../types";
import { request } from "./client";

export function getOverview(accessToken: string): Promise<WireGuardOverview> {
  return request<WireGuardOverview>("/status/overview", { accessToken });
}

export function getSyncState(accessToken: string): Promise<SyncState> {
  return request<SyncState>("/status/sync-state", { accessToken });
}

export function getOverviewHistory(
  accessToken: string,
  hours = 24,
): Promise<WireGuardOverviewHistoryPoint[]> {
  return request<WireGuardOverviewHistoryPoint[]>(
    `/status/overview-history?hours=${hours}`,
    { accessToken },
  );
}

export function getPeerStatuses(accessToken: string): Promise<PeerStatus[]> {
  return request<PeerStatus[]>("/status/peers", { accessToken });
}

export function getUserSummaries(accessToken: string): Promise<UserTrafficSummary[]> {
  return request<UserTrafficSummary[]>("/status/users-summary", { accessToken });
}

export function getGroupSummaries(accessToken: string): Promise<GroupTrafficSummary[]> {
  return request<GroupTrafficSummary[]>("/status/groups-summary", { accessToken });
}

export function getTopology(accessToken: string): Promise<TopologyGroup[]> {
  return request<TopologyGroup[]>("/status/topology", { accessToken });
}

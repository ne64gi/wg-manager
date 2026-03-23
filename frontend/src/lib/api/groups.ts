import type { BundleWarning, Group, GroupCreateInput, GroupUpdateInput } from "../../types";
import { request, requestBlob } from "./client";

export function listGroups(accessToken: string): Promise<Group[]> {
  return request<Group[]>("/groups", { accessToken });
}

export function createGroup(accessToken: string, payload: GroupCreateInput): Promise<Group> {
  return request<Group>("/groups", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function updateGroup(
  accessToken: string,
  groupId: number,
  payload: GroupUpdateInput,
): Promise<Group> {
  return request<Group>(`/groups/${groupId}`, {
    method: "PATCH",
    accessToken,
    body: payload,
  });
}

export function deleteGroup(groupId: number, accessToken: string): Promise<void> {
  return request<void>(`/groups/${groupId}`, { method: "DELETE", accessToken });
}

export function getGroupBundleWarning(
  groupId: number,
  accessToken: string,
): Promise<BundleWarning> {
  return request<BundleWarning>(`/config/groups/${groupId}/bundle-warning`, {
    accessToken,
  });
}

export function downloadGroupBundle(groupId: number, accessToken: string): Promise<Blob> {
  return requestBlob(`/config/groups/${groupId}/bundle`, {
    method: "POST",
    accessToken,
  });
}

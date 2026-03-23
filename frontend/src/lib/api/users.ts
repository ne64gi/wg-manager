import type { BundleWarning, User, UserCreateInput, UserUpdateInput } from "../../types";
import { request, requestBlob } from "./client";

export function listUsers(accessToken: string): Promise<User[]> {
  return request<User[]>("/users", { accessToken });
}

export function createUser(accessToken: string, payload: UserCreateInput): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function updateUser(
  accessToken: string,
  userId: number,
  payload: UserUpdateInput,
): Promise<User> {
  return request<User>(`/users/${userId}`, {
    method: "PATCH",
    accessToken,
    body: payload,
  });
}

export function deleteUser(userId: number, accessToken: string): Promise<void> {
  return request<void>(`/users/${userId}`, { method: "DELETE", accessToken });
}

export function getUserBundleWarning(
  userId: number,
  accessToken: string,
): Promise<BundleWarning> {
  return request<BundleWarning>(`/config/users/${userId}/bundle-warning`, {
    accessToken,
  });
}

export function downloadUserBundle(userId: number, accessToken: string): Promise<Blob> {
  return requestBlob(`/config/users/${userId}/bundle`, {
    method: "POST",
    accessToken,
  });
}

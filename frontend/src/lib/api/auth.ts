import type {
  AuthChangePasswordRequest,
  AuthLoginRequest,
  AuthSetupRequest,
  AuthSetupStatus,
  AuthenticatedLoginUser,
  AuthUpdateProfileRequest,
  TokenPair,
} from "../../types";
import { request } from "./client";

export function login(payload: AuthLoginRequest): Promise<TokenPair> {
  return request<TokenPair>("/auth/login", { method: "POST", body: payload });
}

export function getAuthSetupStatus(): Promise<AuthSetupStatus> {
  return request<AuthSetupStatus>("/auth/setup-status");
}

export function setupInitialLoginUser(payload: AuthSetupRequest): Promise<TokenPair> {
  return request<TokenPair>("/auth/setup", { method: "POST", body: payload });
}

export function refresh(refreshToken: string): Promise<TokenPair> {
  return request<TokenPair>("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

export function logout(accessToken: string, refreshToken: string): Promise<void> {
  return request<void>("/auth/logout", {
    method: "POST",
    accessToken,
    body: { refresh_token: refreshToken },
  });
}

export function getAuthMe(accessToken: string): Promise<AuthenticatedLoginUser> {
  return request<AuthenticatedLoginUser>("/auth/me", { accessToken });
}

export function changeOwnPassword(
  accessToken: string,
  payload: AuthChangePasswordRequest,
): Promise<AuthenticatedLoginUser> {
  return request<AuthenticatedLoginUser>("/auth/change-password", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function updateOwnProfile(
  accessToken: string,
  payload: AuthUpdateProfileRequest,
): Promise<AuthenticatedLoginUser> {
  return request<AuthenticatedLoginUser>("/auth/me", {
    method: "PATCH",
    accessToken,
    body: payload,
  });
}

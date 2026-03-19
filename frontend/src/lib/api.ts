import { API_BASE_URL } from "../config";
import type {
  AuthLoginRequest,
  ApplyResult,
  AuthenticatedLoginUser,
  GeneratedPeerArtifacts,
  GeneratedServerArtifacts,
  Group,
  GroupCreateInput,
  GroupTrafficSummary,
  GuiLog,
  GuiSettings,
  GuiSettingsUpdate,
  InitialSettings,
  InitialSettingsUpdate,
  LoginUser,
  LoginUserCreate,
  LoginUserUpdate,
  Peer,
  PeerStatus,
  RevealedPeerArtifacts,
  TokenPair,
  User,
  UserCreateInput,
  UserTrafficSummary,
  WireGuardOverviewHistoryPoint,
  WireGuardOverview,
  PeerCreateInput,
} from "../types";

type ApiOptions = {
  accessToken?: string | null;
  method?: string;
  body?: unknown;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers();
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      // Ignore parse errors and fall back to status text.
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function login(payload: AuthLoginRequest): Promise<TokenPair> {
  return request<TokenPair>("/auth/login", { method: "POST", body: payload });
}

export function refresh(refreshToken: string): Promise<TokenPair> {
  return request<TokenPair>("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

export function logout(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  return request<void>("/auth/logout", {
    method: "POST",
    accessToken,
    body: { refresh_token: refreshToken },
  });
}

export function getAuthMe(accessToken: string): Promise<AuthenticatedLoginUser> {
  return request<AuthenticatedLoginUser>("/auth/me", { accessToken });
}

export function getOverview(accessToken: string): Promise<WireGuardOverview> {
  return request<WireGuardOverview>("/status/overview", { accessToken });
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

export function getGroupSummaries(
  accessToken: string,
): Promise<GroupTrafficSummary[]> {
  return request<GroupTrafficSummary[]>("/status/groups-summary", { accessToken });
}

export function listGroups(accessToken: string): Promise<Group[]> {
  return request<Group[]>("/groups", { accessToken });
}

export function createGroup(
  accessToken: string,
  payload: GroupCreateInput,
): Promise<Group> {
  return request<Group>("/groups", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function listUsers(accessToken: string): Promise<User[]> {
  return request<User[]>("/users", { accessToken });
}

export function createUser(
  accessToken: string,
  payload: UserCreateInput,
): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function listPeers(accessToken: string): Promise<Peer[]> {
  return request<Peer[]>("/peers", { accessToken });
}

export function createPeer(
  accessToken: string,
  payload: PeerCreateInput,
): Promise<Peer> {
  return request<Peer>("/peers", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function deletePeer(peerId: number, accessToken: string): Promise<void> {
  return request<void>(`/peers/${peerId}`, { method: "DELETE", accessToken });
}

export function revokePeer(peerId: number, accessToken: string): Promise<Peer> {
  return request<Peer>(`/peers/${peerId}/revoke`, { method: "POST", accessToken });
}

export function revealPeerArtifacts(
  peerId: number,
  accessToken: string,
): Promise<RevealedPeerArtifacts> {
  return request<RevealedPeerArtifacts>(`/config/peers/${peerId}/reveal`, {
    method: "POST",
    accessToken,
  });
}

export function generateServerConfig(
  accessToken: string,
): Promise<GeneratedServerArtifacts> {
  return request<GeneratedServerArtifacts>("/config/server/generate", {
    method: "POST",
    accessToken,
  });
}

export function applyServerConfig(accessToken: string): Promise<ApplyResult> {
  return request<ApplyResult>("/config/server/apply", {
    method: "POST",
    accessToken,
  });
}

export function getGuiSettings(accessToken: string): Promise<GuiSettings> {
  return request<GuiSettings>("/gui/settings", { accessToken });
}

export function updateGuiSettings(
  accessToken: string,
  payload: GuiSettingsUpdate,
): Promise<GuiSettings> {
  return request<GuiSettings>("/gui/settings", {
    method: "PUT",
    accessToken,
    body: payload,
  });
}

export function getInitialSettings(accessToken: string): Promise<InitialSettings> {
  return request<InitialSettings>("/initial-settings", { accessToken });
}

export function updateInitialSettings(
  accessToken: string,
  payload: InitialSettingsUpdate,
): Promise<InitialSettings> {
  return request<InitialSettings>("/initial-settings", {
    method: "PUT",
    accessToken,
    body: payload,
  });
}

export function listLoginUsers(accessToken: string): Promise<LoginUser[]> {
  return request<LoginUser[]>("/gui/login-users", { accessToken });
}

export function createLoginUser(
  accessToken: string,
  payload: LoginUserCreate,
): Promise<LoginUser> {
  return request<LoginUser>("/gui/login-users", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function updateLoginUser(
  accessToken: string,
  loginUserId: number,
  payload: LoginUserUpdate,
): Promise<LoginUser> {
  return request<LoginUser>(`/gui/login-users/${loginUserId}`, {
    method: "PATCH",
    accessToken,
    body: payload,
  });
}

export function deleteLoginUser(
  accessToken: string,
  loginUserId: number,
): Promise<void> {
  return request<void>(`/gui/login-users/${loginUserId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function listGuiLogs(
  accessToken: string,
  limit = 100,
): Promise<GuiLog[]> {
  return request<GuiLog[]>(`/gui/logs?limit=${limit}`, { accessToken });
}

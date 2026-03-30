import type {
  AuditLogList,
  GuiLogList,
  GuiSettings,
  GuiSettingsUpdate,
  LoginUser,
  LoginUserCreate,
  LoginUserUpdate,
  OperationLogList,
  SystemVersion,
} from "../../types";
import { request } from "./client";

export function getGuiSettings(accessToken: string): Promise<GuiSettings> {
  return request<GuiSettings>("/gui/settings", { accessToken });
}

export function getSystemVersion(accessToken: string): Promise<SystemVersion> {
  return request<SystemVersion>("/gui/version", { accessToken });
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

export function deleteLoginUser(accessToken: string, loginUserId: number): Promise<void> {
  return request<void>(`/gui/login-users/${loginUserId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function listGuiLogs(
  accessToken: string,
  options: {
    limit?: number;
    offset?: number;
    level?: string;
    category?: string;
    search?: string;
  } = {},
): Promise<GuiLogList> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 50));
  params.set("offset", String(options.offset ?? 0));
  if (options.level) {
    params.set("level", options.level);
  }
  if (options.category) {
    params.set("category", options.category);
  }
  if (options.search) {
    params.set("search", options.search);
  }
  return request<GuiLogList>(`/gui/logs?${params.toString()}`, { accessToken });
}

export function listOperationLogs(
  accessToken: string,
  options: {
    limit?: number;
    offset?: number;
    action?: string;
    entity_type?: string;
    search?: string;
  } = {},
): Promise<OperationLogList> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 50));
  params.set("offset", String(options.offset ?? 0));
  if (options.action) {
    params.set("action", options.action);
  }
  if (options.entity_type) {
    params.set("entity_type", options.entity_type);
  }
  if (options.search) {
    params.set("search", options.search);
  }
  return request<OperationLogList>(`/gui/operation-logs?${params.toString()}`, {
    accessToken,
  });
}

export function listAuditLogs(
  accessToken: string,
  options: {
    limit?: number;
    offset?: number;
    category?: string;
    outcome?: string;
    search?: string;
  } = {},
): Promise<AuditLogList> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 50));
  params.set("offset", String(options.offset ?? 0));
  if (options.category) {
    params.set("category", options.category);
  }
  if (options.outcome) {
    params.set("outcome", options.outcome);
  }
  if (options.search) {
    params.set("search", options.search);
  }
  return request<AuditLogList>(`/gui/audit-logs?${params.toString()}`, {
    accessToken,
  });
}

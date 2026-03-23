import type {
  InitialSettings,
  InitialSettingsUpdate,
  StateExport,
  StateImportResult,
} from "../../types";
import { request } from "./client";

export function getInitialSettings(accessToken: string): Promise<InitialSettings> {
  return request<InitialSettings>("/initial-settings", { accessToken });
}

export function exportState(accessToken: string): Promise<StateExport> {
  return request<StateExport>("/state/export", { accessToken });
}

export function importState(
  accessToken: string,
  payload: StateExport,
): Promise<StateImportResult> {
  return request<StateImportResult>("/state/import", {
    method: "POST",
    accessToken,
    body: payload,
  });
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

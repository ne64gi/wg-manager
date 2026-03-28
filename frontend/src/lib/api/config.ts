import type { ApplyResult, GeneratedServerArtifacts, ServerConfigPreview } from "../../types";
import { request } from "./client";

export function generateServerConfig(accessToken: string): Promise<GeneratedServerArtifacts> {
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

export function getServerConfigPreview(accessToken: string): Promise<ServerConfigPreview> {
  return request<ServerConfigPreview>("/config/server/preview", {
    accessToken,
  });
}

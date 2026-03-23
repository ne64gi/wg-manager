import type { ApplyResult, GeneratedServerArtifacts } from "../../types";
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

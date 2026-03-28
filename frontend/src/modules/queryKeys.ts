export const queryKeys = {
  authMe: ["auth", "me"] as const,
  guiSettings: ["gui", "settings"] as const,
  systemVersion: ["gui", "version"] as const,
  overview: ["status", "overview"] as const,
  syncState: ["status", "sync-state"] as const,
  overviewHistory: (hours: number) => ["status", "overview-history", hours] as const,
  peerStatuses: ["status", "peers"] as const,
  userSummaries: ["status", "users-summary"] as const,
  groupSummaries: ["status", "groups-summary"] as const,
  groups: ["domain", "groups"] as const,
  users: ["domain", "users"] as const,
  peers: ["domain", "peers"] as const,
  loginUsers: ["gui", "login-users"] as const,
  guiLogs: (params: { limit: number; offset: number; level: string; category: string; search: string }) =>
    ["gui", "logs", params.limit, params.offset, params.level, params.category, params.search] as const,
  initialSettings: ["domain", "initial-settings"] as const,
};

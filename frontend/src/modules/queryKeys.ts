export const queryKeys = {
  authMe: ["auth", "me"] as const,
  guiSettings: ["gui", "settings"] as const,
  overview: ["status", "overview"] as const,
  peerStatuses: ["status", "peers"] as const,
  userSummaries: ["status", "users-summary"] as const,
  groupSummaries: ["status", "groups-summary"] as const,
  groups: ["domain", "groups"] as const,
  users: ["domain", "users"] as const,
  peers: ["domain", "peers"] as const,
  loginUsers: ["gui", "login-users"] as const,
  guiLogs: (limit: number) => ["gui", "logs", limit] as const,
  initialSettings: ["domain", "initial-settings"] as const,
};

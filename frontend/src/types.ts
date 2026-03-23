export type ThemeMode = "light" | "dark" | "system";
export type LocaleCode = "en" | "ja";

export type AuthLoginRequest = {
  username: string;
  password: string;
};

export type AuthSetupStatus = {
  has_login_users: boolean;
};

export type AuthSetupRequest = {
  username: string;
  password: string;
};

export type AuthChangePasswordRequest = {
  current_password: string;
  new_password: string;
};

export type SystemVersion = {
  version: string;
  frontend_version: string;
  runtime_adapter: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
};

export type AuthenticatedLoginUser = {
  id: number;
  username: string;
  description: string;
  is_active: boolean;
  last_login_at: string | null;
};

export type WireGuardOverview = {
  interface_name: string;
  total_received_bytes: number;
  total_sent_bytes: number;
  total_usage_bytes: number;
  peer_count: number;
  active_peer_count: number;
  online_peer_count: number;
};

export type SyncState = {
  interface_name: string;
  status: "synced" | "drifted" | "runtime_unavailable" | string;
  desired_peer_count: number;
  runtime_peer_count: number;
  pending_generation_count: number;
  drift_detected: boolean;
  drift_reasons: string[];
  last_generated_at: string | null;
  last_runtime_sync_at: string | null;
};

export type WireGuardOverviewHistoryPoint = {
  captured_at: string;
  total_received_bytes: number;
  total_sent_bytes: number;
  total_usage_bytes: number;
  online_peer_count: number;
};

export type PeerStatus = {
  peer_id: number;
  peer_name: string;
  user_id: number;
  user_name: string;
  public_key: string;
  assigned_ip: string;
  endpoint: string | null;
  latest_handshake_at: string | null;
  received_bytes: number;
  sent_bytes: number;
  total_bytes: number;
  is_online: boolean;
  is_active: boolean;
  is_revealed: boolean;
  description: string;
  effective_allowed_ips: string[];
};

export type UserTrafficSummary = {
  user_id: number;
  user_name: string;
  group_id: number;
  group_name: string;
  peer_count: number;
  active_peer_count: number;
  online_peer_count: number;
  total_received_bytes: number;
  total_sent_bytes: number;
  total_usage_bytes: number;
};

export type GroupTrafficSummary = {
  group_id: number;
  group_name: string;
  group_scope: string;
  user_count: number;
  peer_count: number;
  active_peer_count: number;
  online_peer_count: number;
  total_received_bytes: number;
  total_sent_bytes: number;
  total_usage_bytes: number;
};

export type Group = {
  id: number;
  name: string;
  scope: string;
  network_cidr: string;
  default_allowed_ips: string[];
  dns_servers: string[];
  allocation_start_host: number;
  reserved_ips: string[];
  description: string;
  is_active: boolean;
};

export type GroupCreateInput = {
  name: string;
  scope: string;
  network_cidr: string;
  default_allowed_ips: string[];
  dns_servers?: string[] | null;
  allocation_start_host?: number;
  reserved_ips?: string[];
  description?: string;
  is_active?: boolean;
};

export type User = {
  id: number;
  group_id: number;
  name: string;
  allowed_ips_override: string[] | null;
  description: string;
  is_active: boolean;
};

export type UserCreateInput = {
  group_id: number;
  name: string;
  allowed_ips_override?: string[] | null;
  description?: string;
  is_active?: boolean;
};

export type Peer = {
  id: number;
  user_id: number;
  name: string;
  assigned_ip: string;
  public_key: string | null;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
  last_config_generated_at: string | null;
  is_revealed: boolean;
  revealed_at: string | null;
};

export type GroupUpdateInput = Partial<
  Pick<GroupCreateInput, "name" | "default_allowed_ips" | "dns_servers" | "description" | "is_active">
>;

export type UserUpdateInput = Partial<
  Pick<UserCreateInput, "name" | "allowed_ips_override" | "description" | "is_active">
>;

export type PeerUpdateInput = Partial<
  Pick<PeerCreateInput, "name" | "assigned_ip" | "description" | "is_active">
>;

export type PeerCreateInput = {
  user_id: number;
  name: string;
  assigned_ip?: string | null;
  description?: string;
  is_active?: boolean;
};

export type GuiSettings = {
  id: number;
  created_at: string;
  updated_at: string;
  error_log_level: string;
  access_log_path: string;
  error_log_path: string;
  theme_mode: ThemeMode;
  default_locale: LocaleCode;
  overview_refresh_seconds: number;
  peers_refresh_seconds: number;
  traffic_snapshot_interval_seconds: number;
  refresh_after_apply: boolean;
  online_threshold_seconds: number;
};

export type GuiSettingsUpdate = Partial<
  Pick<
    GuiSettings,
    | "error_log_level"
    | "access_log_path"
    | "error_log_path"
    | "theme_mode"
    | "default_locale"
    | "overview_refresh_seconds"
    | "peers_refresh_seconds"
    | "traffic_snapshot_interval_seconds"
    | "refresh_after_apply"
    | "online_threshold_seconds"
  >
>;

export type LoginUser = {
  id: number;
  username: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type LoginUserCreate = {
  username: string;
  password: string;
  is_active?: boolean;
};

export type LoginUserUpdate = {
  password?: string;
  is_active?: boolean;
};

export type GuiLog = {
  id: number;
  occurred_at: string;
  level: string;
  category: string;
  message: string;
  login_user_id: number | null;
  username: string | null;
  request_path: string | null;
  request_method: string | null;
  status_code: number | null;
  details: Record<string, unknown>;
};

export type GuiLogList = {
  items: GuiLog[];
  total: number;
  limit: number;
  offset: number;
};

export type InitialSettings = {
  id: number;
  endpoint_address: string;
  endpoint_port: number;
  created_at: string;
  updated_at: string;
};

export type InitialSettingsUpdate = {
  endpoint_address: string;
  endpoint_port: number;
};

export type RevealedPeerArtifacts = {
  peer_id: number;
  peer_name: string;
  config_text: string;
  qr_svg: string;
  revealed_at: string;
};

export type BundleWarning = {
  message: string;
  peer_count: number;
  requires_reissue: boolean;
};

export type StateExportPeer = {
  name: string;
  assigned_ip: string;
  description: string;
  is_active: boolean;
  private_key: string | null;
  public_key: string | null;
  preshared_key: string | null;
  last_config_generated_at: string | null;
  is_revealed: boolean;
  revealed_at: string | null;
  revoked_at: string | null;
};

export type StateExportUser = {
  name: string;
  allowed_ips_override: string[] | null;
  description: string;
  is_active: boolean;
  peers: StateExportPeer[];
};

export type StateExportGroup = {
  name: string;
  scope: string;
  network_cidr: string;
  default_allowed_ips: string[];
  dns_servers: string[] | null;
  allocation_start_host: number;
  reserved_ips: string[];
  description: string;
  is_active: boolean;
  users: StateExportUser[];
};

export type StateExportServerState = {
  endpoint: string;
  listen_port: number;
  server_address: string;
  dns: string[];
  private_key: string;
  public_key: string;
};

export type StateExportGuiSettings = {
  theme_mode: ThemeMode;
  default_locale: LocaleCode;
  overview_refresh_seconds: number;
  peers_refresh_seconds: number;
  traffic_snapshot_interval_seconds: number;
  refresh_after_apply: boolean;
  online_threshold_seconds: number;
  error_log_level: string;
  access_log_path: string;
  error_log_path: string;
};

export type StateExport = {
  version: string;
  exported_at: string;
  server_state: StateExportServerState;
  initial_settings: InitialSettings;
  gui_settings: StateExportGuiSettings;
  groups: StateExportGroup[];
};

export type StateImportResult = {
  imported_group_count: number;
  imported_user_count: number;
  imported_peer_count: number;
  imported_at: string;
};

export type GeneratedPeerArtifacts = {
  peer_id: number;
  peer_name: string;
  config_path: string;
  qr_path: string;
  last_config_generated_at: string;
};

export type GeneratedServerArtifacts = {
  server_config_path: string;
  peer_count: number;
};

export type ApplyResult = {
  server_config_path: string;
  peer_count: number;
  runtime_adapter: string;
  interface_name: string;
  applied_at: string;
};

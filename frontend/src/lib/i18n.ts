const JA_TRANSLATIONS: Record<string, string> = {
  "nav.dashboard": "ダッシュボード",
  "nav.groups": "グループ",
  "nav.users": "ユーザー",
  "nav.peers": "ピア",
  "nav.settings": "設定",
  "nav.logs": "ログ",
  "auth.logout": "ログアウト",
  "auth.settings": "表示設定",
  "auth.login_title": "コントロールプレーンへログイン",
  "auth.login_description": "ピア管理、トラフィック集計、適用操作にアクセスします。",
  "auth.username": "ユーザー名",
  "auth.password": "パスワード",
  "auth.language": "言語",
  "auth.sign_in": "ログイン",
  "auth.signing_in": "ログイン中...",
  "auth.invalid_credentials": "ユーザー名またはパスワードが正しくありません",
  "common.close": "閉じる",
  "common.save": "保存",
  "common.search": "検索",
  "common.status": "状態",
  "common.actions": "操作",
  "common.enabled": "有効",
  "common.disabled": "無効",
  "common.none": "なし",
  "common.system": "system",
  "common.light": "light",
  "common.dark": "dark",
  "theme.quick_toggle": "テーマ",
  "theme.quick_hint_dark": "現在: ダーク",
  "theme.quick_hint_light": "現在: ライト",
  "theme.dark": "ダーク",
  "theme.light": "ライト",
  "dashboard.title": "WireGuard 全体概要",
  "dashboard.total_peers": "総ピア数",
  "dashboard.online_peers": "オンライン",
  "dashboard.traffic": "トラフィック",
  "dashboard.total_usage": "総使用量",
  "dashboard.timeline": "トラフィック推移 (24h)",
  "dashboard.timeline_ready": "履歴収集中です",
  "dashboard.timeline_ready_desc": "スナップショットがたまると、このグラフに推移が表示されます。",
  "dashboard.timeline_recorded": "件のトラフィックスナップショットを記録しました",
  "dashboard.timeline_latest": "最新の総使用量",
  "dashboard.group_online": "グループ別オンラインピア",
  "dashboard.no_group_data": "グループ集計データはまだありません。",
  "dashboard.user_traffic": "ユーザー別トラフィック",
  "dashboard.group_traffic": "グループ別トラフィック",
  "table.user": "ユーザー",
  "table.group": "グループ",
  "table.peers": "ピア",
  "table.online": "オンライン",
  "table.traffic": "トラフィック",
  "table.scope": "スコープ",
  "table.time": "時刻",
  "table.level": "レベル",
  "table.category": "カテゴリ",
  "table.message": "メッセージ",
  "groups.title": "ネットワークグループ",
  "groups.total": "総グループ数",
  "groups.list": "グループ一覧",
  "groups.add": "+ グループ追加",
  "groups.name": "グループ名",
  "groups.network": "ネットワーク",
  "groups.allowed_ips": "許可ルート",
  "groups.dns": "DNS",
  "groups.edit": "編集",
  "groups.delete": "削除",
  "groups.add_title": "グループ追加",
  "groups.edit_title": "グループ編集",
  "groups.scope": "スコープ",
  "groups.network_cidr": "ネットワーク CIDR",
  "groups.dns_servers": "DNS サーバー",
  "groups.description": "説明",
  "groups.create": "グループ作成",
  "groups.creating": "作成中...",
  "groups.save_changes": "変更を保存",
  "groups.saving": "保存中...",
  "groups.create_active": "このグループを有効な状態で作成します。",
  "groups.disable_hint": "無効にすると、このグループ経由の新しい利用が止まります。",
  "groups.inactive_dns": "—",
  "users.title": "ユーザーポリシー割り当て",
  "users.total": "総ユーザー数",
  "users.list": "ユーザー一覧",
  "users.add": "+ ユーザー追加",
  "users.group_filter": "グループ絞り込み",
  "users.all_groups": "すべてのグループ",
  "users.name": "ユーザー名",
  "users.override_routes": "上書きルート",
  "users.inherit_group": "グループ既定を継承",
  "users.edit": "編集",
  "users.delete": "削除",
  "users.add_title": "ユーザー追加",
  "users.edit_title": "ユーザー編集",
  "users.create": "ユーザー作成",
  "users.creating": "作成中...",
  "users.save_changes": "変更を保存",
  "users.saving": "保存中...",
  "users.create_active": "このユーザーを有効な状態で作成します。",
  "users.disable_hint": "無効にすると、このユーザーのピア通信を止めます。",
  "peers.title": "ピア管理",
  "peers.total": "総ピア数",
  "peers.total_traffic": "総トラフィック",
  "peers.list": "ピア一覧",
  "peers.add": "+ ピア追加",
  "peers.apply": "設定を適用",
  "peers.applying": "適用中...",
  "peers.search_placeholder": "ピア、ユーザー、グループ、IP、ルート...",
  "peers.peer": "ピア",
  "peers.ip": "IP",
  "peers.routes": "ルート",
  "peers.reveal_reissue": "表示 / 再生成",
  "peers.delete": "削除",
  "peers.reveal": "表示",
  "peers.reissue": "再生成",
  "peers.consumed": "表示済み",
  "peers.pending": "未表示",
  "peers.add_title": "ピア追加",
  "peers.select_user": "ユーザーを選択",
  "peers.assigned_ip": "割り当て IP",
  "peers.optional": "任意",
  "peers.create": "ピア作成",
  "peers.create_apply": "作成して適用",
  "peers.creating": "作成中...",
  "peers.create_active": "このピアを有効な状態で作成します。",
  "peers.enabled_state": "有効",
  "peers.on": "On",
  "peers.off": "Off",
  "peers.online": "Online",
  "peers.offline": "Offline",
  "peers.created_notice": "ピアを作成しました。",
  "peers.enabled_notice": "ピアを有効化しました。",
  "peers.disabled_notice": "ピアを無効化しました。",
  "peers.reissue_notice": "ピア鍵を再生成しました。",
  "peers.deleted_notice": "ピアを削除しました。",
  "peers.apply_notice": "設定を適用しました。",
  "peers.apply_failed": "適用に失敗しました",
  "peers.change_saved": "変更を保存しました。",
  "peers.delete_confirm_prefix": "ピアを削除しますか: ",
  "reveal.title": "WireGuard 設定を表示",
  "reveal.warning": "この設定は一度しか表示されません。今のうちに保存またはスキャンしてください。",
  "reveal.copy": "設定をコピー",
  "reveal.copied": "コピーしました",
  "reveal.copy_failed": "コピー失敗",
  "settings.title": "GUI と初期設定",
  "settings.theme_mode": "Theme mode",
  "settings.default_locale": "Default locale",
  "settings.error_log_level": "Error log level",
  "settings.gui_settings": "GUI 設定",
  "settings.endpoint_settings": "エンドポイント設定",
  "settings.login_users": "ログインユーザー",
  "settings.overview_refresh": "概要更新間隔 (秒)",
  "settings.peers_refresh": "ピア更新間隔 (秒)",
  "settings.snapshot_interval": "トラフィックスナップショット間隔 (秒)",
  "settings.online_threshold": "オンライン判定閾値 (秒)",
  "settings.access_log_path": "アクセスログパス",
  "settings.error_log_path": "エラーログパス",
  "settings.apply_after_change": "ピア変更後に即時適用",
  "settings.apply_after_change_hint": "有効な場合、作成・失効・削除のあと自動でサーバーへ適用します。",
  "settings.saved": "GUI 設定を保存しました。",
  "settings.endpoint_saved": "エンドポイント設定を保存しました。",
  "settings.endpoint_address": "エンドポイントアドレス",
  "settings.endpoint_port": "エンドポイントポート",
  "settings.add_user": "ユーザー追加",
  "settings.last_login": "最終ログイン",
  "logs.title": "GUI アクティビティログ",
  "logs.current_level": "現在のエラーログレベル",
  "logs.recent": "最近のログ",
  "logs.system": "system",
};

export function getUiLocale(): "en" | "ja" {
  if (typeof document === "undefined") {
    return "en";
  }

  return document.documentElement.lang === "ja" ? "ja" : "en";
}

export function t(key: string, fallback: string): string {
  if (getUiLocale() !== "ja") {
    return fallback;
  }

  return JA_TRANSLATIONS[key] ?? fallback;
}

export function translateErrorMessage(message: string): string {
  if (getUiLocale() !== "ja") {
    return message;
  }

  const normalized = message.trim().toLowerCase();
  if (normalized === "invalid username or password") {
    return t("auth.invalid_credentials", "ユーザー名またはパスワードが正しくありません");
  }

  return message;
}

const PREVIEW_LOCALE_KEY = "wg-studio-preview-locale";
const PREVIEW_THEME_KEY = "wg-studio-preview-theme";

export function getPreviewLocale(): "en" | "ja" {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(PREVIEW_LOCALE_KEY);
  return stored === "ja" ? "ja" : "en";
}

export function setPreviewLocale(locale: "en" | "ja"): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PREVIEW_LOCALE_KEY, locale);
  document.documentElement.lang = locale;
}

export function getPreviewTheme(): "light" | "dark" | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(PREVIEW_THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

export function setPreviewTheme(theme: "light" | "dark"): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PREVIEW_THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themeMode = theme;
}

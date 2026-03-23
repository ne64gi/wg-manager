# 認証と API ルール

## 認証モデル

`wg-studio` はローカルのログインユーザー、JWT アクセストークン、DB 保存の refresh セッションを使います。

基本フロー:

1. `GET /auth/setup-status` で初回セットアップ要否を確認
2. 必要なら `POST /auth/setup` で最初の管理ユーザーを作成
3. `POST /auth/login` でログイン
4. 保護ルートは `Authorization: Bearer <access_token>` で呼ぶ
5. `POST /auth/refresh` で更新
6. `POST /auth/logout` でセッションを破棄

補足:

- ロール分離はありません
- 認証済みログインユーザーは全員管理者相当です

## One-Time Reveal ルール

Peer の秘密情報は stable な read endpoint では取れません。

正規ルート:

- `POST /config/peers/{peer_id}/reveal`

挙動:

- peer 設定本文と QR SVG を返します
- `is_revealed = true` になります
- `revealed_at` が設定されます
- 再生成前の 2 回目 reveal は拒否されます
- キャッシュ済みファイルが one-time reveal を破ってはいけません

直接取得ルート:

- `GET /config/peers/{peer_id}` -> `410`
- `GET /config/peers/{peer_id}/qr` -> `410`

## Reissue ルール

- `POST /peers/{peer_id}/reissue`

再生成されるもの:

- private key
- public key
- preshared key

副作用:

- `is_revealed = false`
- `revealed_at = null`
- 次の reveal で新しい artifact が生成されます

## Bundle ZIP ルール

対象ルート:

- `GET /config/groups/{group_id}/bundle-warning`
- `POST /config/groups/{group_id}/bundle`
- `GET /config/users/{user_id}/bundle-warning`
- `POST /config/users/{user_id}/bundle`

挙動:

- 先に warning を取得して、GUI は確認ダイアログを出します
- bundle 作成時に対象 peer は再生成されます
- 再生成後の peer 設定が reveal 扱いで ZIP 化されます
- ZIP には `.conf`, `.svg`, `NOTICE.txt` が入ります
- 旧設定は実質的に置き換え対象になります

## JSON Export / Import ルール

対象ルート:

- `GET /state/export`
- `POST /state/import`

挙動:

- export は server state, initial settings, GUI settings, groups, users, peers を含みます
- import は現在の Group / User / Peer ツリーを置き換えます
- import は破壊的操作として扱う前提です

## エラーフォーマット

通常エラー:

```json
{
  "detail": "group not found"
}
```

バリデーションエラー:

```json
{
  "detail": [
    {
      "loc": ["body", "network_cidr"],
      "msg": "Value error, 10.10.0.1/24 has host bits set",
      "type": "value_error"
    }
  ]
}
```

クライアント側の扱い:

- `detail` が文字列ならそのまま表示
- `detail` が配列なら読みやすい文に平坦化して表示

## Status と Apply の扱い

GUI 側は status API をポーリングします。

関連する GUI 設定:

- `overview_refresh_seconds`
- `peers_refresh_seconds`
- `refresh_after_apply`

推奨ルール:

- `/status/overview` と `/status/overview-history` は overview 間隔でポーリング
- `/status/sync-state` も overview 間隔でポーリング
- `/status/peers` は peer 間隔でポーリング
- create/update/delete/reveal/reissue/apply 後は invalidate + refetch
- `refresh_after_apply = true` の場合、設定変更は「保存してから適用」として扱う
- `pending_generation_count` は runtime drift ではなく情報表示として扱う
- `pending_generation_count` は「まだ表示またはダウンロードされていない peer 設定件数」を意味する
- `pending_generation_count` だけで `適用が必要です` を出してはいけない
- 実際の drift がある場合は Dashboard から直接 `設定を適用` できるようにする

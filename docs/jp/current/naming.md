# 命名規則

## 目的

この文書は、`wg-studio v1.2.2` で使用する命名辞書と命名ルールの基準です。

- 先に辞書を固定する
- そのあとでコードを置換する
- 途中でルールをぶらさない

AI が参照する基準は [`../../ai/spec/naming.md`](../../ai/spec/naming.md) とし、この文書は人向けの補助参照とします。

## 基本ルール

### 1. 役割が分かる名前を優先する

- 抽象的な名前より、責務が読める名前を使う
- 同じ責務には同じ接尾辞を使う
- 表示名と内部識別子は必要に応じて分ける

### 2. レイヤごとに命名パターンを固定する

- ディレクトリ名: `kebab-case` は使わず、既存 backend は `snake_case`、frontend は既存構成に合わせて小文字ディレクトリ名を使う
- Python ファイル名: `snake_case`
- TypeScript ファイル名:
  - React component: `PascalCase.tsx`
  - hook / utility / module: `camelCase.ts` または `camelCase.tsx`
- API path: `kebab-case`
- query key: API の責務名に合わせる

### 3. Common と製品固有を混ぜない

- `gui` は「GUI 固有の設定・操作」を表す
- `domain` は「Group / User / Peer / InitialSettings など製品ドメイン」を表す
- `status` は「現在状態・観測結果」を表す
- `state` は「エクスポート / インポート対象の永続状態」を表す
- `config` は「生成・適用する設定アーティファクト」を表す

### 4. ページ用 hook の接尾辞を固定する

- 画面全体の表示用データと操作をまとめる hook は `use<PageName>PageData`
- 単一 query を返す hook は `use<Subject>Query`
- 一時 UI 状態だけを扱う hook も、ページ全体を束ねるなら `PageData` に寄せる

## 用語辞書

| Canonical term | 使う場面 | 使わない / 避ける | 意味 |
| --- | --- | --- | --- |
| `gui` | GUI 固有の設定、ログインユーザー、GUI ログ | `app` を GUI の意味で使う | 管理 UI 自体の責務 |
| `domain` | Group / User / Peer / InitialSettings | `data` | 製品の永続ドメイン |
| `status` | 現在の観測状態、同期状態、トラフィック集計 | `state` と混用しない | runtime から見た現在値 |
| `state` | export / import する永続スナップショット | `status` と混用しない | 保存・移送される状態 |
| `config` | 生成対象、適用対象の設定 | `settings` と混用しない | 実行に使う構成 |
| `settings` | GUI や初期値として編集する設定値 | `config` と混用しない | UI から管理する設定 |
| `overview` | ダッシュボードの全体サマリ | `summary` を同義で使わない | 俯瞰情報 |
| `summary` | 集計リストの1単位 | `overview` と混用しない | 主に user/group 単位の集計 |
| `page` | 画面単位の責務 | `screen` | ルーティングされた表示面 |
| `query` | 単一の取得処理 | `data` と混用しない | React Query の取得単位 |
| `mutation` | 変更処理 | `action` を API 取得と混用しない | React Query の更新単位 |

## 命名パターン

### Backend

- route handler: `<verb>_<subject>_endpoint`
- service function: `<verb>_<subject>`
- schema:
  - read model: `<Subject>Read`
  - create payload: `<Subject>Create`
  - update payload: `<Subject>Update`
- DB model: `<Subject>`

### Frontend

- page component: `<PageName>Page`
- page hook: `use<PageName>PageData`
- shared query hook: `use<Subject>Query`
- context: `<Subject>Context`
- provider component: `<Subject>Provider`
- browser helper: `<verb><Subject>`
- CSS class:
  - ブロックごとに prefix family を固定する。例: `login-*`, `sidebar-*`, `toolbar-*`
  - modifier は意味が読める名前にする。例: `login-card-wide`, `status-pill-online`
  - `-xui` や `-on` のような曖昧な suffix は避ける

## 現時点の統一方針

### 先にそろえる対象

- ページ用 hook の suffix を `PageData` に統一する
- 単一 query hook は `Query` に統一する
- `status` / `state` / `config` / `settings` の責務境界を守る
- CSS は分割前にクラス prefix と modifier 名を整理する

### 今回の初期候補

| 現在名 | 候補 | 理由 |
| --- | --- | --- |
| `useLoginPageState` | `useLoginPageData` | ページ全体の処理を持っており `State` より `PageData` が合う |
| `useGuiLogsPage` | `useGuiLogsPageData` | `gui` スコープを維持したまま `PageData` に統一する |
| `useSettingsPageData` | 現状維持 | `PageData` で一貫している |
| `useGuiSettingsQuery` | 現状維持 | 単一 query hook として分かりやすい |

## 置換時の注意

- API path 名は既存互換を意識し、必要がなければ v1.2.2 では変えない
- まず内部コード名をそろえる
- UI 表示ラベルは最後に確認する
- 一度に広げすぎず、まとまり単位で置換する

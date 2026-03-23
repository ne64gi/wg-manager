# リリースノート: `v1.1.1`

`wg-studio v1.1.1` は、`v1.0.0` 後の最初のメンテナンス兼土台づくりリリースです。

この版は大きな見た目変更よりも、`1.1` 系で必要になる内部の分離を先に始めることを目的にしています。

## 主な内容

- [`app/runtime/`](../../app/runtime/) に最初の runtime service 境界を導入
- artifact のパス解決とファイル書き込み責務を `ArtifactStore` に分離
- WireGuard runtime 実行と dump 解釈を runtime 層へ寄せ始めた
- 将来の起動入口整理に向けて次の wrapper を追加
  - [`scripts/stack.sh`](../../scripts/stack.sh)
  - [`scripts/stack.ps1`](../../scripts/stack.ps1)
- `1.1` の runtime separation 方針を AI 向け docs に明文化
- Dashboard の警告 / 案内文で、英語 UI に日本語 fallback が出る不具合を修正
- 表示バージョン管理を [`VERSION`](../../VERSION) 正本へ寄せた

## この版の意味

`v1.1.1` は、運用者向けの派手な機能追加版ではありません。

主目的は、今後の `1.1` 作業に備えて Linux / Docker 依存の癒着を剥がし始めることです。

- portability は後でもよい
- まず separability を作る

という判断で進めています。

## 運用メモ

- `v1.1.1` 時点で対応している runtime adapter は `docker_container` のみです
- これはまだ Windows runtime 対応ではありません
- 従来どおり、通常の起動は次のコマンドで問題ありません

```bash
docker compose up -d --build
```

- ただし、今後の入口整理に向けて wrapper も使えます

```bash
./scripts/stack.sh up
pwsh ./scripts/stack.ps1 up
```

## ドキュメント案内

- 開発フロー: [`development.md`](development.md)
- 現行の挙動と構成: [`../current/overview.md`](../current/overview.md)
- `1.x` の今後: [`../planning/roadmap.md`](../planning/roadmap.md)
- AI 向け runtime separation メモ: [`../../ai/notes/architecture/runtime-separation.md`](../../ai/notes/architecture/runtime-separation.md)

# 日本語ドキュメント

このフォルダは `wg-studio` の日本語ドキュメントです。

フォルダ構成:

- [`guide/`](guide/README.md): 起動手順、開発、リリース関連
- [`current/`](current/README.md): 現行仕様と参照資料
- [`planning/`](planning/README.md): 今後の育て方とロードマップ

おすすめの読む順番:

1. [`guide/quick-start.md`](guide/quick-start.md)
2. [`current/overview.md`](current/overview.md)
3. [`current/architecture.md`](current/architecture.md)
4. [`current/domain-model.md`](current/domain-model.md)
5. [`current/config-and-apply.md`](current/config-and-apply.md)
6. [`current/api.md`](current/api.md)
7. [`current/auth-and-api-rules.md`](current/auth-and-api-rules.md)
8. [`guide/release-notes-v1.0.0.md`](guide/release-notes-v1.0.0.md)
9. [`guide/development.md`](guide/development.md)
10. [`planning/roadmap.md`](planning/roadmap.md)

補足:

- `docs/en` は英語の人間向け説明です
- `docs/ai` は AI 作業者向けの低曖昧度ドキュメントです
- AI がこのリポジトリを変更する場合は、まず [`../ai/README.md`](../ai/README.md) を読む前提です

使い分け:

- 現行の製品仕様や運用導線を人間向けに追うなら、この `docs/jp` と `docs/en` を読む
- リリース境界や今後の育て方を追うなら [`planning/roadmap.md`](planning/roadmap.md) を見る
- AI 作業者向けの低曖昧度な仕様や計画を確認したい時だけ [`../ai/README.md`](../ai/README.md) を参照する

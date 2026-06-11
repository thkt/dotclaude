---
paths:
  - ".claude/.claude-plugin/**"
---

# Plugin Conventions

`.claude/.claude-plugin/` 配下の Claude Code プラグイン定義に対するルール。

## 制約

プラグインはロード時にキャッシュされ、自身の境界外のファイルを参照できない。外部ホスティングは `skills/`、`rules/`、`agents/` 間の既存クロス参照を壊す。

| ルール             | ガイドライン                                    |
| ------------------ | ----------------------------------------------- |
| モノリシックソース | `marketplace.json` で `source: "./"` を使う     |
| 参照を保つ         | skills/, rules/, agents/ のクロス参照を保持する |
| 外部プラグイン禁止 | 外部ホスティングのプラグインに分割しない        |

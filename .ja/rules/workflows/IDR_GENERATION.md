# IDR (Implementation Decision Record) 生成

git pre-commit フックによるコミット時の実装決定記録。

## 出力

| ファイル   | 目的                   |
| ---------- | ---------------------- |
| `idr-N.md` | コード例付きの実装記録 |

## IDR フォーマット

```markdown
# IDR: [目的の要約]

## 変更概要

[1段落の要約]

## 主要な変更

### [path/to/file.md](path/to/file.md)

[説明]
\`\`\`yaml
[主要なコードスニペット]
\`\`\`

## 設計判断

[設計決定とその理由]
```

> ファイルパスはIDE/GitHubナビゲーション用のマークダウンリンク。

## ファイル配置

| シナリオ          | 検出方法                                    | パス                           |
| ----------------- | ------------------------------------------- | ------------------------------ |
| SOWトラッキング中 | `$HOME/.claude/workspace/.current-sow` 読取 | `[SOWディレクトリ]/idr-N.md`   |
| SOWなし           | 日付ベースディレクトリ                      | `planning/YYYY-MM-DD/idr-N.md` |

## 関連

- フック: `$HOME/.claude/hooks/lifecycle/idr-pre-commit.sh`
- ユーティリティ: `$HOME/.claude/hooks/lifecycle/_utils.sh`
- SOWテンプレート: `$HOME/.claude/templates/sow/template.md`

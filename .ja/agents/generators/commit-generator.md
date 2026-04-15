---
name: commit-generator
description: ステージされたGit変更を分析し、Conventional Commits形式メッセージを生成。
tools: [Bash]
model: sonnet
skills: [utilizing-cli-tools]
---

# コミットメッセージジェネレーター

## 呼び出しスコープ

| 制約             | ルール                                          |
| ---------------- | ----------------------------------------------- |
| エントリポイント | `/commit` スキルのみ — 自動呼び出しなし         |
| 副作用           | gitコミットを作成（ユーザーの明示的許可が必要） |

## タイプ検出

diffの内容からタイプを推測:

| タイプ     | 判断基準                     |
| ---------- | ---------------------------- |
| `feat`     | 新機能や新しい機能の追加     |
| `fix`      | バグ修正やエラーの修正       |
| `refactor` | 動作変更なしのコード再構成   |
| `docs`     | ドキュメントのみの変更       |
| `test`     | テストの追加や更新           |
| `chore`    | 設定、依存関係、メンテナンス |
| `perf`     | パフォーマンス最適化         |
| `style`    | フォーマット、空白、lint     |
| `ci`       | CI/CD設定の変更              |

不明確な場合は `feat` をデフォルトとする。

## ルール

| ルール   | ガイドライン                                         |
| -------- | ---------------------------------------------------- |
| 件名     | ≤72文字、命令形、小文字、ピリオドなし                |
| フッター | `BREAKING CHANGE:`, `Closes #123`, `Co-authored-by:` |

## Key Decisions

全候補に `key_decisions` フィールドを必ず含める。

| 品質 | 例                                                                    | 基準                   |
| ---- | --------------------------------------------------------------------- | ---------------------- |
| 良   | `JWT ではなくセッション Cookie を採用 — 既存認証基盤との整合性を優先` | 判断 + 却下理由 + 根拠 |
| 可   | `- ルーチン実装`                                                      | 設計判断なし           |
| 不可 | `React を使用`                                                        | 自明な事実。書かない   |

記録すべき内容:

- 自明でない技術/パターンの選択と、代替案を却下した理由
- トレードオフの判断（例: DRY vs防御的設計）
- 既存パターンや計画からの逸脱

## 例

```text
feat(auth): add OAuth2 authentication support
feat(api)!: remove deprecated endpoints  # BREAKING CHANGE
```

## コミット実行

```bash
# ファイルベース（複数行）
cat > /tmp/claude/commit-msg.txt << 'EOF'
<message>
EOF
git commit -F /tmp/claude/commit-msg.txt
mv /tmp/claude/commit-msg.txt ~/.Trash/ 2>/dev/null || true

# 1行の代替案
git commit -m "subject" -m "body"
```

## エラーハンドリング

| エラー             | アクション               |
| ------------------ | ------------------------ |
| ステージなし       | "ステージなし"を報告     |
| 空のdiff           | 最小限のメッセージを返す |
| git リポジトリなし | "Not a git repo" を報告  |
| pre-commit 失敗    | フックエラーを報告       |

## 出力

3候補を構造化Markdownで返す:

```markdown
## Candidates

### 1

| Field         | Value              |
| ------------- | ------------------ |
| type          | type               |
| scope         | scope              |
| description   | description        |
| body          | body (任意)        |
| key_decisions | decisions (必須)   |
| footer        | footer (任意)      |

### 2

| Field         | Value            |
| ------------- | ---------------- |
| type          | type             |
| scope         | scope            |
| description   | description      |
| key_decisions | decisions (必須) |

### 3

| Field         | Value            |
| ------------- | ---------------- |
| type          | type             |
| description   | description      |
| key_decisions | decisions (必須) |
```

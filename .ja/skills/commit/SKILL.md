---
name: commit
description: Git diff を分析し Conventional Commits 形式のメッセージを生成してコミットを実行する。
when_to_use: コミットして, コミット作成, commit changes
allowed-tools: Bash(git:*) Bash(cat:*) Bash(mv:*)
model: haiku
argument-hint: "[context or issue reference]"
---

# /commit - Git コミット実行

Git のステージ済み変更を分析し、Conventional Commits 形式のメッセージを生成して、そのままコミットを実行する。

## 入力

`$ARGUMENTS` はコンテキストまたは Issue 参照を含み得る。空白を除去し、空文字列ならステージ済み変更のみで解析する。非空ならメッセージの scope やフッターのヒントとして扱う。

## 実行

1. `git status` と `git diff --staged` を並列で実行し、ステージ済み変更を読む
2. 変更内容と `$ARGUMENTS` から、種別判定とルールに沿ってメッセージを 1 つ生成する
3. sandbox 互換コミットでそのままコミットを実行する

## 種別判定

diff のコンテキストから type を推定する。判別不能な場合は feat をデフォルトとする。

| Type     | 用途                           |
| -------- | ------------------------------ |
| feat     | 新しい機能や能力               |
| fix      | バグ修正やエラー訂正           |
| refactor | 振る舞いを変えないコード再構成 |
| docs     | ドキュメントのみの変更         |
| test     | テストの追加や更新             |
| chore    | 設定、依存、メンテナンス       |
| perf     | パフォーマンス最適化           |
| style    | フォーマット、空白、lint       |
| ci       | CI / CD 設定の変更             |

## ルール

Subject は 72 文字以内の命令形 / 小文字 / ピリオドなし。Footer には `BREAKING CHANGE:` / `Closes #123` / `Co-authored-by:` を使う。

```text
feat(auth): add OAuth2 authentication support
feat(api)!: remove deprecated endpoints  # BREAKING CHANGE
```

## Sandbox 互換コミット

```bash
cat > /tmp/claude/commit-msg.txt << 'EOF'
<message>
EOF
git commit -F /tmp/claude/commit-msg.txt
mv /tmp/claude/commit-msg.txt ~/.Trash/ 2>/dev/null || true
```

## エラー処理

| エラー               | アクション                   |
| -------------------- | ---------------------------- |
| ステージ済みなし     | 変更がない旨を報告           |
| 空の diff            | 最小限のメッセージを返す     |
| git リポジトリでない | git リポジトリでない旨を報告 |
| pre-commit 失敗      | フックエラーを報告           |

## 出力

実行したコミットを 1 行で報告する。

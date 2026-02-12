---
description: プラグインとスキルの悪意のあるコードや指示をスキャン。ユーザーがスキャンして, 安全性チェック, plugin scan, セキュリティスキャン等に言及した場合に使用。
allowed-tools: Bash(gh repo clone:*), Bash(mv /tmp/claude/scan-* ~/.Trash/), Read, Grep, Glob, LS, Task, AskUserQuestion
model: sonnet
argument-hint: "[対象: プラグイン名、パス、または GitHub URL]"
---

# /scan - プラグインセキュリティスキャナー

Claude Code プラグインとスキルを使用前にセキュリティ脅威を分析。

## 実行

1. `$1` からスキャン対象を解決
2. GitHub URL の場合 → AskUserQuestion: "{repo}をクローンしてスキャンしますか?"
3. Yesの場合 → `/tmp/claude/scan-{repo}-{timestamp}` にクローン
4. `Task` で `subagent_type: plugin-scanner` を実行
5. エージェントレポートを出力、リモートの場合は一時ディレクトリを削除

## スコープ解決

| 入力             | 対象                                             |
| ---------------- | ------------------------------------------------ |
| (空)             | `~/.claude/plugins/cache/` + `~/.claude/skills/` |
| `名前`           | plugins/cache/ または skills/ から検索           |
| `./パス`         | 指定ディレクトリ                                 |
| `owner/repo`     | GitHub からクローン                              |
| `github.com/...` | GitHub からクローン                              |

## 出力

エージェントが verdict、findings、recommendation を含む構造化 YAML を返却。
エージェント出力から markdown テンプレートでレンダリング。

## 検証

| チェック項目                                           | 必須 |
| ------------------------------------------------------ | ---- |
| `Task` を `subagent_type: plugin-scanner` で呼んだか？ | Yes  |

---
description: 実装なしでプロジェクトリサーチと技術調査を実行
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
context: fork
argument-hint: "[リサーチトピックまたは質問]"
---

# /research - プロジェクトリサーチ＆調査

信頼度ベースの発見でコードベースを調査、実装なし。

## 入力

- リサーチトピックまたは質問: `$1`（必須）
- `$1`が空の場合 → AskUserQuestionで確認

## 実行

| フェーズ | エージェント                                   | フォーカス                               |
| -------- | ---------------------------------------------- | ---------------------------------------- |
| 0        | （codemap確認）                                | `.codemaps/architecture.md` があれば読む |
| 1        | （目的確認）                                   | 調査意図 → `/think` 計画？               |
| 2        | `architecture-analyzer` ∥ `code-flow-analyzer` | 構造 + 実行フロー（並列）                |
| 3        | Task(Explore)                                  | 詳細: コードパス、パターン、エッジケース |
| 3.5      | （Strong Inference）                           | ≥3仮説 → 判別テスト → 棄却               |
| 4        | （統合）                                       | ✓/→/?マーカー付きで整理                  |

Note: `Task(subagent_type: Explore)` で呼び出し。

### フェーズ1: 意図確認

AskUserQuestionで質問:

| 質問       | 選択肢                         |
| ---------- | ------------------------------ |
| 調査意図   | 機能計画 / バグ調査 / 理解のみ |
| 計画必要？ | Yes → 調査後 `/think` を提案   |

### フェーズ2: 並列分析

Taskで `architecture-analyzer` と `code-flow-analyzer` を並列実行。

Output Verifiability マーカー（[✓]/[→]/[?]）を全発見に適用。

### フェーズ3.5: Strong Inference（バグ調査時のみ）

デバッグ調査プロトコルを適用。フェーズ2-3の発見を入力とする。

スキップ: 原因が自明、または意図が「機能計画」/「理解のみ」の場合。

## 出力

ファイル: `$HOME/.claude/workspace/research/YYYY-MM-DD-[topic].md`
テンプレート: [@../templates/research/template.md](../templates/research/template.md)

## 次のステップ

出力の最後に必ず含める:

| 意図     | 推奨次アクション |
| -------- | ---------------- |
| 機能計画 | `/think`         |
| バグ修正 | `/fix`           |
| 理解のみ | 完了             |

---
name: research
description:
  実装なしでプロジェクトリサーチと技術調査を実行。ユーザーが調査して, 調べて,
  リサーチ, investigate, 分析して等に言及した場合に使用。設計やSOW/Spec生成には
  /think を使用。
allowed-tools:
  Bash(tree:*), Bash(git log:*), Bash(git diff:*), Bash(wc:*),
  Bash(yomu:*), Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
context: fork
argument-hint: "[リサーチトピックまたは質問]"
user-invocable: true
---

# /research - プロジェクトリサーチ＆調査

信頼度ベースの発見でコードベースを調査、実装なし。

## 入力

- リサーチトピックまたは質問: `$1`（必須）
- `$1` が空の場合 → AskUserQuestionで確認

## 実行

| フェーズ | エージェント                                   | フォーカス                               |
| -------- | ---------------------------------------------- | ---------------------------------------- |
| 1        | （意図確認）                                   | 調査意図 → `/think` 計画？               |
| 2        | `architecture-analyzer` + `code-flow-analyzer` + `yomu search` | 構造 + フロー + セマンティック検索（全並列） |
| 3        | Task(Explore)                                  | 詳細: コードパス、パターン、エッジケース |
| 3.5      | （Strong Inference）                           | ≥3仮説 → 判別テスト → 棄却              |
| 4        | （統合）                                       | ✓/→/?マーカー付きで整理                  |

Note: `Task(subagent_type: Explore)` で呼び出し。

### フェーズ1: 意図確認

AskUserQuestionで質問:

| 質問       | 選択肢                               |
| ---------- | ------------------------------------ |
| 調査意図   | 機能計画 / バグ調査 / 理解のみ       |
| 計画必要？ | Yes → 調査後 `/think` を提案         |

### フェーズ2: 並列分析

`architecture-analyzer` と `code-flow-analyzer` をTaskで並列実行。

Output Verifiabilityマーカー（[✓]/[→]/[?]）を全発見に適用。

### フェーズ2.5: セマンティックコード検索

`yomu search "<リサーチトピック>"` で概念的に関連するコードを検索。

- フェーズ2の結果を用いて検索クエリを精度向上
- Grep/Globのリテラル検索をyomuのセマンティック検索で補完
- 発見したファイルをフェーズ3のExplore探索に渡す

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

## 検証

| チェック項目                                    | 必須 |
| ----------------------------------------------- | ---- |
| 調査結果に [✓]/[→]/[?] マーカーが付いているか？ | Yes  |
| workspace/research/ に出力を保存したか？        | Yes  |
| 次のステップセクションが含まれているか？        | Yes  |

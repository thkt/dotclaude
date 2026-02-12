---
description: 実装なしでプロジェクトリサーチと技術調査を実行。ユーザーが調査して, 調べて, リサーチ, investigate, 分析して等に言及した場合に使用。
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(wc:*), Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
context: fork
argument-hint: "[リサーチトピックまたは質問]"
---

# /research - プロジェクトリサーチ＆調査

信頼度ベースの発見でコードベースを調査、実装なし。

## 入力

- リサーチトピックまたは質問: `$1`（必須）
- `$1` が空の場合 → AskUserQuestion で確認

## 実行

| フェーズ | エージェント                     | フォーカス                                 |
| -------- | -------------------------------- | ------------------------------------------ |
| 0        | （codemap 確認）                 | `.analysis/architecture.yaml` があれば読む |
| 1        | （意図確認）                     | 調査意図 + トピック領域                    |
| 2        | （意図ベースのアナライザー選択） | 選択して並列実行                           |
| 3        | Task(Explore)                    | 詳細: コードパス、パターン、エッジケース   |
| 3.5      | （Strong Inference）             | ≥3仮説 → 判別テスト → 棄却                 |
| 4        | （統合）                         | ✓/→/?マーカー付きで整理                    |

Note: `Task(subagent_type: <analyzer-name>)` でアナライザーを、`Task(subagent_type: Explore)` で Explore を呼び出し。

### フェーズ1: 意図確認

AskUserQuestion で質問:

| 質問         | 選択肢                               |
| ------------ | ------------------------------------ |
| 調査意図     | 機能計画 / バグ調査 / 理解のみ       |
| トピック領域 | データモデル / API / インフラ / 全般 |
| 計画必要？   | Yes → 調査後 `/think` を提案         |

### フェーズ2: 意図ベースの並列分析

フェーズ1 の回答に基づきアナライザーを選択し、全選択分を Task で並列実行。

#### アナライザー選択マトリクス

| 意図 \ トピック | 全般                                    | データモデル | API   | インフラ |
| --------------- | --------------------------------------- | ------------ | ----- | -------- |
| 機能計画        | architecture + code-flow + domain + api | + domain     | + api | + setup  |
| バグ調査        | architecture + code-flow                | + domain     | + api | + setup  |
| 理解のみ        | architecture + code-flow                | + domain     | + api | + setup  |

凡例: 各セルはベースセットへの追加分。`architecture` + `code-flow` は常に実行。

#### アナライザーリファレンス

| アナライザー          | Subagent Type           | 返却内容                       |
| --------------------- | ----------------------- | ------------------------------ |
| architecture-analyzer | `architecture-analyzer` | 構造、依存関係、Mermaid 図     |
| code-flow-analyzer    | `code-flow-analyzer`    | 実行パス、データフロー         |
| domain-analyzer       | `domain-analyzer`       | エンティティ、関連、ルール     |
| api-analyzer          | `api-analyzer`          | エンドポイント、スキーマ、認証 |
| setup-analyzer        | `setup-analyzer`        | 前提条件、環境変数、設定       |

Output Verifiability マーカー（[✓]/[→]/[?]）を全発見に適用。

### フェーズ3.5: Strong Inference（バグ調査時のみ）

デバッグ調査プロトコルを適用。フェーズ2-3 の発見を入力とする。

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

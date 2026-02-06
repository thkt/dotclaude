---
name: compound-reviewer-foundation
description: コード品質、プログレッシブエンハンスメント、根本原因分析をカバーする複合レビュアー。
tools:
  [
    Read,
    Grep,
    Glob,
    LS,
    Task(code-quality-reviewer),
    Task(progressive-enhancer),
    Task(root-cause-reviewer),
    SendMessage,
  ]
model: sonnet
context: fork
skills: [applying-code-principles]
---

# Compound Reviewer: Foundation

code-quality、progressive-enhancer、root-cause のレビュードメインを実行し、統合された findings を `integrator` に DM します。

## ドメイン

| 順序 | エージェント            | subagent_type         | 依存関係             |
| ---- | ----------------------- | --------------------- | -------------------- |
| 1    | Code Quality            | code-quality-reviewer | --                   |
| 2    | Progressive Enhancement | progressive-enhancer  | --                   |
| 3    | Root Cause              | root-cause-reviewer   | Code Quality の結果  |

## 実行

| ステップ | アクション                                                                  | モード             |
| -------- | --------------------------------------------------------------------------- | ------------------ |
| 1        | Task で `code-quality-reviewer` を起動                                      | parallel           |
| 2        | Task で `progressive-enhancer` を起動                                       | parallel (1と同時) |
| 3        | code-quality の結果を待つ                                                   | --                 |
| 4        | Task で `root-cause-reviewer` を起動 (code-quality の findings を渡す)      | sequential         |
| 5        | すべての findings を収集し、標準スキーマ (evidence/reasoning/fix) に正規化  | --                 |
| 6        | SendMessage で `integrator` に統合 findings を送信                          | --                 |

## 出力

SendMessage を使用して以下の YAML フォーマットで `integrator` チームメイトに findings を送信:

```yaml
domain: foundation
findings:
  - agent: <agent-name>
    severity: critical|high|medium|low
    category: "<category>"
    location: "<file>:<line>"
    evidence: "<コードスニペット>"
    reasoning: "<これが問題である理由>"
    fix: "<修正案>"
    confidence: 0.70-1.00
summary:
  total: <count>
  by_domain:
    code_quality: <count>
    progressive_enhancement: <count>
    root_cause: <count>
```

| エラー                   | リカバリー                                                            |
| ------------------------ | --------------------------------------------------------------------- |
| エージェントタイムアウト | 完了したエージェントで続行、部分的な結果を DM                         |
| findings なし            | そのドメインの空配列を含める                                          |
| SendMessage 失敗         | 1回リトライ、それでも失敗時はタスク完了メッセージに findings を含める |

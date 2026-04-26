---
name: use-workflow-code
description: >
  /code ワークフローのオーケストレーション。Triggers: /code ワークフロー,
  quality gates, 品質ゲート, RGRC サイクル, completion criteria.
allowed-tools: [Read, Write, Grep, Glob, Task, Bash(npm:*, npx:*, tsc:*, bun:*)]
user-invocable: false
---

# ワークフロー: /code

## ワークフロー

| コマンド | ワークフロー参照                                                |
| -------- | --------------------------------------------------------------- |
| `/code`  | [@./references/code-workflow.md](./references/code-workflow.md) |

## パターン

| パターン | 参照                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| IDR生成  | [hooks/lifecycle/idr-pre-commit.sh](../../hooks/lifecycle/idr-pre-commit.sh) |
| TDD      | [@~/.claude/skills/use-workflow-tdd-cycle/SKILL.md](../use-workflow-tdd-cycle/SKILL.md) |

## 品質ゲート

| ゲート     | 目標             | 検証方法                                         |
| ---------- | ---------------- | ------------------------------------------------ |
| テスト     | 全て通過         | `npm test` 終了コード 0                          |
| リント     | エラー 0         | `npm run lint` 終了コード 0                      |
| 型         | エラーなし       | `tsc --noEmit` 終了コード 0                      |
| カバレッジ | C0 ≥90%, C1 ≥80% | カバレッジレポート                               |
| テスト品質 | ≥70              | `test-quality-evaluator`（Specなしならスキップ） |

### テスト品質ゲート

Specにテストシナリオが存在する場合、`test-quality-evaluator`
をバックグラウンドエージェントとしてスポーン:

```
Agent(subagent_type: "test-quality-evaluator",
      prompt: "spec_path: <path>\ntest_paths: <paths>",
      run_in_background: true)
```

スコア ≥70 → パス。スコア <70
→ 未カバー/過剰/意図の問題を報告し、修正してから続行。Specが存在しない場合はスキップ（例:
`/fix`、アドホック変更）。

### レビューゲート

RGRCサイクル後、`code-quality-reviewer`
をバックグラウンドエージェントとしてスポーン:

```
Agent(subagent_type: "code-quality-reviewer",
      prompt: "Review files changed in this session: <paths>",
      run_in_background: true)
```

重大度High → 品質ゲート前に修正。Medium/Low → アドバイザリー（IDRに記載）。
`/fix` および単一ファイル変更ではスキップ。

### ゲート結果出力

```text
Tests:        pass | fail (詳細)
Lint:         pass | fail (詳細)
Types:        pass | fail (詳細)
Coverage:     C0 XX% / C1 XX% — pass | fail
Test Quality: XX/100 — pass | skip (Specなし)
```

5行全て必須。空行はゲートがスキップされたことを示す — 続行前に調査すること。

## 合理化カウンター

| 言い訳                                   | 反論                                                          |
| ---------------------------------------- | ------------------------------------------------------------- |
| "テスト通ったからリントは後で"           | リントエラーは技術的負債。コミット前にゼロエラー              |
| "型エラーは警告みたいなもの"             | `tsc --noEmit` 終了コード 0 でなければ出荷しない。警告=エラー |
| "カバレッジはほぼ足りてる"               | "ほぼ" は遠回りの失敗。閾値を満たすこと                       |
| "このゲートはこの変更には当てはまらない" | 全4ゲートは全変更に適用。例外なし                             |

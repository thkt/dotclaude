---
globs: ["**/workflows/**/*.js"]
scenes: []
kind: structure
---

# workflow の構造と起動契約

## 内容

workflow は `implement` の 1 本で、agent を呼ぶ script として走る。

## 境界

- `implement` は `/implement` skill が host (`workflows/_lib/claude-run.ts`) から起動する。ほかの workflow を入れ子で呼ばない
- script が持つのは制御フローと判定だけで、git 操作もファイル読み書きも agent か relay (`workflows/_lib/relay.ts`) に渡す
- `workflows/_lib/run-workflow.ts` はテスト用の実行器で、本番サンドボックスの供給を写している。両者の食い違いの扱いは `harness-production-divergence.md` が持つ

## 契約

| 対象 | 契約 |
| --- | --- |
| `args.repo` | 必須。省略した起動は本体に入る前に `stopped: "no-repo"` で止まる |
| 起動前の停止 | `{ stopped: "<理由>", why }` を返す。`why` には呼び出し側が次に取る操作を書く |
| `meta` と実行の形 | ファイル先頭の `export const meta`。本体は注入されたグローバルを引数に取る関数本体として走り、トップレベルの `return` が返り値になる |

## 要求

| 対象 | 上限 | 超えたときの挙動 |
| --- | --- | --- |
| CI の待機 | 6 回 | `ci-timed-out` で止まる。PR は draft のまま残す |

## 参照コード

- `workflows/implement.js` の `stop`
- `workflows/implement.js` の `CI_WAIT_ROUNDS`
- `workflows/_lib/run-workflow.ts` の `checkWorkflowSyntax`

## 由来

- `docs/decisions/0105-require-argsrepo-in-every-workflow.md`
- `docs/decisions/0081-move-machinery-fan-out-from-skill-prose-to-deterministic-workflow.md`
- `docs/decisions/0128-retire-the-plan-based-build-path-for-scoping-and-implement.md`
- `docs/decisions/0129-retire-review-workflows-reviewer-agents-and-unused-skills.md`

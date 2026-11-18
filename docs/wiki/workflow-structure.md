---
globs: ["**/workflows/**/*.js"]
scenes: []
kind: structure
---

# workflow の構造と起動契約

## 内容

workflow は `adrift` `assert` `audit` `implement` `polish` `shake` の 6 本で、いずれも agent を呼ぶ script として走る。

## 境界

- 6 本は独立して起動する。入れ子は 1 経路だけで、`assert.js` が `workflow("audit")` を直に呼ぶ
- script が持つのは制御フローと判定だけで、git 操作もファイル読み書きも agent か relay (`workflows/_lib/relay.ts`) に渡す
- `workflows/_lib/run-workflow.ts` はテスト用の実行器で、本番サンドボックスの供給を写している。両者の食い違いの扱いは `harness-production-divergence.md` が持つ

## 契約

| 対象 | 契約 |
| --- | --- |
| `args.repo` | 6 本すべてで必須。省略した起動は本体に入る前に `stopped: "no-repo"` で止まる |
| 起動前の停止 | `{ stopped: "<理由>", why }` を返す。`why` には呼び出し側が次に取る操作を書く。理由の語彙は workflow ごとに持つ |
| `meta` と実行の形 | ファイル先頭の `export const meta`。本体は注入されたグローバルを引数に取る関数本体として走り、トップレベルの `return` が返り値になる |
| 入れ子の引数 | 親が `repo` を明示的に渡す。`assert` は `skipPreflight: true` を添える |

## 要求

| 対象 | 上限 | 超えたときの挙動 |
| --- | --- | --- |
| `shake` の修正 | 再試行 3 回 | `blocker` として返す。テストを弱めない |

## 参照コード

- `workflows/shake.js` の `MAX_FIX_ATTEMPTS`
- `workflows/implement.js` の `stop`
- `workflows/assert.js` の `skipPreflight` (入れ子の audit に渡す引数)
- `workflows/_lib/run-workflow.ts` の `checkWorkflowSyntax`

## 由来

- `docs/decisions/0105-require-argsrepo-in-every-workflow.md`
- `docs/decisions/0081-move-machinery-fan-out-from-skill-prose-to-deterministic-workflow.md`
- `docs/decisions/0128-retire-the-plan-based-build-path-for-scoping-and-implement.md`

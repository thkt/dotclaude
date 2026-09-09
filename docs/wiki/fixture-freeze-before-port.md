---
globs: ["**/tests/fixtures/*-cases.json"]
scenes: ["plan", "implement"]
---

# Python→TS 移植前の fixture 凍結

## 内容

Python 版のスクリプトを TypeScript へ移植する前に、Python 版を実際に実行して argv/stdin から得られる exit code・stdout・生成物を JSON fixture として凍結する。fixture は手で書かず、実行結果をそのまま採る。移植後の TS 版はこの fixture と突き合わせて Python 版との契約の同一性を検証する。

## 定型手順

1. 移植対象の Python 版を `HOME=<temp>` 等の隔離環境で、代表的な argv/stdin の組み合わせごとに実行する
2. 出力された exit code・stdout・生成物をそのまま `{name, argv, stdin/env, exit, stdout, files_after}` の形で JSON に記録する。日付や temp path など実行のたびに変わる値は `<date>`/`<dr-dir>` のような placeholder に置き換える
3. TS 版を書いたら、同じ fixture を読んで実 CLI を起動し、記録した値と突き合わせるテストを書く
4. Python 版を退役させる直前に、同じ生成手順をもう一度実行して fixture と一致することを確認する。fixture が手で書かれていればここで差分が出る

## 参照コード

- `workflows/_lib/tests/_cli-fixture.ts` の `fixture`（凍結した fixture から case を読む）
- `skills/dr/tests/fixtures/pre-check-cases.json`（Python 版を実行して採った凍結 fixture の実例）

## 根拠

- #630 pre-check/validate-dr/update-index の Python 版 3 本の出力を fixture に凍結してから TS へ移した
- #631 validate-issue-body/pick-plan の Python 版 2 本の出力を fixture に凍結してから TS へ移した
- #677 Python 版を退役させる前に一度実行し、その入出力を pick-plan-cases.json / validate-issue-body-cases.json に固定した
- #679 Python 版の振る舞いは fixture に凍結して比較した

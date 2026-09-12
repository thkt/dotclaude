---
globs: [".github/workflows/test.yml", "docs/SPEC.md"]
scenes: []
---

# SPEC の確認コマンドは CI から導出する

## 内容

`docs/SPEC.md` が書く確認コマンド (Quality gates 表、Node tests 行) は、`.github/workflows/test.yml` の Node tests step が実際に実行する glob の手書きの写しになりやすく、CI 側だけを変更すると両者がずれる。ズレを防ぐため、CI の `run: >` ブロックが列挙する glob を SPEC 側が過不足なく含んでいることをテストで検証し、CI を正 (SSOT) とする。

## 定型手順

1. `.github/workflows/test.yml` の Node tests step に glob を足す/消すときは、同じコミットで `docs/SPEC.md` の確認コマンドにもその glob を反映する
2. 一致を手で保証せず、`workflows/tests/spec-commands.test.ts` が test.yml の `run: >` ブロックをテキストとして読み取り、SPEC.md がそれぞれの glob を含んでいるかを機械的に確認する

## 参照コード

- `workflows/tests/spec-commands.test.ts` の `nodeTestsStepGlobs`
- `.github/workflows/test.yml` の Node tests step
- `docs/SPEC.md` の Node tests 確認コマンド

## 根拠

- (research) `docs/SPEC.md` の確認コマンドが `.github/workflows/test.yml` の glob とずれていた (`.test.ts` と `sandbox` ディレクトリを含んでいなかった)
- #655 ズレを issue 化し、CI の `run: >` ブロックから glob を読み取って SPEC 側の包含を検証するテスト (T-437) を追加してからズレを解消した

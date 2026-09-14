---
globs: []
scenes: ["pr-create", "issue-close"]
---

# Closes 行があっても統合ベース PR の merge では issue は自動 close されない

## 内容

`integration/<N>-base` のような、デフォルトブランチでないブランチを base にした PR は、本文に有効な `Closes #N` 行を持っていても、merge 時に対象 issue を自動 close しない。issue は開いたままになるので、その内容がデフォルトブランチへ届いた時点で改めて手動 close が要る。

## 定型手順

1. PR の base が `integration/` 等の非デフォルトブランチのときは、`Closes #N` 行があっても merge 時点での自動 close を期待しない
2. その内容がデフォルトブランチへ届いた時点で、対象 issue を個別に確認する
3. 自動で閉じていなければ、実装が着地した PR 番号を close コメントに書いて手動で close する

## 根拠

- #687 base `integration/687-base` の PR #703 が `Closes #687` を含んだまま merge されたが issue は自動で閉じず、後から手動で close された
- #645 base `integration/645-base` の PR #702 が `Closes #645` を含んだまま merge されたが issue は自動で閉じず、後から手動で close された

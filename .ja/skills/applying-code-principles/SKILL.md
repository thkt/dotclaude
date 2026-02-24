---
name: applying-code-principles
description: >
  基本的なソフトウェア原則 - SOLID, DRY, Occam's Razor, Miller's Law, YAGNI,
  Readable Code。設計原則の適用、コードリファクタリング、または 原則, シンプル,
  複雑, リファクタリング, 保守性, clean code, best practice に言及した時に使用。
allowed-tools: [Read, Grep, Glob]
user-invocable: false
---

# コード原則

優先順位、閾値、競合解決: `rules/PRINCIPLES.md` と
`rules/development/CODE_THRESHOLDS.md` を参照。

## クイックチェック

| 質問               | 原則                    |
| ------------------ | ----------------------- |
| シンプルな方法は？ | Occam's Razor           |
| 1分で理解できる？  | Miller's Law            |
| 重複していない？   | DRY                     |
| 今必要？           | YAGNI                   |
| CSSでできる？      | Progressive Enhancement |

## ルール

| 原則                    | ルール                                    |
| ----------------------- | ----------------------------------------- |
| DRY                     | 3回目の重複で抽象化（Rule of Three）      |
| SOLID                   | 2つ目の実装が現れた時のみインターフェース |
| YAGNI                   | 問題が今存在する場合のみ構築              |
| Readable                | 新しいチームメンバーが1分以内に理解できる |
| Progressive Enhancement | HTML → CSS → JS（より前のレイヤーを優先） |

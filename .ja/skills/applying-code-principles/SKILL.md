---
name: applying-code-principles
description: >
  基本的なソフトウェア原則 - SOLID, DRY, Occam's Razor, Miller's Law, YAGNI, Readable Code。
  設計原則の適用、コードリファクタリング、または
  原則, シンプル, 複雑, リファクタリング, 保守性, clean code, best practice に言及した時に使用。
allowed-tools: [Read, Grep, Glob]
user-invocable: false
---

# コード原則

## 優先順位

| 優先度 | 原則          | 適用タイミング                   |
| ------ | ------------- | -------------------------------- |
| 1      | Safety First  | セキュリティ、データ整合性       |
| 2      | YAGNI         | 不要なものは作らない             |
| 3      | Occam's Razor | 最もシンプルな解決策             |
| 4      | SOLID         | 複雑なシステム向け               |
| 5      | DRY           | 重複排除（明確さを犠牲にしない） |
| 6      | Miller's Law  | 7±2の認知限界を尊重              |

## クイックチェック

CLAUDE.mdの開発チェックセクションを参照（常にロード済み、単一の信頼源）。

## 閾値

`rules/development/CODE_THRESHOLDS.md` の正式な値を参照してください。

| 対象           | 推奨 | 警告 | 最大 |
| -------------- | ---- | ---- | ---- |
| 関数引数       | 3    | 4-5  | 5    |
| クラスメソッド | 5    | 6-7  | 9    |
| 条件分岐       | 3    | 4    | 5    |

## ルール

| 原則     | ルール                                    |
| -------- | ----------------------------------------- |
| DRY      | 3回目の重複で抽象化（Rule of Three）      |
| SOLID    | 2つ目の実装が現れた時のみインターフェース |
| YAGNI    | 問題が今存在する場合のみ構築              |
| Readable | 新しいチームメンバーが1分以内に理解できる |

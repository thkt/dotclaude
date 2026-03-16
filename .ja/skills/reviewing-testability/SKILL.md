---
name: reviewing-testability
description: >
  TypeScript/Reactアプリケーション向けテスト容易な設計パターン。
  テスタビリティのコードレビュー、依存性注入の実装、または テスト容易性, モック,
  mock-friendly, DI に言及した時に使用。
allowed-tools: [Read, Grep, Glob, Task]
agent: testability-reviewer
context: fork
user-invocable: false
---

# テスタビリティレビュー

## 検出

| ID  | パターン                     | 修正                           |
| --- | ---------------------------- | ------------------------------ |
| TE1 | 直接 `import { db }` 使用    | パラメータとして依存関係注入   |
| TE1 | クラス内の `new Service()`   | コンストラクタインジェクション |
| TE2 | コンポーネント内の`fetch()`  | hook/serviceに抽出して注入     |
| TE2 | 副作用 + ロジック混在        | 純粋/不純を分離                |
| TE3 | 深いモックチェーン           | 依存関係を簡素化               |
| TE4 | グローバル `config` アクセス | prop/パラメータとして渡す      |
| TE4 | ロジック内の `Date.now()`    | clock/timeプロバイダを注入     |
| TE5 | 密結合                       | 抽象に依存 (DIP)               |

## 基準

テストセットアップ < 10行。深いモックチェーンなし。依存関係が明示的。

## 参考

| トピック | ファイル                                                 |
| -------- | -------------------------------------------------------- |
| DI       | `${CLAUDE_SKILL_DIR}/references/dependency-injection.md` |
| 純粋     | `${CLAUDE_SKILL_DIR}/references/pure-functions.md`       |
| モック   | `${CLAUDE_SKILL_DIR}/references/mock-friendly.md`        |

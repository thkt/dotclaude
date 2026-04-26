---
name: use-context-silent-failure-reviewer
description: >
  フロントエンドコードのサイレント障害検出パターン。
  エラーハンドリングのレビュー、握りつぶされたエラーの検出、または silent
  failure, empty catch, エラーハンドリング, 握りつぶし, swallowed error
  に言及した時に使用。
allowed-tools: [Read, Grep, Glob, Task]
agent: silent-failure-reviewer
context: fork
user-invocable: false
---

# サイレント障害レビュー

## 検出

| ID  | パターン                             | 修正                                          |
| --- | ------------------------------------ | --------------------------------------------- |
| SF1 | `catch (e) {}`                       | `catch (e) { logger.error(e); throw }`        |
| SF1 | `catch (e) { console.log(e) }`       | ユーザーフィードバック表示 + コンテキストログ |
| SF2 | `.catch()`なしの`.then(fn)`          | `.catch()` 追加またはtry/catch使用            |
| SF2 | `async () => { await fn() }`         | try/catchでラップ、エラー処理                 |
| SF3 | エラーUI状態なし                     | Error Boundary、フィードバックコンポーネント  |
| SF4 | サイレントな `value ?? defaultValue` | フォールバック使用時にログ                    |
| SF4 | `data?.nested?.value`                | 予期せぬnullをチェックして報告                |
| SF5 | `catch { return defaultValue }`      | デフォルト返却前に根本原因をログ              |
| SF5 | `config.x \|\| fallback`             | 設定を検証、欠落キーを警告                    |

## 参照

| トピック | ファイル                                               |
| -------- | ------------------------------------------------------ |
| 検出     | `${CLAUDE_SKILL_DIR}/references/detection-patterns.md` |

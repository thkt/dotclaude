---
name: use-context-reviewer-strictness
description: TypeScript の型安全レビュー。テスト容易性 (use-context-reviewer-testability)、セキュリティ (use-context-reviewer-security)、可読性 (use-context-reviewer-readability) には使わない。
when_to_use: type safety, any, 型安全, 型カバレッジ, strict mode
allowed-tools: Read Task Bash(ugrep:*) Bash(bfs:*)
agent: reviewer-strictness
context: fork
user-invocable: false
---

# 型安全レビュー

## 検出

| ID  | パターン                      | 修正                          |
| --- | ----------------------------- | ----------------------------- |
| TS1 | `any`                         | `unknown` + 型ガード          |
| TS1 | 暗黙の any                    | 明示的な型注釈                |
| TS2 | `value as Type`               | 型ガード関数                  |
| TS2 | `value!` (non-null assertion) | 明示的な null チェック        |
| TS3 | `function fn(data)` (型なし)  | `function fn(data: Type)`     |
| TS3 | 戻り値型なし                  | 明示的な `: ReturnType`       |
| TS4 | exhaustive でない `default:`  | `default: assertNever(value)` |
| TS5 | `strictNullChecks: false`     | tsconfig で有効化             |
| TS5 | `noImplicitAny: false`        | tsconfig で有効化             |

## 基準

型カバレッジ 95% 以上。any 使用 0。strict mode を全て有効化。

## 参照

| トピック   | ファイル                                        |
| ---------- | ----------------------------------------------- |
| カバレッジ | ${CLAUDE_SKILL_DIR}/references/type-coverage.md |
| ガード     | ${CLAUDE_SKILL_DIR}/references/type-guards.md   |
| Strict     | ${CLAUDE_SKILL_DIR}/references/strict-mode.md   |
| Result     | ${CLAUDE_SKILL_DIR}/references/result-type.md   |

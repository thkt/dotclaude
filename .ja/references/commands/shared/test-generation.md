# テスト生成パターン

test-generatorエージェントのクイックリファレンス。詳細はスキルファイルを参照。

## 完全リファレンス

[@~/.claude/skills/generating-tdd-tests/SKILL.md#test-generator-agent-patterns](~/.claude/skills/generating-tdd-tests/SKILL.md#test-generator-agent-patterns)

## パターン概要

| パターン | ユースケース | テスト状態 |
| --- | --- | --- |
| Spec-Driven | 機能開発（`/code`） | Skipモード |
| Bug-Driven | バグ修正（`/fix`） | Activeモード |
| Coverage-Driven | カバレッジ向上 | Activeモード |

## 基本的な呼び出し

```typescript
Task({
  subagent_type: "test-generator",
  model: "haiku",
  description: "[source]からテストを生成",
  prompt: `[コンテキストを含む詳細なプロンプト]`
})
```

## Skipマーカー

| フレームワーク | 構文 |
| --- | --- |
| Jest/Vitest | `it.skip('test', () => { // TODO: [SKIP] FR-001 })` |
| Mocha | `it.skip()` または `xit()` |
| Unknown | `// TODO: [SKIP]` でコメントアウト |

## コマンド統合

| コマンド | パターン | モード |
| --- | --- | --- |
| `/code` | Spec-Driven | Phase 0: skip、1つずつ有効化 |
| `/fix` | Bug-Driven | Phase 1.5: activeリグレッションテスト |

## ベストプラクティス

- プロンプトでフレームワークを指定
- テストごとに1つの動作
- Baby Steps順（シンプル → 複雑）
- FR-xxx付きの明確なskipマーカー

## 参考文献

- [@../../../../skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD原則とパターン

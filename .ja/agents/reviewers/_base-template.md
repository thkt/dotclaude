---
name: _base-template
description: テンプレートファイル - 実行可能なエージェントではありません
---

# レビューエージェント基本テンプレート

レビューエージェント用テンプレート。ドメイン固有コンテンツのみを含む。

## YAMLフロントマター

```yaml
---
name: {domain}-reviewer
description: {簡潔な説明}
tools: [Read, Grep, Glob, LS, Task]
model: sonnet|haiku|opus
skills: [{relevant-skill}, applying-code-principles]
---
```

## 必須構造

```markdown
# {Domain}レビューアー

{一行の目的}

## Dependencies

- [@skill-path] - {説明}
- [@./reviewer-common.md] - 信頼度マーカー

## Focus/Patterns

{ドメイン固有パターンとBad/Good例}

## Output

{テーブル付き出力テンプレート}
```

## 信頼度マーカー

| マーカー | 信頼度 | 用途       |
| -------- | ------ | ---------- |
| [✓]      | ≥95%   | 検証済み   |
| [→]      | 70-94% | 推論       |
| [?]      | <70%   | 報告しない |

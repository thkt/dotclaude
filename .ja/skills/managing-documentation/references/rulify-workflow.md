# Rulifyワークフロー

## フロー

```text
ADR (決定) → Rule (強制) → CLAUDE.md (統合)

/rulify <ADR-number>
  → Read ADR → Extract rules → Generate file → Update CLAUDE.md
```

## ルール抽出

| ADRセクション | ルール内容     |
| ------------- | -------------- |
| Decision      | 何を強制するか |
| Consequences  | なぜ重要か     |
| Context       | いつ適用するか |

## ルールテンプレート

```markdown
# [Rule Title]

## Rule

[明確でアクション可能なステートメント]

## Rationale

[ADR Decisionより]

## Examples

### Good

[準拠]

### Bad

[非準拠]

## Related

- ADR: [@../adr/NNNN-slug.md]
```

## 出力

| タイプ       | 場所                         |
| ------------ | ---------------------------- |
| Ruleファイル | `rules/[category]/[name].md` |
| 参照         | CLAUDE.md更新                |

## カテゴリ

| カテゴリ       | 目的               |
| -------------- | ------------------ |
| `core/`        | 基本ルール         |
| `guidelines/`  | ベストプラクティス |
| `development/` | 実装               |

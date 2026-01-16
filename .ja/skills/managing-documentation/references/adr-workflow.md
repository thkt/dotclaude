# ADRワークフロー

## フロー

```text
/adr "Title" → Pre-Check → Template → Collection → Generate → Validate → Index
```

## MADRフォーマット

```markdown
# ADR-NNNN: [Title]

## Status

Proposed | Accepted | Deprecated | Superseded

## Context

[課題]

## Decision

[選択]

## Consequences

[結果]
```

## 番号付け

```text
Location: adr/ or ~/.claude/adr/
Format: NNNN-slug.md (e.g., 0023-adopt-typescript.md)
```

## ステータス

| ステータス   | 意味              |
| ------------ | ----------------- |
| `proposed`   | 検討中            |
| `accepted`   | 承認済み          |
| `deprecated` | 非推奨            |
| `superseded` | 別のADRに置き換え |

## タイトルガイドライン

| Good                                 | Bad                                |
| ------------------------------------ | ---------------------------------- |
| "Adopt Zustand for State Management" | "State Management"（抽象的すぎる） |
| "Migrate to PostgreSQL"              | "Fix bug"（ADRの範囲外）           |

## スクリプト

```bash
~/.claude/skills/creating-adrs/scripts/pre-check.sh "Title"
~/.claude/skills/creating-adrs/scripts/validate-adr.sh FILE
~/.claude/skills/creating-adrs/scripts/update-index.sh adr
```

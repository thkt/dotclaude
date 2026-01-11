---
name: reviewer-common
description: Common patterns referenced by all reviewer agents (not a standalone agent)
---

# Reviewer Common Patterns

Common patterns referenced by all reviewer agents.

## 1. Confidence Marker System

| Marker | Confidence | Usage                           |
| ------ | ---------- | ------------------------------- |
| [✓]    | >0.8       | Verified (file:line required)   |
| [→]    | 0.5-0.8    | Inferred (state reasoning)      |
| [?]    | <0.5       | Hypothesis (needs confirmation) |

**Evidence requirement**: All findings must include file:line, code snippet, and impact.

Source: [@../../rules/core/AI_OPERATION_PRINCIPLES.md](../../rules/core/AI_OPERATION_PRINCIPLES.md)

## 2. Standard Review Process

1. **Context Discovery**: Identify project conventions, existing patterns
2. **Assessment**: Apply skill knowledge, detect patterns, evaluate confidence
3. **Filtering**: Exclude below threshold (0.7), document evidence

## 3. Integration Patterns

When findings overlap between agents:

- **Primary owner**: Agent whose domain is central
- **Secondary**: Cross-reference related findings
- **No duplicates**: Same issue not reported by multiple agents

## 4. Browser/MCP Verification (Optional)

Applies to: accessibility-reviewer, performance-reviewer

| Use When              | Skip When                |
| --------------------- | ------------------------ |
| Complex interactions  | Static HTML/CSS          |
| Custom ARIA           | No dev server            |
| Performance profiling | Code analysis sufficient |

Fallback: If MCP unavailable, code-only analysis with [→] marker.

## 5. JP/EN Translation Handling

Files under `.ja/` are Japanese translations.

| Review          | Skip                    |
| --------------- | ----------------------- |
| Structure match | Content comparison      |
| YAML match      | Translation differences |
| Link validity   | Localized formats       |

Source: [@../../rules/guidelines/JP_EN_TRANSLATION_RULES.md](../../rules/guidelines/JP_EN_TRANSLATION_RULES.md)

# Deprecation Template

技術、API、またはレガシーコードパスを廃止し、それを置き換える移行計画を記録する。

## When to Use

| シナリオ                                 |
| ---------------------------------------- |
| ライブラリ、フレームワーク、ツールの廃止 |
| 非推奨 API やパターンの置き換え          |
| レガシーコードの削除計画                 |

## Template-Specific Topics (More Information 配下)

Deprecation ADR は他のテンプレートよりも強い構造が必要。以下のすべてを `## More Information` 配下に `### {topic}` として含める。

| トピック                   | 必須 | 目的                                         |
| -------------------------- | ---- | -------------------------------------------- |
| Deprecation Target         | Yes  | 名称、バージョン、使用箇所                   |
| Replacement Technology     | Yes  | 何で置き換えるか、その理由                   |
| Impact Analysis            | Yes  | コードへの影響、依存への影響、チームへの影響 |
| Migration Plan             | Yes  | フェーズ別タイムラインと各フェーズの達成基準 |
| Deprecation Warning Period | Yes  | soft deprecation, hard deprecation, 削除日   |
| Rollback Plan              | Yes  | トリガー条件と rollback 手順                 |
| Communication              | Yes  | 告知スケジュールとドキュメント更新           |

## 例

````markdown
---
status: "accepted"
date: 2026-01-15
decision-makers: Frontend team
---

# Deprecate moment.js in favor of date-fns

## Context and Problem Statement

moment.js has entered maintenance mode and its bundle size (67 KB gzip) accounts for 15% of the application. It is not tree-shakable, so unused features are included in the bundle. Should we migrate, wrap, or stay?

## Decision Drivers

* Demand for bundle size reduction
* Official deprecation notice from moment.js
* Risk of security patches ending

## Considered Options

* Migrate to date-fns
* Keep moment.js with wrapper

## Decision Outcome

Chosen option: "Migrate to date-fns", because it eliminates the 67 KB bundle penalty and gives us tree-shaking for future date utilities.

### Consequences

* Good, because ~60 KB bundle size reduction
* Good, because tree-shaking optimization enabled
* Bad, because both libraries coexist during migration
* Bad, because learning cost due to API differences

### Confirmation

Bundle analyzer shows moment.js removed from production bundle. ESLint rule blocks new moment.js imports. Migration completion tracked by `0 dependencies` on moment.js in package.json.

## Pros and Cons of the Options

### Migrate to date-fns

* Good, because tree-shakable, actively maintained
* Good, because similar API surface reduces learning cost
* Bad, because both libraries coexist during migration

### Keep moment.js with wrapper

* Good, because no migration effort
* Bad, because bundle size remains at 67 KB
* Bad, because security patch risk increases over time

## More Information

### Deprecation Target

| Attribute       | Value                                       |
| --------------- | ------------------------------------------- |
| Name            | moment.js                                   |
| Version         | 2.29.4                                      |
| Usage locations | src/utils/date.ts, src/components/Calendar/ |

### Replacement Technology

| Attribute | Value                                          |
| --------- | ---------------------------------------------- |
| Name      | date-fns                                       |
| Rationale | Tree-shakable. TypeScript native. Lightweight. |

### Migration Plan

| Phase             | Duration | Goal                              | Criteria       |
| ----------------- | -------- | --------------------------------- | -------------- |
| Preparation       | 1 week   | Add date-fns, create compat layer | Tests pass     |
| Gradual migration | 2 weeks  | Replace usage incrementally       | 80% complete   |
| Full migration    | 1 week   | Replace remainder, remove moment  | 0 dependencies |

### Deprecation Warning Period

| Stage            | Mechanism                   |
| ---------------- | --------------------------- |
| Soft deprecation | ESLint rule as warning      |
| Hard deprecation | CI blocks moment.js imports |
| Full removal     | Remove from package.json    |

### Rollback Plan

Trigger. Bug in date-fns that cannot reproduce moment.js behavior.

Steps.

1. Revert compat layer to moment.js
2. Revert migrated files
3. Disable ESLint rule

### Reassessment Triggers

* If date-fns introduces a breaking change that affects locale handling
* If moment.js is revived with tree-shaking support
````

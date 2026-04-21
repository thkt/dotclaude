# Deprecation Template

Document decisions to retire a technology, API, or legacy code path and the migration plan that replaces it.

## When to Use

| Scenario                               |
| -------------------------------------- |
| Retiring a library, framework, or tool |
| Replacing deprecated APIs or patterns  |
| Planning removal of legacy code        |

## Required Sections (MADR Core)

| # | Section                       | Purpose                                               |
| - | ----------------------------- | ----------------------------------------------------- |
| 1 | Title                         | Action-oriented. Example: `Deprecate X in favor of Y` |
| 2 | Status                        | `proposed` / `accepted` / `deprecated` / `superseded` |
| 3 | Context and Problem Statement | Why this decision is needed now                       |
| 4 | Decision Drivers              | Factors influencing the choice                        |
| 5 | Considered Options            | Minimum 2 options (migrate vs keep)                   |
| 6 | Decision Outcome              | `Chosen option: X, because Y`                         |
| 7 | Consequences                  | Positive and Negative impacts                         |

Metadata line: `- Confidence: {level}. {rationale}`. Reassessment goes in an optional `## Reassessment Triggers` section after Consequences.

## Template-Specific Sections (Required)

Deprecation ADRs have stricter requirements than the other templates.

| Section                    | Required? | Purpose                                           |
| -------------------------- | --------- | ------------------------------------------------- |
| Deprecation Target         | Yes       | Name, version, usage locations                    |
| Replacement Technology     | Yes       | What replaces it and the rationale                |
| Impact Analysis            | Yes       | Code impact, dependency impact, team impact       |
| Migration Plan             | Yes       | Phased timeline with success criteria per phase   |
| Deprecation Warning Period | Yes       | Soft deprecation, hard deprecation, removal dates |
| Rollback Plan              | Yes       | Trigger conditions and rollback steps             |
| Communication              | Yes       | Announcement schedule and doc updates             |

## Example

```markdown
# Deprecate moment.js in favor of date-fns

- Status: accepted
- Deciders: Frontend team
- Date: 2026-01-15
- Confidence: high. Official deprecation notice. Clear bundle size data.

## Context and Problem Statement

moment.js has entered maintenance mode and its bundle size (67 KB gzip) accounts for 15% of the application. It is not tree-shakable, so unused features are included in the bundle.

## Decision Drivers

- Demand for bundle size reduction
- Official deprecation notice from moment.js
- Risk of security patches ending

## Considered Options

### Migrate to date-fns

- Good: Tree-shakable, actively maintained
- Good: Similar API surface reduces learning cost
- Bad: Both libraries coexist during migration

### Keep moment.js with wrapper

- Good: No migration effort
- Bad: Bundle size remains at 67 KB
- Bad: Security patch risk increases over time

## Deprecation Target

| Attribute       | Value                                       |
| --------------- | ------------------------------------------- |
| Name            | moment.js                                   |
| Version         | 2.29.4                                      |
| Usage locations | src/utils/date.ts, src/components/Calendar/ |

## Replacement Technology

| Attribute | Value                                          |
| --------- | ---------------------------------------------- |
| Name      | date-fns                                       |
| Rationale | Tree-shakable. TypeScript native. Lightweight. |

## Decision Outcome

Deprecate moment.js and gradually migrate to date-fns.

### Positive Consequences

- ~60 KB bundle size reduction
- Tree-shaking optimization enabled

### Negative Consequences

- Both libraries coexist during migration
- Learning cost due to API differences

## Migration Plan

| Phase             | Duration | Goal                              | Criteria       |
| ----------------- | -------- | --------------------------------- | -------------- |
| Preparation       | 1 week   | Add date-fns, create compat layer | Tests pass     |
| Gradual migration | 2 weeks  | Replace usage incrementally       | 80% complete   |
| Full migration    | 1 week   | Replace remainder, remove moment  | 0 dependencies |

## Deprecation Warning Period

| Stage            | Mechanism                   |
| ---------------- | --------------------------- |
| Soft deprecation | ESLint rule as warning      |
| Hard deprecation | CI blocks moment.js imports |
| Full removal     | Remove from package.json    |

## Rollback Plan

Trigger. Bug in date-fns that cannot reproduce moment.js behavior.

Steps.

1. Revert compat layer to moment.js
2. Revert migrated files
3. Disable ESLint rule

## Reassessment Triggers

- If date-fns introduces a breaking change that affects locale handling
- If moment.js is revived with tree-shaking support
```

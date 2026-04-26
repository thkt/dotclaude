# Deprecation Template

Document decisions to retire a technology, API, or legacy code path and the migration plan that replaces it.

## When to Use

| Scenario                               |
| -------------------------------------- |
| Retiring a library, framework, or tool |
| Replacing deprecated APIs or patterns  |
| Planning removal of legacy code        |

## Template-Specific Topics (under More Information)

Deprecation ADRs need stronger structure than other templates. Include all of the following as `### {topic}` under `## More Information`.

| Topic                      | Required | Purpose                                           |
| -------------------------- | -------- | ------------------------------------------------- |
| Deprecation Target         | Yes      | Name, version, usage locations                    |
| Replacement Technology     | Yes      | What replaces it and the rationale                |
| Impact Analysis            | Yes      | Code impact, dependency impact, team impact       |
| Migration Plan             | Yes      | Phased timeline with success criteria per phase   |
| Deprecation Warning Period | Yes      | Soft deprecation, hard deprecation, removal dates |
| Rollback Plan              | Yes      | Trigger conditions and rollback steps             |
| Communication              | Yes      | Announcement schedule and doc updates             |

## Example

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

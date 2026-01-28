# Deprecation Template

Guide for documenting technology retirement and migration decisions.

## When to Use

- Retiring a library, framework, or tool
- Replacing deprecated APIs or patterns
- Planning removal of legacy code

## Required Sections

All ADRs must include these MADR core sections:

1. **Title** — Action-oriented: "Deprecate X in favor of Y"
2. **Status** — proposed | accepted | deprecated | superseded
3. **Context and Problem Statement** — Why this decision is needed now
4. **Decision Drivers** — Factors influencing the choice
5. **Considered Options** — Minimum 2 options (migrate vs keep)
6. **Decision Outcome** — "Chosen option: X, because Y"
7. **Consequences** — Positive and Negative impacts

## Template-Specific Sections (REQUIRED)

Deprecation ADRs have stricter requirements:

- **Deprecation Target** — What is being deprecated (name, version, usage locations)
- **Replacement Technology** — What replaces it and why
- **Impact Analysis** — Code impact, dependency impact, team impact
- **Migration Plan (REQUIRED)** — Phased timeline with success criteria per phase
- **Deprecation Warning Period** — Soft deprecation → Hard deprecation → Removal dates
- **Rollback Plan (REQUIRED)** — Trigger conditions and rollback steps
- **Communication** — Announcement schedule and documentation updates

## Example

```markdown
# Deprecate moment.js in favor of date-fns

- Status: accepted
- Deciders: Frontend team
- Date: 2026-01-15

## Context and Problem Statement

moment.js has entered maintenance mode and its bundle size (67KB gzip)
accounts for 15% of the application. It is not tree-shakable, so unused
features are included in the bundle.

## Decision Drivers

- Demand for bundle size reduction
- Official deprecation notice from moment.js
- Risk of security patches ending

## Deprecation Target

- **Name**: moment.js
- **Version**: 2.29.4
- **Usage locations**: src/utils/date.ts, src/components/Calendar/

## Replacement Technology

- **Name**: date-fns
- **Rationale**: Tree-shakable, TypeScript native, lightweight

## Decision Outcome

Deprecate moment.js and gradually migrate to date-fns.

### Positive Consequences

- ~60KB bundle size reduction
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

- Soft deprecation: ESLint rule as warning
- Hard deprecation: CI blocks moment.js imports
- Full removal: Remove from package.json

## Rollback Plan

**Trigger**: Bug in date-fns that cannot reproduce moment.js behavior

**Steps**:

1. Revert compat layer to moment.js
2. Revert migrated files
3. Disable ESLint rule
```

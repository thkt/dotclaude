# Technology Selection Template

Guide for documenting technology/library/framework selection decisions.

## When to Use

- Choosing between libraries or frameworks
- Selecting infrastructure components
- Adopting new tools or services

## Required Sections

All ADRs must include these MADR core sections:

1. **Title** — Action-oriented: "Adopt X for Y"
2. **Status** — proposed | accepted | deprecated | superseded
3. **Context and Problem Statement** — Why this decision is needed now
4. **Decision Drivers** — Factors influencing the choice
5. **Considered Options** — Minimum 3 options with Pros/Cons
6. **Decision Outcome** — "Chosen option: X, because Y"
7. **Consequences** — Positive and Negative impacts

## Template-Specific Sections

In addition to the core sections, include:

- **Implementation Plan** — Steps to adopt the technology
- **Migration Strategy** — How to transition from current state
- **Rollback Plan** — How to revert if adoption fails
- **Success Criteria** — Measurable outcomes to validate the decision

## Example

```markdown
# Migrate to React Router v7

- Status: accepted
- Deciders: Entire team
- Date: 2026-01-13

## Context and Problem Statement

React Router v6 only receives conservative updates. v7 introduces
type-safe routing and improved data loading capabilities.

## Decision Drivers

- Type safety directly improves development velocity
- v6 support window is closing
- Team already proficient with React Router

## Considered Options

### React Router v7

Major upgrade of the current router.

- Good: Minimal migration cost (leverages existing knowledge)
- Good: Type-safe routing
- Bad: Some breaking API changes

### TanStack Router

A new router specialized in type safety.

- Good: TypeScript-first design
- Good: Type-safe search parameters
- Bad: High learning cost
- Bad: Smaller ecosystem

### Next.js App Router

Migration to a full-stack framework.

- Good: Integrated SSR/SSG
- Bad: Requires significant architectural changes
- Bad: Incompatible with current SPA setup

## Decision Outcome

Adopted React Router v7. Best balance of migration cost and benefits.

### Positive Consequences

- Type-safe routing reduces runtime errors
- Maximizes team's existing knowledge

### Negative Consequences

- Effort required to address breaking changes

## Migration Strategy

Phase 1: Upgrade and verify in development environment
Phase 2: Fix breaking changes
Phase 3: Production deployment

## Rollback Plan

Revert package.json to v6 and restore changed API calls.
```

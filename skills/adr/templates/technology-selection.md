# Technology Selection Template

Document decisions that adopt a library, framework, service, or infrastructure component.

## When to Use

| Scenario                                 |
| ---------------------------------------- |
| Choosing between libraries or frameworks |
| Selecting infrastructure components      |
| Adopting new tools or services           |

## Template-Specific Topics

Place under `## More Information` as `### {topic}`.

| Topic               | Purpose                                      |
| ------------------- | -------------------------------------------- |
| Implementation Plan | Concrete steps to adopt the technology       |
| Migration Strategy  | How to transition from the current state     |
| Rollback Plan       | How to revert if the adoption fails          |
| Success Criteria    | Measurable outcomes that validate the choice |

## Example

````markdown
---
status: "accepted"
date: 2026-01-13
decision-makers: Frontend team
---

# Migrate to React Router v7

## Context and Problem Statement

React Router v6 only receives conservative updates. v7 introduces type-safe routing and improved data loading. Should we adopt v7 now, switch to a different router, or wait?

## Decision Drivers

* Type safety directly improves development velocity
* v6 support window is closing
* Team already proficient with React Router

## Considered Options

* React Router v7
* TanStack Router
* Next.js App Router

## Decision Outcome

Chosen option: "React Router v7", because it offers the best balance of migration cost and benefits while leveraging existing team knowledge.

### Consequences

* Good, because type-safe routing reduces runtime errors
* Good, because maximizes existing team knowledge
* Bad, because effort required to address breaking API changes

### Confirmation

`tsc --noEmit` runs in CI to ensure router types stay aligned. Manual review verifies all routes use the v7 API surface.

## Pros and Cons of the Options

### React Router v7

Major upgrade of the current router.

* Good, because minimal migration cost (leverages existing knowledge)
* Good, because type-safe routing
* Bad, because some breaking API changes

### TanStack Router

A new router specialized in type safety.

* Good, because TypeScript-first design
* Good, because type-safe search parameters
* Bad, because high learning cost
* Bad, because smaller ecosystem

### Next.js App Router

Migration to a full-stack framework.

* Good, because integrated SSR / SSG
* Bad, because requires significant architectural changes
* Bad, because incompatible with current SPA setup

## More Information

### Migration Strategy

Phase 1. Upgrade and verify in development environment.
Phase 2. Fix breaking changes.
Phase 3. Production deployment.

### Rollback Plan

Revert package.json to v6 and restore changed API calls.

### Reassessment Triggers

* If TanStack Router reaches 1.0 stable, evaluate type-safe routing alternatives
* If React Router v7 introduces breaking changes in a minor release
````

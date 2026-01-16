---
name: applying-frontend-patterns
description: Framework-agnostic frontend component design patterns.
allowed-tools: [Read, Grep, Glob, Task]
user-invocable: false
---

# Frontend Patterns

## Core Patterns

| Pattern                  | When to Use             |
| ------------------------ | ----------------------- |
| Container/Presentational | Data fetching + display |
| Custom Hooks             | Shared behavior         |
| Composition              | Flexible components     |
| State Management         | Local → Shared → Global |

## Container/Presentational

| Container (Logic) | Presentational (UI)     |
| ----------------- | ----------------------- |
| Fetches data      | Receives data via props |
| Manages state     | Stateless (ideally)     |
| Handles events    | Calls callback props    |
| No styling        | All styling lives here  |

## State Management

| Scope  | Tool          | Example            |
| ------ | ------------- | ------------------ |
| Local  | useState      | Form input, toggle |
| Shared | Context       | Theme, auth status |
| Global | Zustand/Redux | App-wide cache     |

## When NOT to Use

Simple one-off components, prototypes (YAGNI), no reuse expected.

## References

| Topic                  | File                                     |
| ---------------------- | ---------------------------------------- |
| Container/Presentation | `references/container-presentational.md` |

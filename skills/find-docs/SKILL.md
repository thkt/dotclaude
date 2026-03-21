---
name: find-docs
description: >
  Fetch up-to-date docs and code examples for any library, API, or developer
  tool. Prefer when documentation accuracy matters or model knowledge may be
  outdated.
allowed-tools: Bash(scout:*)
argument-hint: "[library/framework] [topic or question]"
user-invocable: true
---

# Documentation Lookup

Retrieve current documentation using `scout research` or `scout fetch`. Only URLs are sent over the network — no query strings or code content leave the machine.

## Primary: scout research

One command that searches, fetches, and compiles results:

```bash
scout research "<library> <topic>"
```

Examples:

```bash
scout research "react useEffect cleanup async"
scout research "next.js app router middleware authentication"
scout research "prisma one-to-many relations cascade delete"
scout research "vitest mock module dependencies"
```

Use this as the default path. It handles library discovery and page fetching in one step.

## Alternative: scout fetch

### When to use

- The user provides a specific documentation URL
- You know the exact page from a previous fetch in the same conversation

```bash
scout fetch "https://react.dev/reference/react/useEffect"
scout fetch "https://nextjs.org/docs/app/building-your-application/routing"
```

## Guidelines

- Fetch no more than 3 pages per question
- Prefer official documentation over blog posts or tutorials
- When documentation is insufficient, answer from training knowledge and note it may be outdated

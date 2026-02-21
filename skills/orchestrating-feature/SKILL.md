---
name: orchestrating-feature
description: >
  Feature development orchestration with /think, /code, /audit, /validate delegation.
  Triggers: /feature workflow, multi-phase feature development,
  機能開発, feature orchestration, フェーズ管理.
allowed-tools: [Read, Grep, Glob, Task]
user-invocable: false
---

# Feature Orchestration

Phase coordination for /feature workflow. Delegates to specialized commands:

| Phase | Command    | Purpose                      |
| ----- | ---------- | ---------------------------- |
| 1     | (direct)   | Discovery + PRE_TASK_CHECK   |
| 2     | /think     | Design + SOW/Spec generation |
| 3     | /code      | TDD implementation           |
| 4     | /audit+fix | Quality loop (max 3 rounds)  |
| 5     | /validate  | AC verification              |

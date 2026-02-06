# Workflow Guide

Guide for command selection and workflow patterns.

## Standard Workflows

| Pattern       | Workflow                                                                             | When                                    |
| ------------- | ------------------------------------------------------------------------------------ | --------------------------------------- |
| Quick Fix     | `/fix`                                                                               | Small bug, stable codebase              |
| Investigation | `/research` → `/fix`                                                                 | Unknown cause                           |
| Feature       | `/feature` (or: `/research` → `/think` → `/code` → `/test` → `/audit` → `/validate`) | New capability, requirements unstable   |
| Simple        | `/code` → `/test`                                                                    | Clear implementation, tech stack stable |

## Command Selection

| Criteria      | [✓] High Priority     | [→] Medium Priority  | [?] Low Priority    |
| ------------- | --------------------- | -------------------- | ------------------- |
| Understanding | ≥95% → direct         | 70-94% → `/think`    | <70% → `/research`  |
| Complexity    | Multi-step → workflow | Single file → `/fix` | Unclear → `/think`  |
| Urgency       | Critical → `/fix`     | Normal → standard    | Planning → `/think` |

### Task Analysis

| User Intent        | Analysis            | Result                             |
| ------------------ | ------------------- | ---------------------------------- |
| "X is broken"      | Need investigation? | Yes → `/research` → `/fix`         |
| "Add Y feature"    | Multi-step?         | Yes → `/think` → `/code` → `/test` |
| "Site is down"     | Critical?           | Yes → `/fix` (urgent)              |
| "Fix typo"         | Simple & clear?     | Yes → `/fix`                       |
| "How does Z work?" | Investigation only  | `/research` (no implementation)    |

## Edge Cases

| Situation                 | Action                                                 |
| ------------------------- | ------------------------------------------------------ |
| Ambiguous intent          | Ask clarification in understanding check               |
| No command match          | Use `Command: N/A`, proceed with direct implementation |
| Multiple valid approaches | Present options for user choice                        |
| Unclear requirements      | Start with `/research`                                 |
| Complex multi-part        | Break into sub-workflows                               |

# Workflow Guide

## Standard Workflows

| Pattern       | Workflow                                                                             | When                                  |
| ------------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| Quick Fix     | `/fix`                                                                               | Small bug, stable codebase            |
| Investigation | `/research` → `/fix`                                                                 | Unknown cause                         |
| Feature       | `/feature` (or: `/research` → `/think` → `/code` → `/test` → `/audit` → `/validate`) | New capability, requirements unstable |
| Simple        | `/code` → `/test`                                                                    | Clear implementation                  |

## Command Selection

| Understanding | Complexity | Result            |
| ------------- | ---------- | ----------------- |
| ≥95%          | Simple     | `/fix` or `/code` |
| 70-94%        | Any        | `/think`          |
| <70%          | Any        | `/research`       |
| Any           | Critical   | `/fix` (urgent)   |
| Any           | Unclear    | `/research`       |

## Team-First Principle

Default: Team (TeamCreate + TaskList for progress tracking)

| Command     | Mode | Notes                        |
| ----------- | ---- | ---------------------------- |
| `/feature`  | Team | Existing team structure      |
| `/audit`    | Auto | Scope-based decision         |
| `/think`    | Solo |                              |
| `/code`     | Auto | Scope-based decision         |
| `/fix`      | Auto | Solo conditions below        |
| `/research` | Solo |                              |
| Utility     | Solo | /commit, /branch, /pr, etc.  |

Auto: All solo conditions met → Solo, otherwise → Team

| Solo Condition             | Example                          |
| -------------------------- | -------------------------------- |
| 1-2 target files           | Typo fix, single function change |
| Single phase to completion | No research or test gen needed   |
| No agent coordination      | No dependency on other agents    |

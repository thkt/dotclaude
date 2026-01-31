---
description: Scan plugins and skills for malicious code and deceptive instructions
allowed-tools: Bash(gh repo clone:*), Bash(mv /tmp/claude/scan-* ~/.Trash/), Read, Grep, Glob, LS, Task, AskUserQuestion
model: sonnet
argument-hint: "[target: plugin name, path, or GitHub URL]"
---

# /scan - Plugin Security Scanner

Analyze Claude Code plugins and skills for security threats before use.

## Execution

1. Resolve target scope from `$1`
2. If GitHub URL → AskUserQuestion: "Clone {repo} to scan?"
3. If Yes → `gh repo clone` to `/tmp/claude/scan-{repo}-{timestamp}`
4. `Task` with `subagent_type: plugin-scanner`
5. Output agent report, cleanup temp if remote

## Scope Resolution

| Input            | Target                                           |
| ---------------- | ------------------------------------------------ |
| (empty)          | `~/.claude/plugins/cache/` + `~/.claude/skills/` |
| `name`           | Match in plugins/cache/ or skills/               |
| `./path`         | Specified directory                              |
| `owner/repo`     | Clone from GitHub                                |
| `github.com/...` | Clone from GitHub                                |

## Output

Agent returns structured YAML with verdict, findings, and recommendation.
Render using markdown template from agent output.

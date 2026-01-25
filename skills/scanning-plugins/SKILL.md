---
name: scanning-plugins
description: >
  Plugin and skill security scanner for detecting malicious code and instructions.
  Supports local paths and GitHub repositories. Use when scanning plugins before
  installation, auditing external skills, or when user mentions plugin scan,
  security scan, GitHub repo scan, プラグインスキャン, 安全性チェック.
allowed-tools: [Read, Grep, Glob, LS]
agent: plugin-scanner
context: fork
user-invocable: false
---

# Plugin Security Scanning

Detect malicious code and deceptive instructions in Claude Code plugins and skills.

## Context Evaluation

Distinguish legitimate vs malicious intent:

| Context   | Example                        | Verdict   |
| --------- | ------------------------------ | --------- |
| Education | Vulnerability examples in docs | Safe      |
| Detection | Pattern matching in scanner    | Safe      |
| Execution | Live dangerous command in hook | Malicious |
| Access    | Credential read without reason | Malicious |

## Scan Targets

| Location                   | Content             |
| -------------------------- | ------------------- |
| `~/.claude/plugins/cache/` | Third-party plugins |
| `~/.claude/skills/`        | Installed skills    |
| `.claude/` (project)       | Project configs     |
| `owner/repo` or URL        | GitHub repository   |

## File Types

- `*.md` - Instructions, prompts
- `*.sh` - Shell commands
- `*.js`, `*.ts` - Code execution
- `*.yaml`, `*.json` - Configuration
- `.mcp.json` - MCP server configs (command, args, env)

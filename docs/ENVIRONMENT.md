# Environment Setup Guide

Setup guide for Claude Code execution environments.

## Dev Container (Recommended)

### Overview

Dev Container allows you to run Claude Code in a physically isolated, secure environment.

| Comparison | Sandbox Mode | Dev Container |
| --- | --- | --- |
| Isolation level | Rule-based (config controlled) | Physical (container boundary) |
| Accident impact | Direct impact on host | Limited to container |
| Recovery | Manual restoration required | Instant recovery by recreating container |
| Multiple tasks | Run in same environment | Parallel execution in independent containers |

### Template

A reusable template is available:

```text
~/.claude/templates/devcontainer/
├── .devcontainer/
│   └── devcontainer.json
└── README.md
```

### Quick Start

1. Copy template to your project:

```bash
cp -r ~/.claude/templates/devcontainer/.devcontainer /path/to/your/project/
```

1. Open the project in VSCode
2. `Cmd+Shift+P` → `Dev Containers: Reopen in Container`

See `~/.claude/templates/devcontainer/README.md` for details.

### Base Images

| Image | Purpose | Included Runtimes |
| --- | --- | --- |
| `ghcr.io/creanciel/deck` | General development | Rust, Node, Ruby, Python |
| `mcr.microsoft.com/devcontainers/javascript-node` | Node.js only | Node.js |
| `mcr.microsoft.com/devcontainers/python` | Python only | Python |

## Sandbox Mode

Fallback configuration when not using Dev Container.

### Configuration

Control filesystem and network access in `~/.claude/settings.json`.

### Limitations

- Rule-based control can be bypassed by misconfiguration
- Direct access to host filesystem
- Manual restoration required after accidents

## Recommended Environment

| Use Case | Recommended | Reason |
| --- | --- | --- |
| Development with production DB | Dev Container | Protection from accidental operations |
| Working on critical repositories | Dev Container | Prevents force push accidents |
| Parallel task execution | Dev Container | Environment independence |
| Simple script execution | Sandbox | No setup required |
| Minor fixes to existing projects | Sandbox | Instant start |

## References

- [Original article: Claude Code Dev Container Setup](https://zenn.dev/creanciel/articles/my-claude-code-dev-container-deck)
- [Dev Containers Documentation](https://containers.dev/)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)

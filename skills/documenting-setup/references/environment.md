# Environment Setup

## Dev Container vs Sandbox

| Aspect          | Sandbox             | Dev Container          |
| --------------- | ------------------- | ---------------------- |
| Isolation       | Rule-based (config) | Physical (container)   |
| Accident impact | Direct to host      | Limited to container   |
| Recovery        | Manual restoration  | Recreate container     |
| Multiple tasks  | Same environment    | Independent containers |

## When to Use

| Use Case              | Recommended   | Reason                    |
| --------------------- | ------------- | ------------------------- |
| Production DB access  | Dev Container | Protection from accidents |
| Critical repositories | Dev Container | Prevents force push       |
| Parallel execution    | Dev Container | Independence              |
| Simple scripts        | Sandbox       | No setup required         |
| Minor fixes           | Sandbox       | Instant start             |

## Dev Container Quick Start

| Step | Action                                                            |
| ---- | ----------------------------------------------------------------- |
| 1    | `cp -r ~/.claude/templates/devcontainer/.devcontainer [project]/` |
| 2    | VSCode: Cmd+Shift+P → "Dev Containers: Reopen in Container"       |

## Base Images

| Image                                             | Runtimes                 |
| ------------------------------------------------- | ------------------------ |
| `ghcr.io/creanciel/deck`                          | Rust, Node, Ruby, Python |
| `mcr.microsoft.com/devcontainers/javascript-node` | Node.js                  |
| `mcr.microsoft.com/devcontainers/python`          | Python                   |

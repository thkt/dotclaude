---
name: documenting-setup
description: >
  Generate environment setup guide documentation from codebase analysis.
  Detects package managers, required tools, environment variables, and startup commands.
  Triggers: setup guide, environment setup, development environment.
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# Environment Setup Guide Generation

Auto-generate setup documentation from codebase analysis.

## Detection Items

| Category         | Targets                                                        |
| ---------------- | -------------------------------------------------------------- |
| Package Managers | package.json, yarn.lock, pnpm-lock, pyproject.toml, Cargo.toml |
| Tool Versions    | .nvmrc, .python-version, .ruby-version, .tool-versions         |
| Environment      | .env.example, .env.sample, .env.template                       |
| Config Files     | tsconfig.json, eslint.config, vite.config, next.config         |
| Containers       | Dockerfile, docker-compose.yml, .devcontainer/                 |
| Commands         | package.json scripts, Makefile, README                         |
| Testing          | jest.config, vitest.config, pytest.ini, test scripts           |
| Troubleshooting  | README, TROUBLESHOOTING.md, FAQ, common issues in docs         |

## Detection Patterns

| Manager | Indicator                       |
| ------- | ------------------------------- |
| npm     | `package-lock.json`             |
| yarn    | `yarn.lock`                     |
| pnpm    | `pnpm-lock.yaml`                |
| pip     | `requirements.txt`, `setup.py`  |
| poetry  | `pyproject.toml`, `poetry.lock` |
| cargo   | `Cargo.toml`, `Cargo.lock`      |

## Quality Criteria

| Criteria                             | Target |
| ------------------------------------ | ------ |
| New member can setup in < 15 min     | ✓      |
| All env vars documented              | ✓      |
| Troubleshooting covers common issues | ✓      |
| Commands copy-pastable               | ✓      |

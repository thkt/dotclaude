---
name: documenting-setup
description: >
  Generate environment setup guide documentation from codebase analysis.
  Detects package managers, required tools, environment variables, and startup commands.
  Use when creating setup guides, documenting environments, or when user mentions
  setup guide, environment setup, 環境構築, 開発環境.
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# Environment Setup Guide Generation

## Detection

| Category         | Targets                                                        |
| ---------------- | -------------------------------------------------------------- |
| Package Managers | package.json, yarn.lock, pnpm-lock, pyproject.toml, Cargo.toml |
| Tool Versions    | .nvmrc, .python-version, .ruby-version, .tool-versions         |
| Environment      | .env.example, .env.sample, .env.template                       |
| Config Files     | tsconfig.json, eslint.config, vite.config, next.config         |
| Containers       | Dockerfile, docker-compose.yml, .devcontainer/                 |
| Commands         | package.json scripts, Makefile, README                         |

## Package Manager Indicators

| Manager | Indicator                       |
| ------- | ------------------------------- |
| npm     | `package-lock.json`             |
| yarn    | `yarn.lock`                     |
| pnpm    | `pnpm-lock.yaml`                |
| pip     | `requirements.txt`, `setup.py`  |
| poetry  | `pyproject.toml`, `poetry.lock` |
| cargo   | `Cargo.toml`, `Cargo.lock`      |

## References

| Topic       | File                        |
| ----------- | --------------------------- |
| Environment | `references/environment.md` |

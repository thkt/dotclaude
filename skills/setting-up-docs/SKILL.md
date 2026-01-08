---
name: setting-up-docs
description: >
  Generate environment setup guide documentation from codebase analysis.
  Detects package managers, required tools, environment variables, and startup commands.
  Triggers: setup guide, environment setup, development environment,
  installation guide, getting started, prerequisites.
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - Bash
  - Task
context: fork
---

# docs:setup - Environment Setup Guide Generation

Auto-generate setup documentation from codebase analysis.

## Detection Items

| Category         | Targets                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Package Managers | package.json, yarn.lock, pnpm-lock, pyproject.toml, Cargo.toml, go.mod, pubspec.yaml, Gemfile, pom.xml |
| Tool Versions    | .nvmrc, .python-version, .ruby-version, .tool-versions, rust-toolchain.toml                            |
| Environment      | .env.example, .env.sample, .env.template                                                               |
| Containers       | Dockerfile, docker-compose.yml, .devcontainer/                                                         |
| Commands         | package.json scripts, Makefile, README                                                                 |

## Generated Structure

```markdown
# Environment Setup Guide

## Prerequisites

- Runtime & versions
- Required tools

## Installation Steps

1. Clone repository
2. Install dependencies
3. Configure environment variables

## Environment Variables

| Variable | Description | Required |

## Running the Project

- Start development server
- Build
- Run tests

## Docker (Optional)
```

## Usage

```bash
/docs:setup                   # Generate setup guide
"Generate environment setup"  # Natural language
```

## Markdown Validation

After generation, validate output with:

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

Non-blocking (warnings only) - style issues don't block document creation.

## References

- Related: `documenting-architecture`, `documenting-apis`, `documenting-domains`

---
description: Generate environment setup guide from codebase analysis
aliases: [setup-docs, env-setup]
---

# /docs:setup - Environment Setup Guide Generation

## Overview

Analyzes codebase and automatically generates environment setup guide documentation.

## Usage

```bash
# Analyze current directory
/docs:setup

# Analyze specific directory
/docs:setup src/

# Specify output destination
/docs:setup --output docs/SETUP.md
```

## Options

| Option | Description | Default |
| --- | --- | --- |
| `path` | Target directory to analyze | Current directory |
| `--output` | Output file path | `.claude/workspace/docs/setup-guide.md` |
| `--format` | Output format | `markdown` |

## Generated Content

- **Requirements** - Runtime versions, required tools
- **Installation Steps** - Dependency installation instructions
- **Environment Variables** - Required environment variables list and descriptions
- **Startup Commands** - Development server start, build, test commands
- **Docker Configuration** - Container startup method (if available)

## Detection Items

### Package Managers

| File | Detection Content |
| --- | --- |
| package.json | Node.js (npm/yarn/pnpm/bun) |
| pyproject.toml | Python (uv/poetry/pip) |
| requirements.txt | Python (pip) |
| Cargo.toml | Rust (cargo) |
| go.mod | Go |
| pubspec.yaml | Flutter/Dart |
| Gemfile | Ruby (bundler) |
| pom.xml | Java (Maven) |
| build.gradle | Java/Kotlin (Gradle) |

### Version Specification Files

| File | Detection Content |
| --- | --- |
| .nvmrc, .node-version | Node.js version |
| .python-version | Python version |
| .ruby-version | Ruby version |
| .tool-versions | asdf managed versions |
| rust-toolchain.toml | Rust toolchain |

### Environment Variables

| File | Detection Content |
| --- | --- |
| .env.example | Environment variable template |
| .env.sample | Environment variable sample |
| .env.template | Environment variable template |

### Container Configuration

| File | Detection Content |
| --- | --- |
| Dockerfile | Docker image configuration |
| docker-compose.yml | Multi-container setup |
| .devcontainer/ | Dev Container configuration |

## Execution Flow

### Phase 1: Environment Detection

```bash
~/.claude/skills/setting-up-docs/scripts/detect-environment.sh {path}
```

### Phase 2: Document Generation

Embed detection results into template (`~/.claude/skills/setting-up-docs/assets/setup-template.md`)
and generate Markdown documentation.

### Phase 3: Markdown Validation

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

Validates generated Markdown for formatting issues. Non-blocking (warnings only).

## Output Example

```markdown
# Project Name - Environment Setup Guide

## Requirements

### Runtime
- Node.js v20.x
- npm v10.x

### Required Tools
- Git
- Docker (optional)

## Quick Start

\`\`\`bash
git clone https://github.com/user/project
cd project
npm install
cp .env.example .env
npm run dev
\`\`\`

## Environment Variables

| Variable Name | Default Value | Description |
| --- | --- | --- |
| DATABASE_URL | - | Database connection URL |
| API_KEY | - | API authentication key |
```

## Error Handling

| Error | Action |
| --- | --- |
| Config file not detected | Use generic template |
| No environment variable file | Display warning and continue |
| jq/yq not installed | Skip some features |

## Related

- **Sibling Commands**: `/docs:architecture`

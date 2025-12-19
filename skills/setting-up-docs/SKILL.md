---
name: setting-up-docs
description: >
  Generate environment setup guide documentation from codebase analysis.
  Detects package managers, required tools, environment variables, and startup commands.
  Use when: setup guide, environment setup, development environment,
  installation guide, getting started, prerequisites.
allowed-tools: Read, Write, Grep, Glob, Bash, Task

triggers:
  keywords:
    - "setup guide"
    - "environment setup"
    - "development environment"
    - "installation guide"
    - "getting started"
---

# docs:setup Skill

Automatically generate environment setup guide documentation.

## Features

### Detection Items

1. **Package Managers**
   - Node.js: package.json, package-lock.json, yarn.lock, pnpm-lock.yaml
   - Python: pyproject.toml, requirements.txt, Pipfile
   - Rust: Cargo.toml
   - Go: go.mod
   - Flutter/Dart: pubspec.yaml
   - Ruby: Gemfile
   - Java: pom.xml, build.gradle

2. **Required Tools & Versions**
   - .nvmrc, .node-version (Node.js)
   - .python-version (Python)
   - .ruby-version (Ruby)
   - .tool-versions (asdf)
   - rust-toolchain.toml (Rust)

3. **Environment Variables**
   - .env.example, .env.sample, .env.template
   - Environment variable sections in README

4. **Container Configuration**
   - Dockerfile
   - docker-compose.yml, docker-compose.yaml
   - .devcontainer/

5. **Startup Commands**
   - package.json scripts
   - Makefile
   - Command sections in README

## Analysis Scripts

### detect-environment.sh

Detect project environment settings:

```bash
~/.claude/skills/setting-up-docs/scripts/detect-environment.sh {path}
```

**Output:**

- Package manager type
- Required runtime versions
- Environment variable list
- Available scripts/commands

### extract-env-vars.sh

Extract environment variables:

```bash
~/.claude/skills/setting-up-docs/scripts/extract-env-vars.sh {path}
```

## Template

`assets/setup-template.md` - Markdown template for environment setup guide

## Generated Document Structure

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
|----------|-------------|----------|

## Running the Project
- Start development server
- Build
- Run tests

## Docker (Optional)
- How to run with containers
```

## Usage

```bash
# Call from command
/docs:setup

# Direct skill reference
"Generate an environment setup guide"
```

## Related

- Sibling skills: `documenting-architecture`, `documenting-apis`, `documenting-domains`
- Command: `/docs:setup`

---
name: documenting-architecture
description: >
  Generate architecture overview documentation from codebase analysis.
  Uses tree-sitter-analyzer for precise code structure extraction.
  Triggers: architecture overview, project structure, module diagram.
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# Architecture Overview Generation

Auto-generate architecture documentation from codebase analysis.

## Detection Items

| Category            | Targets                                |
| ------------------- | -------------------------------------- |
| Project Overview    | Tech stack, framework, database        |
| Directory Structure | tree command output                    |
| Module Composition  | Mermaid relationship diagrams          |
| Key Components      | Classes, functions, entry points       |
| Dependencies        | External packages, internal modules    |
| Statistics          | File count, line count, language ratio |

## Detection Patterns

| Project Type | Pattern                                     |
| ------------ | ------------------------------------------- |
| Node.js      | `package.json`, `node_modules/`             |
| Python       | `pyproject.toml`, `setup.py`, `__init__.py` |
| Rust         | `Cargo.toml`, `src/main.rs`, `src/lib.rs`   |
| Go           | `go.mod`, `main.go`, `go.sum`               |
| Java/Maven   | `pom.xml`, `src/main/java/`                 |
| Java/Gradle  | `build.gradle`, `src/main/java/`            |

## Quality Criteria

| Criteria                                 | Target |
| ---------------------------------------- | ------ |
| New member understands structure < 5 min | ✓      |
| Module relationships visualized          | ✓      |
| Entry points clearly identified          | ✓      |
| Tech stack decisions documented          | ✓      |

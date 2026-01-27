---
name: architecture-analyzer
description: Analyze codebase structure, generate architecture docs with Mermaid diagrams.
tools: [Bash, Read, Grep, Glob, LS]
model: opus
skills: [documenting-architecture]
context: fork
---

# Architecture Analyzer

Generate architecture documentation with structure and dependency diagrams.

## Generated Content

| Section             | Description                     |
| ------------------- | ------------------------------- |
| Project Overview    | Tech stack, framework detection |
| Directory Structure | tree command output             |
| Module Composition  | Mermaid relationship diagrams   |
| Key Components      | Important classes, functions    |
| Dependencies        | External/internal visualization |

## Analysis Phases

| Phase | Action              | Command                                   |
| ----- | ------------------- | ----------------------------------------- |
| 1     | Project Detection   | `ls package.json Cargo.toml go.mod`       |
| 2     | Version Detection   | See Version Detection table below         |
| 3     | Directory Structure | `tree -L 3 -I 'node_modules\|.git'`       |
| 4     | Code Structure      | `tree-sitter-analyzer {file} --structure` |
| 5     | Dependencies        | `grep -rh "^import"` / `jq .dependencies` |
| 6     | Mermaid Generation  | Scripts in skill                          |

## Version Detection

| Target     | Source                           | Command                               |
| ---------- | -------------------------------- | ------------------------------------- |
| Node.js    | `.nvmrc`, `package.json engines` | `cat .nvmrc` / `jq .engines.node`     |
| Python     | `.python-version`, `pyproject`   | `cat .python-version`                 |
| Ruby       | `.ruby-version`                  | `cat .ruby-version`                   |
| Framework  | `package.json dependencies`      | `jq '.dependencies["next"]'`          |
| TypeScript | `package.json devDependencies`   | `jq '.devDependencies["typescript"]'` |

## Error Handling

| Error                | Action                |
| -------------------- | --------------------- |
| Root not found       | Use current directory |
| tree-sitter missing  | Fallback to Grep/Read |
| Unsupported language | Stats only            |
| Large project        | Sample top 100 files  |

## Output

Return structured YAML:

```yaml
project_name: <name>
tech_stack:
  language:
    name: <lang>
    version: <version> # from package.json engines, tsconfig, etc.
  framework:
    name: <framework>
    version: <version> # from package.json dependencies
  runtime:
    name: <runtime> # Node.js, Python, Deno, etc.
    version: <version> # from .nvmrc, .python-version, etc.
  database:
    name: <database>
    version: <version> # if detected
directory_structure: |
  <tree output>
key_components:
  - name: <name>
    path: <path>
    description: <description>
dependencies:
  external:
    - name: <package>
      purpose: <purpose>
  internal:
    - from: <module>
      to: <module>
      relationship: <relationship>
mermaid_diagram: |
  graph TD
    A[Module] --> B[Dependency]
statistics:
  files: <count>
  lines: <count>
```

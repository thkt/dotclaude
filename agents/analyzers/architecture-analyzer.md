---
name: architecture-analyzer
description: Analyze codebase structure, generate architecture docs with Mermaid diagrams.
tools: [Bash, Read, Grep, Glob, LS]
model: sonnet
skills: [documenting-architecture]
context: fork
memory: project
---

# Architecture Analyzer

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

## Dependency Enumeration Rules

| Rule                   | Detail                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Compound agent members | Read `tools:` frontmatter of compound/team agents; list ALL `Task(*)` entries — never summarize or omit           |
| Sub-component listing  | When listing compositions (e.g. "module-X covers A + B + C"), enumerate every member from source, not from memory |

## Mermaid Direction Rules

| Relationship Type     | Arrow Direction         | Example                                               |
| --------------------- | ----------------------- | ----------------------------------------------------- |
| Priority / constrains | Higher priority → lower | `CONV --> DEV` (conventions constrain development)    |
| Defines / binds       | Definer → target        | `SET --> Hooks` (settings.json defines hook bindings) |
| Spawns / creates      | Creator → created       | `CMD --> Agent` (command spawns agent)                |
| References / uses     | User → used             | `Agent -.-> Skill` (agent references skill)           |

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
source: analyzer
tech_stack:
  language:
    name: <lang>
    version: <version>
  framework:
    name: <framework>
    version: <version>
  runtime:
    name: <runtime>
    version: <version>
  database:
    name: <database>
    version: <version>
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
  internal: # Use full paths consistent with key_components[].path
    - from: <dir>/<file>
      to: <dir>/<file>
      relationship: <relationship>
mermaid_diagram: | # Node labels must use full paths matching key_components[].path
  graph TD
    A["app/services/cache.ts"] --> B["app/utils/logger.ts"]
statistics:
  files: <count>
  lines: <count>
```

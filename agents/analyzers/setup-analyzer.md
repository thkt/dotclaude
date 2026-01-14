---
name: setup-analyzer
description: Analyze codebase setup requirements, generate setup guide.
tools: [Bash, Read, Grep, Glob, LS]
model: opus
skills: [documenting-setup]
context: fork
---

# Setup Analyzer

Generate environment setup guide from codebase analysis.

## Generated Content

| Section         | Description                   |
| --------------- | ----------------------------- |
| Prerequisites   | Required tools with versions  |
| Installation    | Step-by-step install commands |
| Configuration   | Env vars and config files     |
| Running         | Dev and production commands   |
| Testing         | Test execution commands       |
| Troubleshooting | Common issues and solutions   |

## Analysis Phases

| Phase | Action             | Command                                            |
| ----- | ------------------ | -------------------------------------------------- |
| 1     | Package Detection  | `ls package.json Cargo.toml pyproject.toml go.mod` |
| 2     | Version Detection  | `cat .nvmrc .python-version .tool-versions`        |
| 3     | Env Var Extraction | `cat .env.example .env.sample`                     |
| 4     | Config Files       | `ls *.config.* tsconfig.json`                      |
| 5     | Script Discovery   | `jq '.scripts' package.json` / `cat Makefile`      |
| 6     | README Parsing     | Extract setup instructions from README             |

## Error Handling

| Error              | Action                 |
| ------------------ | ---------------------- |
| No package manager | Report "Manual setup"  |
| No env example     | Skip env vars section  |
| No README          | Generate minimal guide |

## Output

Return structured YAML:

```yaml
project_name: <name>
prerequisites:
  - tool: <tool>
    version: <version>
    required: true/false
installation:
  clone_url: <repo_url>
  install_command: <command>
configuration:
  env_vars:
    - name: <VAR_NAME>
      description: <description>
      default: <default>
  config_files:
    - file: <filename>
      purpose: <purpose>
running:
  development: <dev_command>
  production: <prod_command>
testing:
  command: <test_command>
troubleshooting:
  - issue: <issue>
    solution: <solution>
```

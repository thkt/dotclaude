---
name: setup-analyzer
description: Analyze codebase setup requirements, generate setup guide.
tools: [Bash, Read, Grep, Glob, LS]
model: opus
skills: [documenting-setup]
context: fork
memory: project
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

| Phase | Action             | Method                                                                        |
| ----- | ------------------ | ----------------------------------------------------------------------------- |
| 0     | Seed Context       | Read `.analysis/architecture.yaml` or `.md` (if either exists) for tech stack |
| 1     | Package Detection  | `ls package.json Cargo.toml pyproject.toml go.mod`                            |
| 2     | Version Detection  | `cat .nvmrc .python-version .tool-versions`                                   |
| 3     | Env Var Extraction | Discover → Read → Cross-validate (see Phase 3 details)                        |
| 4     | Config Deep Read   | Read config files and extract key settings (see Phase 4 details)              |
| 5     | Script Discovery   | `jq '.scripts' package.json` / `cat Makefile`                                 |
| 6     | README Parsing     | Extract setup instructions from README                                        |
| 7     | Validation Gate    | Verify evidence for all output fields                                         |

### Phase 0: Seed Context

If `.analysis/architecture.yaml` or `.analysis/architecture.md` exists, read it for:

- `tech_stack` → skip redundant detection in Phase 1-2
- `key_components` → identify config entry points

If absent, proceed with full detection from Phase 1.

### Phase 3: Env Var Extraction

| Step | Action              | Method                                                                  |
| ---- | ------------------- | ----------------------------------------------------------------------- |
| 3a   | Discover env file   | Glob `.env.example`, `.env.sample`, `.env.template`. Record which exist |
| 3b   | Read env file       | Read discovered file(s) for variable names and sample values            |
| 3c   | Code cross-validate | Grep for env var definitions in code; Read matched files                |

#### Step 3c: Code Cross-Validation Patterns

| Framework | Grep Pattern                                         |
| --------- | ---------------------------------------------------- |
| Zod       | `z.object`, `z.string()`, `process.env` in same file |
| Plain     | `process.env.`, `os.environ`, `os.Getenv`            |
| Vite      | `import.meta.env.`                                   |
| Docker    | `ENV`, `environment:` in Dockerfile/compose          |

#### Truth Precedence

Code is truth, `.env.*` is supplementary:

| Source                        | required_level | default        | confidence |
| ----------------------------- | -------------- | -------------- | ---------- |
| Zod `.parse()` no default     | Yes            | —              | verified   |
| Zod `.default(value)`         | No             | value          | verified   |
| `process.env.X ?? fallback`   | No             | fallback       | verified   |
| `process.env.X` (no fallback) | Yes            | —              | verified   |
| `.env.*` file only            | —              | sample value   | inferred   |
| Docker default only           | Conditional    | Docker default | inferred   |

### Phase 4: Config Deep Read

Read each config file and extract key settings, not just file names:

| Config File         | Key Settings to Extract                          |
| ------------------- | ------------------------------------------------ |
| vite.config.*       | `server.port`, `base`, `build.outDir`            |
| tsconfig.json       | `target`, `module`, `moduleResolution`, `strict` |
| next.config.*       | `basePath`, `output`, `experimental`             |
| eslint/biome config | `extends`, plugins/rules count                   |
| compose.yml         | services, ports, default credentials             |

### Phase 7: Validation Gate

| Check              | Rule                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| File existence     | Every referenced file (`.env.*`, configs) verified via Glob             |
| Env var evidence   | Every env_var has `source_file` from code or env file. No guessing      |
| Default accuracy   | Defaults come from code (Phase 3c), not assumed from framework defaults |
| Port accuracy      | Dev server port from config file read, not framework default            |
| Command accuracy   | Script commands read verbatim from package.json/Makefile                |
| Post-install steps | Only reference files confirmed to exist                                 |

## Phase Rules

| Phase | Rule                                                                                    |
| ----- | --------------------------------------------------------------------------------------- |
| 3a    | Only generate `cp .env.X .env` for files confirmed to exist by Glob                     |
| 3c    | Code references without fallback → `Yes`                                                |
| 3c    | Code has fallback or optional usage → `No`                                              |
| 3c    | Dockerfile/compose has default → `Conditional (Docker default exists)`                  |
| 5     | Read exact command value from scripts (e.g. `"tsc"` not `"tsc --noEmit"`). Never infer. |

## Error Handling

| Error                | Action                                                |
| -------------------- | ----------------------------------------------------- |
| No package manager   | Report "Manual setup"                                 |
| No env example       | Skip to code-only env var detection (Phase 3c)        |
| No README            | Generate minimal guide                                |
| Malformed JSON       | Log parse error for file, skip that config source     |
| Invalid config       | Log error with file path, continue with other sources |
| No architecture file | Skip Phase 0, proceed with full detection             |

## Output

Return structured YAML:

```yaml
project_name: <name>
generated_at: <ISO 8601 timestamp>
source: analyzer
meta:
  framework: <detected framework>
  package_manager: <detected package manager>
prerequisites:
  - tool: <tool>
    version: <version>
    required: true/false
installation:
  clone_url: <repo_url>
  install_command: <command>
  post_install_steps:
    - description: <step>
      command: <command>
configuration:
  env_vars:
    - name: <VAR_NAME>
      description: <description>
      required_level: <Yes|No|Conditional (condition)>
      default: <default>
      source_file: <file:line>
      confidence: <verified|inferred>
  config_files:
    - file: <filename>
      purpose: <purpose>
      key_settings:
        - name: <setting>
          value: <value>
running:
  development: <dev_command>
  production: <prod_command>
  dev_url: <URL with correct port from config>
testing:
  command: <test_command>
troubleshooting:
  - issue: <issue>
    solution: <solution>
```

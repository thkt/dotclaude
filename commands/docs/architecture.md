---
description: Generate architecture overview documentation from codebase analysis
aliases: [arch-docs, architecture-docs]
agents:
  - architecture-analyzer
---

# /docs:architecture - Architecture Overview Generation

## Overview

Analyzes codebase and automatically generates architecture overview documentation.

## Usage

```bash
# Analyze current directory
/docs:architecture

# Analyze specific directory
/docs:architecture src/

# Specify output destination
/docs:architecture --output docs/ARCHITECTURE.md
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `path` | Target directory to analyze | Current directory |
| `--output` | Output file path | `.claude/workspace/docs/architecture.md` |
| `--format` | Output format | `markdown` |

## Generated Content

- **Project Overview & Technology Stack**
- **Directory Structure** - Visualization via tree command
- **Module Relationship Diagram** - Mermaid format
- **Key Components List** - Class and function statistics
- **Dependencies** - External/internal dependencies
- **Statistics** - File count, line count, etc.

## Execution Flow

### Phase 1: Project Detection

```bash
# Package manager and config file check
ls package.json pubspec.yaml Cargo.toml go.mod pyproject.toml 2>/dev/null
```

### Phase 2: Directory Structure Analysis

```bash
~/.claude/skills/documenting-architecture/scripts/analyze-structure.sh {path}
```

### Phase 3: Code Structure Analysis

```bash
~/.claude/skills/documenting-architecture/scripts/extract-modules.sh {path}
```

### Phase 4: Mermaid Diagram Generation

```bash
# Module relationship diagram
~/.claude/skills/documenting-architecture/scripts/generate-mermaid.sh {path} module

# Dependency diagram
~/.claude/skills/documenting-architecture/scripts/generate-mermaid.sh {path} dependency
```

### Phase 5: Document Generation

Embed analysis results into template (`~/.claude/skills/documenting-architecture/assets/architecture-template.md`)
and generate Markdown documentation.

## Output Example

```markdown
# Project Name - Architecture Overview

## Technology Stack
| Category | Technology |
|----------|------------|
| Language | TypeScript |
| Framework | React |
| Build Tool | Vite |

## Directory Structure
├── src/
│   ├── components/
│   ├── hooks/
│   └── utils/

## Module Structure
(Mermaid diagram)

## Statistics
- Total files: 150
- Total lines: 12,000
```

## Required Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| tree-sitter-analyzer | Code structure analysis | `uv tool install "tree-sitter-analyzer[popular]"` |
| tree | Directory structure | `brew install tree` |
| jq | JSON processing | `brew install jq` |

## Error Handling

| Error | Action |
|-------|--------|
| tree-sitter-analyzer not installed | Execute fallback analysis |
| Target directory not found | Display error message |
| Only unsupported languages | Output statistics only |

## Related

- **Agent**: `architecture-analyzer`

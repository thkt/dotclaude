# Architecture Template

## Structure

```markdown
# <project_name> - Architecture Overview

## Technology Stack

| Category  | Technology  |
| --------- | ----------- |
| Language  | <language>  |
| Framework | <framework> |
| Database  | <database>  |

## Directory Structure

\`\`\`
<tree output>
\`\`\`

## Module Structure

\`\`\`mermaid
graph TD
A[Module A] --> B[Module B]
A --> C[Module C]
\`\`\`

## Key Components

| Component | Path   | Description   |
| --------- | ------ | ------------- |
| <name>    | <path> | <description> |

## Dependencies

### External

- <package>: <purpose>

### Internal

- <module> → <module>: <relationship>

## Statistics

| Metric | Value   |
| ------ | ------- |
| Files  | <count> |
| Lines  | <count> |
```

## Guidelines

| Section             | Description                                         |
| ------------------- | --------------------------------------------------- |
| Technology Stack    | Languages, frameworks, databases used               |
| Directory Structure | Project layout from tree command                    |
| Module Structure    | Mermaid diagram showing relationships               |
| Key Components      | Important classes/functions                         |
| Dependencies        | External packages and internal module relationships |

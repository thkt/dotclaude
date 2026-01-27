# Architecture Template

## Structure

```markdown
# {project_name} - Architecture Overview

## Technology Stack

| Category  | Technology                  | Version                        |
| --------- | --------------------------- | ------------------------------ |
| Language  | {tech_stack.language.name}  | {tech_stack.language.version}  |
| Framework | {tech_stack.framework.name} | {tech_stack.framework.version} |
| Runtime   | {tech_stack.runtime.name}   | {tech_stack.runtime.version}   |
| Database  | {tech_stack.database.name}  | {tech_stack.database.version}  |

## Directory Structure

\`\`\`
{directory_structure}
\`\`\`

## Module Structure

\`\`\`mermaid
{mermaid_diagram}
\`\`\`

## Key Components

| Component               | Path                    | Description                    |
| ----------------------- | ----------------------- | ------------------------------ |
| {key_components[].name} | {key_components[].path} | {key_components[].description} |

## Dependencies

### External

- {dependencies.external[].name}: {dependencies.external[].purpose}

### Internal

- {dependencies.internal[].from} → {dependencies.internal[].to}: {dependencies.internal[].relationship}

## Statistics

| Metric | Value              |
| ------ | ------------------ |
| Files  | {statistics.files} |
| Lines  | {statistics.lines} |
```

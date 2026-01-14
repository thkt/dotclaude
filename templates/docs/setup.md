# Setup Template

## Structure

```markdown
# <project_name> - Setup Guide

## Prerequisites

| Tool   | Version   | Required |
| ------ | --------- | -------- |
| <tool> | <version> | Yes/No   |

## Installation

\`\`\`bash

# Clone repository

git clone <repo_url>
cd <project_name>

# Install dependencies

<install_command>
\`\`\`

## Configuration

### Environment Variables

| Variable   | Description   | Default   |
| ---------- | ------------- | --------- |
| <VAR_NAME> | <description> | <default> |

### Config Files

| File       | Purpose   |
| ---------- | --------- |
| <filename> | <purpose> |

## Running

### Development

\`\`\`bash
<dev_command>
\`\`\`

### Production

\`\`\`bash
<prod_command>
\`\`\`

## Testing

\`\`\`bash
<test_command>
\`\`\`

## Troubleshooting

| Issue   | Solution   |
| ------- | ---------- |
| <issue> | <solution> |
```

## Guidelines

| Section         | Description                            |
| --------------- | -------------------------------------- |
| Prerequisites   | Required tools with versions           |
| Installation    | Step-by-step install commands          |
| Configuration   | Environment variables and config files |
| Running         | Dev and production startup commands    |
| Testing         | How to run tests                       |
| Troubleshooting | Common issues and solutions            |

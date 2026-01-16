# Setup Template

## Structure

```markdown
# {project_name} - Setup Guide

## Prerequisites

| Tool                   | Version                   | Required                   |
| ---------------------- | ------------------------- | -------------------------- |
| {prerequisites[].tool} | {prerequisites[].version} | {prerequisites[].required} |

## Installation

\`\`\`bash

# Clone repository

git clone {installation.clone_url}
cd {project_name}

# Install dependencies

{installation.install_command}
\`\`\`

## Configuration

### Environment Variables

| Variable                        | Description                            | Default                            |
| ------------------------------- | -------------------------------------- | ---------------------------------- |
| {configuration.env_vars[].name} | {configuration.env_vars[].description} | {configuration.env_vars[].default} |

### Config Files

| File                                | Purpose                                |
| ----------------------------------- | -------------------------------------- |
| {configuration.config_files[].file} | {configuration.config_files[].purpose} |

## Running

### Development

\`\`\`bash
{running.development}
\`\`\`

### Production

\`\`\`bash
{running.production}
\`\`\`

## Testing

\`\`\`bash
{testing.command}
\`\`\`

## Troubleshooting

| Issue                     | Solution                     |
| ------------------------- | ---------------------------- |
| {troubleshooting[].issue} | {troubleshooting[].solution} |
```

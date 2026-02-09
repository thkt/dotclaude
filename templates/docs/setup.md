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

{installation.post_install_steps? (foreach)}
\`\`\`bash
# {installation.post_install_steps[].description}
{installation.post_install_steps[].command}
\`\`\`
{/foreach}

## Configuration

### Environment Variables

| Variable                        | Description                            | Required                                  | Default                            | Source                                 |
| ------------------------------- | -------------------------------------- | ----------------------------------------- | ---------------------------------- | -------------------------------------- |
| {configuration.env_vars[].name} | {configuration.env_vars[].description} | {configuration.env_vars[].required_level} | {configuration.env_vars[].default} | {configuration.env_vars[].source_file} |

### Config Files

| File                                | Purpose                                |
| ----------------------------------- | -------------------------------------- |
| {configuration.config_files[].file} | {configuration.config_files[].purpose} |

{configuration.config_files[].key_settings? (foreach)}
**{configuration.config_files[].file}**:
| Setting                                             | Value                                              |
| --------------------------------------------------- | -------------------------------------------------- |
| {configuration.config_files[].key_settings[].name}  | {configuration.config_files[].key_settings[].value} |
{/foreach}

## Running

### Development

\`\`\`bash
{running.development}
\`\`\`

{running.dev_url?}
Access: {running.dev_url}
{/dev_url}

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

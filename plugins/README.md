# External Plugins

Installation guide for external plugins integrated into the workflow.

## Installed Plugins

| Plugin                 | Marketplace             | Purpose                   |
| ---------------------- | ----------------------- | ------------------------- |
| feature-dev            | claude-plugins-official | Feature development guide |
| pr-review-toolkit      | claude-plugins-official | PR review assistance      |
| ralph-loop             | claude-plugins-official | Iterative execution loop  |
| hookify                | claude-plugins-official | Hook creation assistance  |
| code-simplifier        | claude-plugins-official | Code simplification       |
| security-guidance      | claude-plugins-official | Security guidance         |
| a11y-specialist-skills | a11y-specialist-skills  | Accessibility review      |

## Installation

### 1. Official Plugins (claude-plugins-official)

```bash
# Add marketplace (first time only)
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/claude-code-plugins/refs/heads/main/marketplace.json

# Install each plugin
claude plugins install feature-dev
claude plugins install pr-review-toolkit
claude plugins install ralph-loop
claude plugins install hookify
claude plugins install code-simplifier
claude plugins install security-guidance
```

### 2. Accessibility Skills

```bash
# Add marketplace
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/a11y-specialist-skills/refs/heads/main/marketplace.json

# Install
claude plugins install a11y-specialist-skills
```

## Batch Install Script

```bash
#!/bin/bash
# install-plugins.sh

# Add marketplaces
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/claude-code-plugins/refs/heads/main/marketplace.json
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/a11y-specialist-skills/refs/heads/main/marketplace.json

# Install plugins
claude plugins install feature-dev
claude plugins install pr-review-toolkit
claude plugins install ralph-loop
claude plugins install hookify
claude plugins install code-simplifier
claude plugins install security-guidance
claude plugins install a11y-specialist-skills
```

## Key Commands

| Command         | Plugin            | Purpose                   |
| --------------- | ----------------- | ------------------------- |
| `/feature-dev`  | feature-dev       | Feature development guide |
| `/review-pr`    | pr-review-toolkit | Comprehensive PR review   |
| `/ralph-loop`   | ralph-loop        | Start iterative execution |
| `/cancel-ralph` | ralph-loop        | Stop loop                 |
| `/hookify`      | hookify           | Generate hooks from chat  |
| `/hookify list` | hookify           | List rules                |
| `/polish`       | code-simplifier   | Code simplification       |
| `/a11y-review`  | a11y-specialist   | Accessibility review      |

## Plugin Management

```bash
# List installed plugins
claude plugins list

# Uninstall plugin
claude plugins uninstall <plugin-name>

# List marketplaces
claude plugins marketplace list
```

## Notes

- `plugins/` directory is excluded in .gitignore
- Plugin cache stored in `plugins/cache/`
- Enable/disable via `enabledPlugins` in settings.json

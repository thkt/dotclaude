# External Plugins

Installation guide for external plugins integrated into the workflow.

## Installed Plugins

| Plugin                 | Marketplace             | Purpose                  |
| ---------------------- | ----------------------- | ------------------------ |
| ralph-loop             | claude-plugins-official | Iterative execution loop |
| a11y-specialist-skills | a11y-specialist-skills  | Accessibility review     |

## Installation

### 1. Official Plugins (claude-plugins-official)

```bash
# Add marketplace (first time only)
claude plugins marketplace add https://raw.githubusercontent.com/anthropics/claude-code-plugins/refs/heads/main/marketplace.json

# Install each plugin
claude plugins install ralph-loop
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
claude plugins install ralph-loop
claude plugins install a11y-specialist-skills
```

## Key Commands

| Command         | Plugin          | Purpose                   |
| --------------- | --------------- | ------------------------- |
| `/ralph-loop`   | ralph-loop      | Start iterative execution |
| `/cancel-ralph` | ralph-loop      | Stop loop                 |
| `/a11y-review`  | a11y-specialist | Accessibility review      |

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

# Claude AI Configuration

A comprehensive configuration system for Claude AI with custom commands,
development principles, and workflow optimizations.

📌 **[日本語版](./.ja/README.md)**

## 🎯 Overview

This repository contains personal configurations for Claude AI, including:

- Custom slash commands for systematic development workflows (9 skills)
- A specialized AI agent that challenges design proposals (1 agent)
- Core AI operation principles and development best practices
- Six quality pipeline binaries, none of them wired
  command
- Japanese language support

## 📁 Structure

```text
.claude/
├── CLAUDE.md              # Main configuration (AI reads this)
├── README.md              # This file - Quick start guide
├── rules/                 # Rule definitions
│   ├── core/             # Core AI operation principles
│   ├── conventions/      # Documentation conventions
│   └── development/      # Development patterns & methodologies
├── skills/               # Skill-based knowledge modules (9 skills)
├── agents/               # Specialized AI agents (1 agent)
│   └── critics/          # Design proposal challenger (critic-design)
├── docs/                  # Design docs & guides (DRs under decisions/)
├── hooks/                 # Pre/Post tool-use hooks
├── output-styles/         # Output style definitions
├── .claude-plugin/        # Plugin marketplace config
└── .ja/                   # Japanese translations
```

## 🚀 Quick Start

### Option 1: Install as Claude Code Plugin (Recommended)

This repository is available as a Claude Code plugin, allowing you to easily
install specific workflow sets:

1. **Add this repository as a marketplace**:

   ```bash
   /plugin marketplace add thkt/dotclaude
   ```

2. **Browse available plugins**:

   ```bash
   /plugin
   ```

3. **Install the plugin**:

   ```bash
   /plugin install build
   ```

#### Available Plugins

- **build**: Self-contained development workflow toolkit. Installing it clones
  the whole repository once, so every skill, agent, and workflow loads under the
  build: namespace. Settle the requirements into an agreed Issue with /scoping,
  then hand the Issue to /implement, which carries it through the implement
  workflow to implementation, verification, a draft PR, and CI confirmation.
  Bundles the critic-design agent, the implement workflow, and /sweep,
  /outcome, /dr, /scribe.

### Option 2: Manual Installation (Full Configuration)

For using this as your personal `.claude` configuration:

1. Clone this repository to your home directory:

   ```bash
   git clone https://github.com/thkt/dotclaude.git ~/.claude
   ```

2. Or if you already have a `.claude` directory, back it up first:

   ```bash
   mv ~/.claude ~/.claude.backup
   git clone https://github.com/thkt/dotclaude.git ~/.claude
   ```

**Note**: Manual installation applies all skills, agents, rules, and personal
configuration. Plugin installation also clones the whole repository, but Claude
Code loads only its skills, agents, and workflows; personal `CLAUDE.md`,
`rules/`, and `settings.json` are not applied as rules or settings. A skill that
cites `rules/` reads the copy inside the plugin.

## 📦 Dependencies & Setup

### Sandbox Feature (Optional but Recommended)

Claude Code's sandbox feature provides secure command execution with automatic
permission handling, reducing approval fatigue while maintaining safety.

#### System Requirements

- macOS or Linux (Windows not yet supported)
- Node.js with npm/npx
- ripgrep (typically pre-installed)
- jq (used by the status line script): `brew install jq`

#### Setup

```bash
# 1. Install sandbox runtime
npm install -g @anthropic-ai/sandbox-runtime

# 2. Verify installation
srt --version

# 3. Enable in Claude Code
# Run this command in Claude Code session:
/sandbox
# Select option 1: "Sandbox BashTool, with auto-allow in accept edits mode"
```

#### What it does

- Restricts file system access to allowed directories
- Controls network access via proxy
- Auto-executes safe commands in sandbox
- Requests approval only when sandbox restrictions are hit

#### Configuration (optional)

Create `~/.srt-settings.json` for custom settings:

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker"],
    "network": {
      "allowLocalBinding": true,
      "httpProxyPort": 8080
    }
  }
}
```

On macOS with the sandbox enabled, running `gh` inside the sandbox requires `sandbox.enableWeakerNetworkIsolation: true` in `~/.claude/settings.json` for its TLS verification.

### Hook Tools (Recommended)

`settings.json` wires not one binary in this family, so none of them runs
automatically (DR-0121, DR-0122). The TypeScript hooks under `hooks/` are not
wired either (DR-0123). CI and the workflows carry the quality enforcement.
Installing them is optional, and the table below
records what each one carried.

```bash
brew tap thkt/tap
```

| Tool       | What it carried                                      |
| ---------- | ---------------------------------------------------- |
| guardrails | Lint (oxlint) and security checks before Write/Edit  |
| formatter  | Formatting (oxfmt)                                   |
| gates      | Quality gates (knip, tsgo, madge)                    |
| assay      | Spec document quality validation                     |
| reviews    | Static-analysis command                              |
| shields    | Command guard, file ACL, secrets check               |

See [thkt/tap](https://github.com/thkt/homebrew-tap) for details.

### External CLI Tools (Optional)

Some commands use external CLI tools for data source integration.

| Tool        | Required By                           | Purpose                                                      | Install                            |
| ----------- | ------------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| `gh`        | `/scoping`, `/implement`              | GitHub API access                                            | `brew install gh && gh auth login` |
| `scout`     | `/scoping`, use-cli-scout skill       | Web search, page fetch, GitHub repo exploration, Slack fetch | `brew install thkt/tap/scout`      |

**Slack reading**: `scout fetch <slack-url>` reads any Slack message/thread URL
directly. No additional setup needed if scout is configured.

## 📝 Available Commands

See the complete command reference:

- [English Command Reference](./docs/COMMANDS.md)
- [日本語コマンドリファレンス](./.ja/docs/COMMANDS.md)

## 🔄 Standard Workflows

### Feature Development

```txt
/scoping → /implement
```

### Bug Investigation & Fix

```txt
/scoping → /implement
```

## 🌏 Language Support

- **AI Processing**: English internally
- **User Output**: Japanese (configurable)
- **Documentation**: README.md and `docs/*.md` are available in English and Japanese; the seven `docs/wiki/*.md` files are English-only

## 🛠️ Key Features

### Core AI Principles

- **Safety First**: File deletion uses trash (`~/.Trash/`), destructive
  operations require confirmation
- **User Authority**: Your instructions are the ultimate authority
- **Output Verifiability**: Confirm exact formats by reading files, never assert
  about unread code, and stop when a knowledge gap blocks critical verification

### Development Approach

- **Occam's Razor**: Choose the simplest solution that works
- **Progressive Enhancement**: Build simple, enhance gradually
- **TDD/RGRC**: Red-Green-Refactor-Commit cycle for reliable code

Full details: [PRINCIPLES.md](./rules/PRINCIPLES.md)

## 📚 Documentation

### Core Documentation

- [Design Philosophy](./docs/DESIGN.md) - **Why this design** (設計思想・意図)
- [SPEC](./docs/SPEC.md) - Execution contract of hooks, skills, agents, and workflows
- [Commands Reference (English)](./docs/COMMANDS.md)
- [Commands Reference (Japanese)](./.ja/docs/COMMANDS.md)
- [Configuration Guide](./CLAUDE.md)
- [Japanese Configuration](./.ja/CLAUDE.md)

### Development Guides

- [Principles Guide](./rules/PRINCIPLES.md) - Complete overview of all
  development principles
- [Markdown Conventions](./rules/conventions/MARKDOWN.md) - Markdown writing
  and reference rules

## 🤝 Contributing

Feel free to fork this repository and customize it for your needs. Pull requests
for improvements are welcome!

## 📜 License

MIT License - Feel free to use and modify as needed.

## 👤 Author

thkt

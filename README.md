# Claude AI Configuration

A comprehensive configuration system for Claude AI with custom commands,
development principles, and workflow optimizations.

📌 **[日本語版](./.ja/README.md)**

## 🎯 Overview

This repository contains personal configurations for Claude AI, including:

- Custom slash commands for systematic development workflows
- Core AI operation principles and development best practices
- Progressive Enhancement and code readability guidelines
- Japanese language support

## 📁 Structure

```text
.claude/
├── CLAUDE.md              # Main configuration (AI reads this)
├── README.md              # This file - Quick start guide
├── adr/                   # Architecture Decision Records
├── commands/              # Command definitions (/code, /fix, /think, etc.)
├── rules/                 # Rule definitions
│   ├── core/             # Core AI operation principles
│   ├── conventions/      # Documentation conventions
│   ├── development/      # Development patterns & methodologies
│   └── workflows/        # Workflow guides
├── skills/               # Skill-based knowledge modules (26 skills)
├── agents/               # Specialized AI agents (35 agents)
│   ├── analyzers/        # Architecture & code analyzers
│   ├── architects/       # Feature architecture designers
│   ├── critics/          # Finding challengers (devils-advocate)
│   ├── enhancers/        # Code enhancers & simplifiers
│   ├── explorers/        # Codebase exploration agents
│   ├── generators/       # Code/test/git generators
│   ├── resolvers/        # Build error resolvers
│   ├── reviewers/        # Code review agents (16 reviewers)
│   └── teams/            # Integrators & implementers
├── docs/                  # Design docs & guides
├── templates/             # Prompt templates (audit, docs, sow, etc.)
├── hooks/                 # Pre/Post tool-use hooks
├── scripts/               # Utility scripts
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
   /plugin marketplace add thkt/claude-config
   ```

2. **Browse available plugins**:

   ```bash
   /plugin
   ```

3. **Install specific plugin** (choose one or more):

   ```bash
   /plugin install complete-workflow-system  # Full TDD/RGRC workflow
   /plugin install quick-actions             # /fix, /polish
   /plugin install git-utilities             # /commit, /branch, /pr, /issue
   /plugin install documentation-tools       # /adr, /docs
   /plugin install browser-workflows         # /e2e
   ```

**Available Plugins**:

- **complete-workflow-system**: Full development workflow with 35 specialized
  agents
- **quick-actions**: Fast bug fixes (/fix) and AI slop removal (/polish)
- **git-utilities**: Git workflow helpers (commit, branch, PR, issue)
- **documentation-tools**: ADR creation and docs
- **browser-workflows**: E2E testing and automation
- **development-skills**: 26 skills for TDD, principles, patterns, security, and
  more

### Option 2: Manual Installation (Full Configuration)

For using this as your personal `.claude` configuration:

1. Clone this repository to your home directory:

   ```bash
   git clone https://github.com/thkt/.claude ~/.claude
   ```

2. Or if you already have a `.claude` directory, back it up first:

   ```bash
   mv ~/.claude ~/.claude.backup
   git clone https://github.com/thkt/.claude ~/.claude
   ```

**Note**: Manual installation includes all commands, agents, rules, and personal
configurations. Plugin installation only includes shared commands and agents
(excludes personal `CLAUDE.md`, `rules/`, and `settings.json`).

## 📦 Dependencies & Setup

### Sandbox Feature (Optional but Recommended)

Claude Code's sandbox feature provides secure command execution with automatic
permission handling, reducing approval fatigue while maintaining safety.

**System Requirements**:

- macOS or Linux (Windows not yet supported)
- Node.js with npm/npx
- ripgrep (typically pre-installed)
- jaq (for IDR hooks): `brew install jaq`

**Setup**:

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

**What it does**:

- ✅ Restricts file system access to allowed directories
- ✅ Controls network access via proxy
- ✅ Auto-executes safe commands in sandbox
- ✅ Requests approval only when sandbox restrictions are hit

**Configuration** (optional):

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

See the
[official blog post](https://azukiazusa.dev/blog/claude-code-sandbox-feature/)
for more details.

### External CLI Tools (Optional)

Some commands use external CLI tools for data source integration:

| Tool          | Required By         | Purpose               | Install                                                   |
| ------------- | ------------------- | --------------------- | --------------------------------------------------------- |
| `gh`          | `/inbox` (GitHub)   | GitHub API access     | `brew install gh && gh auth login`                        |
| `gemini`      | `/inbox` (Calendar) | Google Calendar query | [Gemini CLI](https://github.com/google-gemini/gemini-cli) |
| `SLACK_TOKEN` | `/inbox` (Slack)    | Slack API access      | See below                                                 |

**Slack setup**:

1. Create a [Slack App](https://api.slack.com/apps) and add `search:read` to
   User Token Scopes
2. Obtain the User OAuth Token (`xoxp-...`)
3. Set environment variables:

   ```bash
   export SLACK_TOKEN="xoxp-..."
   export SLACK_WORKSPACE="your-workspace"  # the workspace part of {workspace}.slack.com
   ```

### Required Plugins

Some commands depend on external plugins that are not included in this
repository. Install them manually after cloning:

| Plugin       | Required By | Purpose                        | Install Command              |
| ------------ | ----------- | ------------------------------ | ---------------------------- |
| `ralph-loop` | `/code`     | TDD Green Phase auto-iteration | `/plugin install ralph-loop` |

**Quick Install**:

```bash
/plugin install ralph-loop
```

**Note**: Plugins are stored in `~/.claude/plugins/` which is excluded from git.
Each user must install plugins independently.

## 📝 Available Commands

See the complete command reference:

- [English Command Reference](./rules/workflows/WORKFLOW_REFERENCE.md)
- [日本語コマンドリファレンス](./.ja/rules/workflows/WORKFLOW_REFERENCE.md)

## 🔄 Standard Workflows

### Feature Development (Enhanced)

```txt
/research → /think → /code → /test → /audit → /validate
```

### Bug Investigation & Fix

```txt
/research → /fix
```

## 🌏 Language Support

- **AI Processing**: English internally
- **User Output**: Japanese (configurable)
- **Documentation**: Available in both English and Japanese

## 🛠️ Key Features

### Core AI Principles

- **Safety First**: File deletion uses trash (`~/.Trash/`), destructive
  operations require confirmation
- **User Authority**: Your instructions are the ultimate authority
- **Output Verifiability**: Claims backed by evidence (file paths, confidence
  markers ✓/→/?)

### Development Approach

- **Occam's Razor**: Choose the simplest solution that works
- **Progressive Enhancement**: Build simple, enhance gradually
- **TDD/RGRC**: Red-Green-Refactor-Commit cycle for reliable code

Full details: [PRINCIPLES.md](./rules/PRINCIPLES.md)

## 📚 Documentation

### Core Documentation

- [Design Philosophy](./docs/DESIGN.md) — **Why this design** (設計思想・意図)
- [Commands Reference (English)](./rules/workflows/WORKFLOW_REFERENCE.md)
- [Commands Reference (Japanese)](./.ja/rules/workflows/WORKFLOW_REFERENCE.md)
- [Configuration Guide](./CLAUDE.md)
- [Japanese Configuration](./.ja/CLAUDE.md)

### Development Guides

- [Principles Guide](./rules/PRINCIPLES.md) - Complete overview of all
  development principles
- [Documentation Rules](./rules/conventions/DOCUMENTATION.md) - Standards for
  documentation

## 🤝 Contributing

Feel free to fork this repository and customize it for your needs. Pull requests
for improvements are welcome!

## 📜 License

MIT License - Feel free to use and modify as needed.

## 👤 Author

thkt

---

_This configuration enhances Claude AI's capabilities for systematic software
development with a focus on quality, readability, and maintainability._

# Claude AI Configuration

A comprehensive configuration system for Claude AI with custom commands,
development principles, and workflow optimizations.

📌 **[日本語版](./.ja/README.md)**

## 🎯 Overview

This repository contains personal configurations for Claude AI, including:

- Custom slash commands for systematic development workflows (25 skills)
- Specialized AI agents for code review, generation, and analysis (27 agents)
- Core AI operation principles and development best practices
- Quality pipeline hooks (guardrails, formatter, reviews, gates)
- Japanese language support

## 📁 Structure

```text
.claude/
├── CLAUDE.md              # Main configuration (AI reads this)
├── README.md              # This file - Quick start guide
├── rules/                 # Rule definitions
│   ├── core/             # Core AI operation principles
│   ├── conventions/      # Documentation conventions
│   ├── development/      # Development patterns & methodologies
│   ├── frameworks/       # Framework-specific rules
│   └── workflows/        # Workflow guides
├── skills/               # Skill-based knowledge modules (25 skills)
├── agents/               # Specialized AI agents (27 agents)
│   ├── critics/          # Finding challengers (devils-advocate)
│   ├── enhancers/        # Code enhancers & simplifiers
│   ├── explorers/        # Codebase exploration agents
│   ├── generators/       # Code/test/git generators
│   ├── resolvers/        # Build error resolvers
│   └── reviewers/        # Code review agents (18 reviewers)
├── docs/                  # Design docs & guides (ADRs under decisions/)
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

**Available Plugins**:

- **build**: Self-contained development workflow toolkit. Installing it clones
  the whole repository once, so every skill, agent, and workflow loads under the
  build: namespace. Refine an issue with /issue, hand the issue number to the
  build workflow, and get a draft PR after Load / Code / Audit / Polish / Ship.
  Bundles the planning skills (/think, /research, /slice, /outcome), the reviewer
  and critic agents, the code / audit / polish / shake / assert / adrift
  workflows, the git skills (/commit, /checkout, /pr), and /adr, /census.

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

### Hook Tools (Recommended)

Quality pipeline hooks that run automatically during Claude Code sessions. These
catch lint errors, format code, inject static analysis, and enforce quality
gates - all without manual intervention.

```bash
brew tap thkt/tap
brew install guardrails formatter reviews gates
```

| Tool       | Hook        | Timing            | Role                              |
| ---------- | ----------- | ----------------- | --------------------------------- |
| guardrails | PreToolUse  | Before Write/Edit | Lint (oxlint) + security checks   |
| formatter  | PostToolUse | After Write/Edit  | Auto-format (oxfmt)               |
| reviews    | PreToolUse  | Before Skill      | Static analysis context injection |
| gates      | Stop        | Agent completion  | Quality gates (knip, tsgo, madge) |

Per-project configuration is done via `.claude/tools.json`. See
[thkt/tap](https://github.com/thkt/homebrew-tap) for details.

### External CLI Tools (Optional)

Some commands use external CLI tools for data source integration:

| Tool          | Required By         | Purpose               | Install                               |
| ------------- | ------------------- | --------------------- | ------------------------------------- |
| `gh`          | `/inbox` (GitHub)   | GitHub API access     | `brew install gh && gh auth login`    |
| `agy`         | `/inbox` (Calendar) | Google Calendar query | `brew install --cask antigravity-cli` |
| `scout`       | Slack URL reading   | Slack message fetch   | `brew install thkt/tap/scout`         |
| `SLACK_TOKEN` | `/inbox` (Slack)    | Slack search API      | See below                             |

**Slack reading**: `scout fetch <slack-url>` reads any Slack message/thread URL
directly. No additional setup needed if scout is configured.

**Slack search** (for `/inbox`):

1. Create a [Slack App](https://api.slack.com/apps) and add `search:read` to
   User Token Scopes
2. Obtain the User OAuth Token (`xoxp-...`)
3. Set environment variables:

   ```bash
   export SLACK_TOKEN="xoxp-..."
   export SLACK_WORKSPACE="your-workspace"  # the workspace part of {workspace}.slack.com
   ```

### Autonomous Iteration

`/code` can run as an autonomous multi-turn loop via the native `/goal` command
(Claude Code 2.1.139+). No plugin install is required.

```bash
/goal all tests pass and lint is clean
```

Wrap a `/code` session in `/goal <condition>`; Claude continues until a fast
model judges the condition met from the conversation.

## 📝 Available Commands

See the complete command reference:

- [English Command Reference](./docs/COMMANDS.md)
- [日本語コマンドリファレンス](./.ja/docs/COMMANDS.md)

## 🔄 Standard Workflows

### Feature Development (Enhanced)

```txt
/research → /think → /code → /audit
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

- [Design Philosophy](./docs/DESIGN.md) - **Why this design** (設計思想・意図)
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

---

_This configuration enhances Claude AI's capabilities for systematic software
development with a focus on quality, readability, and maintainability._

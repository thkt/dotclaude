# Claude AI Configuration

A comprehensive configuration system for Claude AI with custom commands, development principles, and workflow optimizations.

📌 **[日本語版](./ja/README.md)**

## 🎯 Overview

This repository contains personal configurations for Claude AI, including:

- Custom slash commands for systematic development workflows
- Core AI operation principles and development best practices
- Progressive Enhancement and code readability guidelines
- Japanese language support

## 📁 Structure

```txt
.claude/
├── CLAUDE.md              # Main configuration (AI reads this)
├── README.md              # This file - Quick start guide
├── docs/                  # Documentation
│   ├── COMMANDS.md       # Command reference (English)
│   └── DOCUMENTATION_RULES.md # Documentation standards
├── commands/              # Command definitions
│   ├── code.md           # TDD/RGRC implementation
│   ├── fix.md            # Quick bug fixes
│   ├── hotfix.md         # Emergency production fixes
│   ├── research.md       # Investigation without implementation
│   ├── review.md         # Code review orchestration
│   ├── test.md           # Comprehensive testing
│   ├── think.md          # Planning & SOW creation
│   └── gemini/
│       └── search.md     # Google search via Gemini
├── rules/                 # English rule definitions
│   ├── core/             # [P0] Core AI operation principles
│   │   └── AI_OPERATION_PRINCIPLES.md
│   ├── PRINCIPLES_GUIDE.md  # Complete principles guide
│   ├── commands/         # Command selection logic
│   ├── development/      # Development patterns & methodologies
│   └── reference/        # Fundamental principles (SOLID, DRY, Occam's Razor)
├── skills/               # Skill-based knowledge modules
│   ├── performance-optimization/  # Web performance knowledge
│   └── esa-daily-report/ # Project-specific automation
└── ja/                    # Japanese translations
    ├── CLAUDE.md         # Main config (Japanese)
    ├── commands/         # Command definitions (Japanese)
    └── rules/            # Rule definitions (Japanese)
```

## 🚀 Quick Start

### Option 1: Install as Claude Code Plugin (Recommended)

This repository is available as a Claude Code plugin, allowing you to easily install specific workflow sets:

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
   /plugin install quick-actions             # /fix and /hotfix
   /plugin install automation-commands       # /auto-test, /full-cycle
   /plugin install git-utilities             # /commit, /branch, /pr
   /plugin install documentation-tools       # /adr, /adr:rule
   /plugin install browser-workflows         # /workflow:create
   /plugin install external-integrations     # /gemini:search
   /plugin install utilities                 # /context
   ```

**Available Plugins**:

- **complete-workflow-system**: Full development workflow with 16 specialized agents
- **quick-actions**: Fast bug fixes (/fix) and emergency hotfixes (/hotfix)
- **automation-commands**: Auto-test and full-cycle automation
- **git-utilities**: Git workflow helpers (commit, branch, PR)
- **documentation-tools**: ADR creation and rule generation
- **browser-workflows**: E2E testing and automation
- **external-integrations**: Gemini search integration
- **utilities**: Development diagnostics tools

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

**Note**: Manual installation includes all commands, agents, rules, and personal configurations. Plugin installation only includes shared commands and agents (excludes personal `CLAUDE.md`, `rules/`, and `settings.json`).

## 📦 Dependencies & Setup

### Sandbox Feature (Optional but Recommended)

Claude Code's sandbox feature provides secure command execution with automatic permission handling, reducing approval fatigue while maintaining safety.

**System Requirements**:

- macOS or Linux (Windows not yet supported)
- Node.js with npm/npx
- ripgrep (typically pre-installed)

**Quick Setup**:

```bash
# Automated setup (recommended)
~/.claude/scripts/setup-sandbox.sh
```

**Manual Setup**:

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

See the [official blog post](https://azukiazusa.dev/blog/claude-code-sandbox-feature/) for more details.

## 📝 Available Commands

### Core Development Commands

| Command | Purpose | Environment |
|---------|---------|-------------|
| `/think` | Verifiable SOW creation with validation | Analysis phase |
| `/research` | Investigation without implementation | Understanding phase |
| `/code` | TDD/RGRC implementation | Development phase |
| `/test` | Comprehensive testing | Verification phase |
| `/review` | Code review via agents | Quality phase |
| `/sow` | Display SOW progress | Monitoring phase |
| `/validate` | Validate SOW conformance | Verification phase |

### Quick Action Commands

| Command | Purpose | Environment | Combines |
|---------|---------|-------------|----------|
| `/fix` | Quick bug fixes | 🔧 Development | think → code → test |
| `/hotfix` | Emergency production fixes | 🚨 Production | Minimal process |

### Automation Commands (SlashCommand Tool v1.0.123+)

| Command | Purpose | Environment |
|---------|---------|-------------|
| `/auto-test` | Auto test runner with conditional fix | 🔧 Development |
| `/full-cycle` | Complete development cycle automation | 🔄 Meta-command |

### Documentation Commands

| Command | Purpose | Environment |
|---------|---------|-------------|
| `/adr [title]` | Create Architecture Decision Record in MADR format | 📝 Documentation |
| `/adr:rule <number>` | Generate project rule from ADR | 📝 Documentation |

### External Tool Commands

| Command | Purpose | Requires |
|---------|---------|----------|
| `/gemini:search` | Google search via Gemini | Gemini CLI |

## 🔄 Standard Workflows

### Feature Development (Enhanced)

```txt
/research → /think → /code → /test → /review → /validate
```

### Progress Monitoring

```txt
/sow (check progress anytime)
```

### Bug Investigation & Fix

```txt
/research → /fix
```

### Emergency Response

```txt
/hotfix (standalone for critical issues)
```

### Automated Workflows (New with SlashCommand Tool)

```txt
/auto-test        # Automatic test → fix cycle
/full-cycle       # Complete automated development flow
```

## 🌏 Language Support

- **AI Processing**: English internally
- **User Output**: Japanese (configurable)
- **Documentation**: Available in both English and Japanese

## 🛠️ Key Features

### Core AI Operation Principles

- **Safety First**: Maintain safety boundaries for destructive operations
- **User Authority**: User instructions are the ultimate authority
- **Workflow Integration**: Follow PRE_TASK_CHECK for structured operations
- **Output Verifiability**: Ensure outputs are verifiable and transparent
  - Distinguish between facts and assumptions
  - Provide evidence for claims (file paths, line numbers, references)
  - Explicitly state confidence levels when uncertain

### Development Principles

- **Occam's Razor**: Choose the simplest solution that works (meta-principle)
- **Progressive Enhancement**: CSS-first approach, build simple → enhance
- **Code Readability**: Based on "The Art of Readable Code"
- **Container/Presentational**: React component pattern
- **SOLID, DRY, TDD/RGRC**: Industry best practices
- **Comprehensive Guide**: See [PRINCIPLES_GUIDE.md](./rules/PRINCIPLES_GUIDE.md) for all principles

### Safety Features

- File deletion uses trash (`~/.Trash/`) instead of permanent deletion
- Pre-task understanding checks with confidence level markers (✓/→/?)
- User confirmation required for file modifications
- Execution planning before destructive operations

## 📚 Documentation

### Core Documentation

- [Commands Reference (English)](./docs/COMMANDS.md)
- [Commands Reference (Japanese)](./ja/docs/COMMANDS.md)
- [System Architecture](./docs/ARCHITECTURE.md)
- [Configuration Guide](./CLAUDE.md)
- [Japanese Configuration](./ja/CLAUDE.md)

### Development Guides

- [Principles Guide](./rules/PRINCIPLES_GUIDE.md) - Complete overview of all development principles
- [Documentation Rules](./docs/DOCUMENTATION_RULES.md) - Standards for documentation

## 🤝 Contributing

Feel free to fork this repository and customize it for your needs. Pull requests for improvements are welcome!

## 📜 License

MIT License - Feel free to use and modify as needed.

## 📅 Recent Updates

**2025-10-02** - Documentation Synchronization & Core Rules Enhancement

- Added [P0] Core AI Operation Rules to all documentation
- Synchronized English and Japanese versions completely
- Added Output Verifiability principle with confidence markers
- Enhanced PRE_TASK_CHECK with verifiable output requirements
- Added Mermaid principle dependency graph to PRINCIPLES_GUIDE.md

**2025-01-09** - Documentation Enhancement

- Added comprehensive [PRINCIPLES_GUIDE.md](./rules/PRINCIPLES_GUIDE.md) for all development principles
- Reorganized `rules/` directory structure (reference → development)
- Standardized terminology across all documentation (Core Philosophy, Core Principles)
- Added principle references to all agents and commands
- Improved consistency between English and Japanese versions

## 👤 Author

Your Name

---

*This configuration enhances Claude AI's capabilities for systematic software development with a focus on quality, readability, and maintainability.*

# Claude AI Configuration

A comprehensive configuration system for Claude AI with custom commands, development principles, and workflow optimizations.

📌 **[日本語版](./ja/README.md)**

## 🎯 Overview

This repository contains personal configurations for Claude AI, including:

- Custom slash commands for systematic development workflows
- Development principles (SOLID, DRY, TDD/RGRC)
- Progressive Enhancement and code readability guidelines
- Japanese language support

## 📁 Structure

```txt
.claude/
├── CLAUDE.md              # Main configuration (AI reads this)
├── README.md              # This file - Quick start guide
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md   # System architecture
│   ├── COMMANDS.md       # Command reference (English)
│   ├── MODEL_SELECTION.md # Model selection guidelines
│   ├── AGENT_USAGE.md    # Agent usage documentation
│   └── PROJECT_SETUP.md  # Project setup guide
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
│   ├── core/             # Core AI principles
│   ├── commands/         # Command selection logic
│   ├── development/      # Development patterns & methodologies
│   └── reference/        # Additional reference principles
└── ja/                    # Japanese translations
    ├── CLAUDE.md         # Main config (Japanese)
    ├── commands/         # Command definitions (Japanese)
    └── rules/            # Rule definitions (Japanese)
```

## 🚀 Quick Start

### Installation

1. Clone this repository to your home directory:

   ```bash
   git clone https://github.com/YOUR_USERNAME/claude-config.git ~/.claude
   ```

2. Or if you already have a `.claude` directory, back it up first:

   ```bash
   mv ~/.claude ~/.claude.backup
   git clone https://github.com/YOUR_USERNAME/claude-config.git ~/.claude
   ```

## 📝 Available Commands

### Core Development Commands

| Command | Purpose |
|---------|---------|
| `/think` | Planning & SOW creation |
| `/research` | Investigation without implementation |
| `/code` | TDD/RGRC implementation |
| `/test` | Comprehensive testing |
| `/review` | Code review via agents |

### Quick Action Commands

| Command | Purpose | Environment |
|---------|---------|-------------|
| `/fix` | Quick bug fixes | 🔧 Development |
| `/hotfix` | Emergency production fixes | 🚨 Production |

### External Tool Commands

| Command | Purpose | Requires |
|---------|---------|----------|
| `/gemini:search` | Google search via Gemini | Gemini CLI |

## 🔄 Standard Workflows

### Feature Development

```txt
/think → /research → /code → /test
```

### Bug Investigation & Fix

```txt
/research → /fix
```

### Emergency Response

```txt
/hotfix (standalone for critical issues)
```

## 🌏 Language Support

- **AI Processing**: English internally
- **User Output**: Japanese (configurable)
- **Documentation**: Available in both English and Japanese

## 🛠️ Key Features

### Development Principles

- **Progressive Enhancement**: CSS-first approach, build simple → enhance
- **Code Readability**: Based on "The Art of Readable Code"
- **Container/Presentational**: React component pattern
- **SOLID, DRY, TDD/RGRC**: Industry best practices
- **Comprehensive Guide**: See [PRINCIPLES_GUIDE.md](./docs/PRINCIPLES_GUIDE.md) for all principles

### Safety Features

- File deletion uses trash (`~/.Trash/`) instead of permanent deletion
- Pre-task understanding checks for complex operations
- User confirmation required for file modifications

## 📚 Documentation

### Core Documentation

- [Commands Reference (English)](./docs/COMMANDS.md)
- [Commands Reference (Japanese)](./ja/docs/COMMANDS.md)
- [System Architecture](./docs/ARCHITECTURE.md)
- [Configuration Guide](./CLAUDE.md)
- [Japanese Configuration](./ja/CLAUDE.md)

### Development Guides

- [Principles Guide](./docs/PRINCIPLES_GUIDE.md) - Complete overview of all development principles
- [Documentation Rules](./docs/DOCUMENTATION_RULES.md) - Standards for documentation
- [Project Setup](./docs/PROJECT_SETUP.md) - Getting started guide
- [Model Selection](./docs/MODEL_SELECTION.md) - AI model usage guidelines
- [Agent Usage](./docs/AGENT_USAGE.md) - Working with specialized agents

## 🤝 Contributing

Feel free to fork this repository and customize it for your needs. Pull requests for improvements are welcome!

## 📜 License

MIT License - Feel free to use and modify as needed.

## 📅 Recent Updates

**2025-01-09** - Documentation Enhancement

- Added comprehensive [PRINCIPLES_GUIDE.md](./docs/PRINCIPLES_GUIDE.md) for all development principles
- Reorganized `rules/` directory structure (reference → development)
- Standardized terminology across all documentation (Core Philosophy, Core Principles)
- Added principle references to all agents and commands
- Improved consistency between English and Japanese versions

## 👤 Author

thkt

---

*This configuration enhances Claude AI's capabilities for systematic software development with a focus on quality, readability, and maintainability.*

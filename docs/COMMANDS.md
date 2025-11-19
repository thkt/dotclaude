# Claude Commands Reference

Custom commands for systematic software development support.

## 🎯 Available Commands

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

| Command | Purpose | Environment | Uses SlashCommand |
|---------|---------|-------------|-------------------|
| `/auto-test` | Auto test runner with conditional fix | 🔧 Development | Yes - invokes `/fix` on failure |
| `/full-cycle` | Complete development cycle automation | 🔄 Meta-command | Yes - chains multiple commands |

### Browser Automation Commands

| Command | Purpose | Environment |
|---------|---------|-------------|
| `/workflow:create [name]` | Create reusable browser automation workflows | 🌐 E2E Testing |

### External Tool Commands

| Command | Purpose | Requires |
|---------|---------|----------|
| `/gemini:search` | Google search via Gemini | Gemini CLI |

### Documentation Commands

| Command | Purpose | Environment |
|---------|---------|-------------|
| `/adr [title]` | Create Architecture Decision Record in MADR format | 📝 Documentation |
| `/adr:rule <number>` | Generate project rule from ADR | 📝 Documentation |

## 🔍 Dry-run Impact Simulation

**Automatic safety feature** integrated into PRE_TASK_CHECK workflow.

When confirming file operations or complex changes, Claude Code automatically displays a brief impact simulation before execution:

- **Files to modify**: Lists 2-5 key files
- **Affected components**: Shows impacted modules
- **Risk level**: 🟢 Low / 🟡 Medium / 🔴 High
- **Important notes**: Highlights areas requiring attention

This "Dry-run" approach previews changes without execution, helping you:

- Understand the scope of changes
- Identify potential risks
- Make informed decisions before proceeding

**Workflow integration**:

```txt
1. Understanding Check (理解確認)
2. User Confirmation (Y) ← STOP POINT
3. 🔍 Impact Simulation ← NEW (auto-displayed for risky changes)
4. Execution Plan
5. Plan Confirmation (Y) ← STOP POINT
6. Execute
```

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

## 💡 Command Details

### /think - Verifiable SOW Generator

- Creates verifiable Statement of Work with dynamic validation
- **Generates both SOW and Spec**: sow.md (planning) + spec.md (implementation details)
- Defines acceptance criteria with TodoWrite integration
- Sets validation points and success metrics
- Saves to `.claude/workspace/sow/` with auto-update capability
- Enables progress tracking via `/sow` and `/validate`
- **Spec includes**: Functional requirements, API specs, data models, UI specs, test scenarios

### /research - Investigation

- Explores without implementation
- Uses Task agent for complex searches
- Documents findings persistently
- Efficient parallel search execution

### /code - Implementation

- Follows TDD/RGRC cycle (Red-Green-Refactor-Commit)
- **Auto-references spec.md**: Uses specification as implementation guide
- Applies SOLID principles
- Manual commit execution
- Quality checks via hooks
- **Spec-driven**: Implements functional requirements, follows API specs and data models

### /test - Verification

- Discovers and runs test commands
- Tracks progress with TodoWrite
- Handles unit, integration, E2E tests
- Browser testing for UI changes

### /fix - Quick Fixes

- Streamlined mini-workflow
- For small, well-understood issues
- Development environment only
- Rapid iteration cycle

### /hotfix - Emergency Fixes

- Production critical issues only
- 5-min triage, 15-min fix, 10-min test
- Minimal process overhead
- Rollback plan required

### /review - Code Review

- Orchestrates specialized review agents
- **Auto-references spec.md**: Verifies implementation aligns with specification
- Multiple review dimensions (security, performance, a11y)
- Actionable recommendations
- Priority-based issue reporting
- **Spec verification**: Identifies missing features, API deviations, and requirement gaps

### /sow - Progress Viewer

- Displays current SOW progress status
- Shows acceptance criteria completion
- Tracks key metrics and build status
- Read-only, no options needed
- Quick status check for active work

### /validate - SOW Validator

- Validates implementation against SOW
- L2 (practical) validation level
- Checks acceptance criteria, coverage, performance
- Pass/fail logic with clear scoring
- Identifies missing features and issues

### /auto-test - Automatic Test Runner

- Runs tests automatically after file changes
- Uses SlashCommand tool to invoke `/fix` if tests fail
- Streamlines test-fix cycle
- Can be triggered via hooks in settings.json
- Requires SlashCommand tool v1.0.123+

### /full-cycle - Complete Development Automation

- Meta-command orchestrating entire development flow
- Uses SlashCommand to chain: /research → /think → /code → /test → /review → /validate
- Conditional execution based on results
- Parallel execution support for independent tasks
- TodoWrite integration for progress tracking
- Requires SlashCommand tool v1.0.123+

### /gemini:search - Google Search

- Technical research via Gemini CLI
- Best practices discovery
- Troubleshooting assistance
- Requires Gemini CLI setup

### /adr - Architecture Decision Record Creator

- Creates MADR (Markdown Architecture Decision Records) format documentation
- Records architecture decisions with context and rationale
- Automatic numbering (0001, 0002, ...)
- Saves to `docs/adr/` in project root
- Interactive input for decision details
- Japanese language support

### /adr:rule - ADR to Rule Converter

- Automatically generates project rules from ADR
- Converts decision into AI-executable format
- Saves to `docs/rules/` in project root
- Auto-integrates with `.claude/CLAUDE.md`
- Enables AI to follow project-specific decisions

### /workflow:create - Browser Workflow Generator

- Creates reusable browser automation workflows via interactive recording
- Uses Chrome DevTools MCP for real browser control
- Saves workflows as Markdown command files
- Generated workflows become discoverable slash commands
- Executes via `/workflow-name` after creation
- Use cases: E2E testing, monitoring, scraping, regression testing
- Interactive step-by-step recording with live execution
- Supports navigation, clicking, form filling, waiting, screenshots
- Workflows saved to `.claude/commands/workflows/`
- Human-editable Markdown format

## 📂 Workspace Structure

```txt
.claude/
├── CLAUDE.md          # Global rules
├── docs/
│   └── COMMANDS.md    # This file
├── commands/          # Command definitions
│   ├── adr.md        # ADR creator
│   ├── adr/
│   │   └── rule.md   # ADR to rule converter
│   ├── auto-test.md  # Auto test runner (SlashCommand)
│   ├── code.md
│   ├── fix.md
│   ├── full-cycle.md # Meta-command (SlashCommand)
│   ├── hotfix.md
│   ├── research.md
│   ├── review.md
│   ├── test.md
│   ├── think.md
│   ├── sow.md
│   ├── validate.md
│   ├── workflow/
│   │   └── create.md # Workflow generator
│   ├── workflows/    # Generated workflows (user-created)
│   └── gemini/
│       └── search.md
├── ja/               # Japanese versions
│   └── commands/
└── workspace/        # Working files
    └── sow/         # SOW documents
```

## 🚀 Quick Start

### New Feature (Enhanced Flow)

```bash
/think "Feature description"  # Create verifiable SOW
/research                      # Understand codebase
/code                         # Implement with TDD
/test                         # Verify tests pass
/sow                          # Check progress
/validate                     # Validate conformance
```

### Bug Fix

```bash
/research "Bug symptoms"
/fix       # Quick targeted fix
```

### Production Emergency

```bash
/hotfix "Critical issue description"
```

## 📋 Command Selection Guide

### Use `/fix` when

- Issue is small and well-defined
- Working in development environment
- Can wait for normal deployment

### Use `/hotfix` when

- Production is affected
- Immediate deployment needed
- Security vulnerability discovered

### Use `/research` when

- Need to understand existing code
- Exploring solution options
- No implementation planned yet

### Use `/think` when

- Starting new feature
- Need structured planning with validation
- Creating verifiable SOW document
- Want automated progress tracking

### Use `/sow` when

- Need to check implementation progress
- Want to see acceptance criteria status
- Monitoring active development work

### Use `/validate` when

- Ready to verify implementation
- Need conformance check against SOW
- Want to identify missing requirements

### Use `/adr` when

- Making important architecture decisions
- Need to document technical choices
- Want to record decision rationale
- Team needs visibility into decisions

### Use `/adr:rule` when

- ADR decision should affect AI behavior
- Want to enforce project-specific patterns
- Need AI to follow architecture decisions automatically

### Use `/workflow:create` when

- Need to automate repetitive browser interactions
- Creating E2E test scenarios
- Setting up monitoring for critical user flows
- Building data collection workflows
- Want to document complex manual testing procedures
- Need reproducible browser automation

## 🏗️ Commands, Agents, Skills の使い分け

### アーキテクチャ概要

Claude Codeは、Commands、Agents、Skillsの3層構造で機能を提供します。それぞれの役割を理解することで、効果的な活用が可能になります。

```text
┌─────────────────────────────────────────────────────────────┐
│ Commands: ユーザーが直接呼び出すワークフロー              │
├─────────────────────────────────────────────────────────────┤
│ - /review → レビューオーケストレーション                  │
│ - /adr → ADR作成フロー                                      │
│ - /code → TDD/RGRC実装                                      │
│                                                              │
│ 特徴: 薄いラッパー、SkillsやAgentsを調整                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Agents: 専門分析・レビュー（Commandsから呼ばれる）        │
├─────────────────────────────────────────────────────────────┤
│ - performance-reviewer → パフォーマンス分析                │
│ - accessibility-reviewer → a11y検証                         │
│ - type-safety-reviewer → 型安全性チェック                  │
│                                                              │
│ 特徴: 特定タスク実行、短期的、Skillsを参照可能            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Skills: 知識ベース・ガイド・自動化                        │
├─────────────────────────────────────────────────────────────┤
│ - performance-optimization → 最適化知識                    │
│ - progressive-enhancement → 設計原則                       │
│ - adr-creator → ADR作成ガイド                              │
│ - esa-daily-report → プロジェクト固有自動化               │
│                                                              │
│ 特徴: 永続的知識、教育的、再利用可能                      │
└─────────────────────────────────────────────────────────────┘
```

### 詳細な役割分担

#### 📋 Commands

**役割**: ユーザーが明示的に呼び出すワークフロー

**特徴**:

- ユーザーインターフェース（`/command`形式）
- 薄いオーケストレーションレイヤー
- AgentsやSkillsを調整・連携
- タスクの進行管理

**例**:

- `/review` → 複数のreview agentsを呼び出し、結果を統合
- `/adr` → adr-creator skillを参照してADR作成プロセスを実行

#### 🤖 Agents

**役割**: 専門的な分析・レビュー（主にCommandsから呼ばれる）

**特徴**:

- 特定ドメインの専門知識
- 実際のコード分析・レビュー実行
- Skillsの知識ベースを参照可能
- 短期的なタスク実行

**例**:

- `performance-reviewer` → 実際のコードのパフォーマンスボトルネックを特定
- `security-reviewer` → コード内の脆弱性を検出（※削除済み、security-review skillに統合）

#### 📚 Skills

**役割**: 知識ベース、ガイド、プロジェクト固有の自動化

**特徴**:

- 永続的な技術知識
- 教育的コンテンツ
- プロジェクト横断的に再利用可能
- キーワードベースの自動トリガー（オプション）

**例**:

- `performance-optimization` → Web Vitals、React最適化のガイド
- `progressive-enhancement` → CSS-firstアプローチの設計原則
- `esa-daily-report` → プロジェクト固有の日報自動化

### 協調動作の実例

#### Example 1: Performance最適化

```text
User: "このページが遅い"
    ↓
Skill (auto-trigger): performance-optimization
    → Web Vitalsの知識を提供
    → 測定方法を提案
    ↓
User: "/review"
    ↓
Command: /review
    ↓
Agent: performance-reviewer
    → 実際のコードを分析
    → performance-optimization skillを参照
    → ボトルネックを特定
    ↓
Output: 具体的な改善提案
    （Skillの知識 + Agentの分析）
```

#### Example 2: ADR作成

```text
User: "/adr 'Adopt React Native for Mobile'"
    ↓
Command: /adr
    ↓
Skill: adr-creator
    → MADR形式のテンプレート提供
    → 6段階プロセスガイド
    → 参照元収集スクリプト
    ↓
Command: /adr
    → Skillのガイドに従ってプロセス実行
    → ユーザー入力を収集
    → ADRファイル生成
    ↓
Output: docs/adr/0023-adopt-react-native.md
```

### いつどれを作るべきか

#### Commands を作成すべき場合

- ✅ ユーザーが繰り返し実行するワークフロー
- ✅ 複数のAgentsやSkillsを組み合わせる必要がある
- ✅ ユーザー入力が必要なインタラクティブなタスク

#### Agents を作成すべき場合

- ✅ 特定ドメインの専門的な分析が必要
- ✅ コードレビューや検証など、実行ベースのタスク
- ✅ Commandsから呼び出される専門処理

#### Skills を作成すべき場合

- ✅ プロジェクト横断的な技術知識
- ✅ 教育的コンテンツ、ベストプラクティス集
- ✅ プロジェクト固有の自動化ワークフロー
- ✅ キーワードトリガーによる自動支援

### 詳細ドキュメント

- **Skills詳細**: `~/.claude/skills/README.md`
- **Agents**: `~/.claude/agents/`配下のドキュメント
- **Commands**: このファイル（COMMANDS.md）

## 🔧 Configuration

### Language Settings

- Command files: English
- Output to user: Japanese (per CLAUDE.md)

### Related Files

- `~/.claude/CLAUDE.md` - Global settings and rules
- `~/.claude/rules/` - Development principles
- `~/.claude/settings.json` - Tool permissions

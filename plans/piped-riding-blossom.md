# グローバル Claude Code 設定のローカル統合計画

## 概要

グローバル設定（~/.claude/）のワークフロー・ルール・スキル・エージェントを**ローカルプロジェクトに実体化**する。

**重要**: チームメンバーがグローバル設定（~/.claude/）を持っていない可能性があるため、参照ではなく**ローカルにコピー**する。

## 現状分析

### グローバル設定（~/.claude/）

| カテゴリ | 数 | 主要ファイル |
|---------|-----|-------------|
| **コマンド** | 16個 | think, code, fix, research, test, review, hotfix, validate, sow 等 |
| **ルール** | 14個 | AI_OPERATION_PRINCIPLES, PRE_TASK_CHECK, SOLID, DRY, YAGNI 等 |
| **エージェント** | 18個 | review-orchestrator, accessibility-reviewer, performance-reviewer 等 |
| **スキル** | 9個 | code-principles, tdd-test-generation, progressive-enhancement 等 |

### ローカル設定（.claude/）

| カテゴリ | 数 | 主要ファイル |
|---------|-----|-------------|
| **コマンド** | 13個 | prisma/, remix/, storybook/, ui/ (プロジェクト固有) |
| **ルール** | 2個 | file-organization, testing-strategy |
| **スキル** | 1個 | implementation-patterns |
| **ドキュメント** | 充実 | PROJECT_CONTEXT (1,900行), ADR 21個 |

---

## 統合方針

**ローカルに実体化**（参照ではなくコピー）する理由：

1. チームメンバーがグローバル設定を持っていない
2. Git管理でチーム全体に共有可能
3. プロジェクト固有のカスタマイズが可能

---

## 実装計画

### Phase 1: コアルールの統合

**目標**: PRE_TASK_CHECK フローと基本原則をローカルに追加

**追加ファイル**:

```
.claude/
├── rules/
│   ├── core/                          # 新規作成
│   │   ├── AI_OPERATION_PRINCIPLES.md # コピー元: ~/.claude/rules/core/
│   │   └── PRE_TASK_CHECK.md          # コピー元: ~/.claude/rules/core/
│   └── reference/                     # 新規作成
│       ├── SOLID.md                   # コピー元: ~/.claude/rules/reference/
│       ├── DRY.md
│       ├── OCCAMS_RAZOR.md
│       ├── MILLERS_LAW.md
│       └── YAGNI.md
```

**settings.json 更新**: hooks セクション追加

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "echo -n '{\"additional_context\": \"PRE_TASK_CHECK:\\n' && cat .claude/rules/core/PRE_TASK_CHECK.md | sed 's/\"/\\\\\"/g' | tr '\\n' ' ' && echo '\"}'"
      }
    ]
  }
}
```

**CLAUDE.md 更新**: ルール参照セクション追加

**工数**: 1時間

---

### Phase 2: コマンドの統合

**目標**: 主要ワークフローコマンドをローカルに追加

**追加ファイル**:

```
.claude/
└── commands/
    ├── think.md                       # コピー元: ~/.claude/commands/
    ├── code.md
    ├── fix.md
    ├── research.md
    ├── test.md
    ├── review.md
    ├── hotfix.md
    ├── validate.md
    ├── sow.md
    ├── branch.md
    ├── commit.md
    ├── pr.md
    └── context.md
```

**既存コマンドとの共存**:

- prisma/, remix/, storybook/, ui/ はそのまま維持
- グローバルコマンドはルートに配置

**工数**: 30分

---

### Phase 3: エージェントの統合

**目標**: レビューエージェント群をローカルに追加

**追加ファイル**:

```
.claude/
└── agents/
    ├── reviewers/
    │   ├── _base-template.md          # コピー元: ~/.claude/agents/reviewers/
    │   ├── accessibility.md
    │   ├── performance.md
    │   ├── type-safety.md
    │   ├── readability.md
    │   ├── structure.md
    │   ├── testability.md
    │   ├── design-pattern.md
    │   ├── document.md
    │   ├── root-cause.md
    │   └── subagent.md
    ├── orchestrators/
    │   └── review-orchestrator.md
    ├── git/
    │   ├── branch-generator.md
    │   ├── commit-generator.md
    │   └── pr-generator.md
    ├── generators/
    │   └── test.md
    └── enhancers/
        └── progressive.md
```

**工数**: 30分

---

### Phase 4: スキルの統合

**目標**: 主要スキルをローカルに追加

**追加ファイル**:

```
.claude/
└── skills/
    ├── implementation-patterns/       # 既存（維持）
    ├── code-principles/               # 新規追加
    │   ├── SKILL.md
    │   └── references/
    ├── tdd-test-generation/           # 新規追加
    │   ├── SKILL.md
    │   └── references/
    ├── progressive-enhancement/       # 新規追加
    │   ├── SKILL.md
    │   └── references/
    ├── performance-optimization/      # 新規追加
    │   ├── SKILL.md
    │   └── references/
    └── security-review/               # 新規追加
        ├── SKILL.md
        └── references/
```

**工数**: 1時間

---

### Phase 5: 開発ルールの統合

**目標**: 開発プラクティスルールをローカルに追加

**追加ファイル**:

```
.claude/
└── rules/
    └── development/                   # 新規作成
        ├── TDD_RGRC.md                # コピー元: ~/.claude/rules/development/
        ├── PROGRESSIVE_ENHANCEMENT.md
        ├── READABLE_CODE.md
        ├── CONTAINER_PRESENTATIONAL.md
        └── AI_ASSISTED_DEVELOPMENT.md
```

**既存ルールとの統合**:

- file-organization.md → 維持
- testing-strategy.md → TDD_RGRC への参照追加

**工数**: 30分

---

### Phase 6: CLAUDE.md とドキュメント更新

**目標**: 統合した設定への参照を CLAUDE.md に追加

**変更ファイル**: `/Users/thkt/GitHub/kai/main/CLAUDE.md`

**追加内容**:

#### 1. Global Development Principles セクション

```markdown
---

## Global Development Principles

### [P0] CRITICAL - Core AI Operation Rules

**ALWAYS ACTIVE** - Applied on every user message via hook

- **AI Operation Principles** @.claude/rules/core/AI_OPERATION_PRINCIPLES.md
- **PRE_TASK_CHECK** @.claude/rules/core/PRE_TASK_CHECK.md
  - 95% Understanding Rule, Impact Simulation, Execution Plan

### [P1] REQUIRED - Language Settings

- **Output**: Japanese only (English internally)

### [P2] DEFAULT - Core Development Principles

Available via `code-principles` skill @.claude/skills/applying-code-principles/SKILL.md:
- **Occam's Razor (KISS)** - Choose simplest solution
- **SOLID Principles** - Manage dependencies
- **DRY** - Single source of truth
- **Miller's Law** - Respect cognitive limits (7±2)
- **YAGNI** - Build what you need now

### [P3] CONTEXTUAL - Just-in-Time References

- **progressive-enhancement** skill
- **tdd-test-generation** skill
- **performance-optimization** skill

---
```

#### 2. Standard Workflows セクション

```markdown
---

## Standard Workflows

### Global Commands

| Command | Purpose |
|---------|---------|
| `/think` | SOW生成・計画立案 |
| `/code` | TDD/RGRC 実装 |
| `/review` | コードレビュー（10種エージェント） |
| `/fix` | クイック修正 |
| `/test` | 包括的テスト |
| `/research` | 調査（実装なし） |
| `/validate` | SOW適合性検証 |

### Recommended Workflows

- **Feature**: `/think` → `/code` → `/test` → `/review` → `/validate`
- **Bug Fix**: `/research` → `/fix`
- **Emergency**: `/hotfix`

詳細: @.claude/docs/COMMANDS.md

---
```

**工数**: 30分

---

## 工数まとめ

| Phase | 内容 | 工数 |
|-------|------|------|
| Phase 1 | コアルール統合 | 1時間 |
| Phase 2 | コマンド統合 | 30分 |
| Phase 3 | エージェント統合 | 30分 |
| Phase 4 | スキル統合 | 1時間 |
| Phase 5 | 開発ルール統合 | 30分 |
| Phase 6 | CLAUDE.md更新 | 30分 |
| **合計** | | **4時間** |

---

## 実装順序

### Step 1: コアルール（Phase 1）

1. `.claude/rules/core/` ディレクトリ作成
2. AI_OPERATION_PRINCIPLES.md コピー
3. PRE_TASK_CHECK.md コピー
4. `.claude/rules/reference/` ディレクトリ作成
5. SOLID.md, DRY.md, OCCAMS_RAZOR.md, MILLERS_LAW.md, YAGNI.md コピー
6. settings.json に hooks 追加

### Step 2: コマンド（Phase 2）

1. think.md, code.md, fix.md, research.md, test.md, review.md, hotfix.md, validate.md, sow.md コピー
2. branch.md, commit.md, pr.md, context.md コピー

### Step 3: エージェント（Phase 3）

1. `.claude/agents/` ディレクトリ作成
2. reviewers/, orchestrators/, git/, generators/, enhancers/ コピー

### Step 4: スキル（Phase 4）

1. code-principles/, tdd-test-generation/, progressive-enhancement/ コピー
2. performance-optimization/, security-review/ コピー

### Step 5: 開発ルール（Phase 5）

1. `.claude/rules/development/` ディレクトリ作成
2. TDD_RGRC.md, PROGRESSIVE_ENHANCEMENT.md, READABLE_CODE.md コピー

### Step 6: CLAUDE.md 更新（Phase 6）

1. Global Development Principles セクション追加
2. Standard Workflows セクション追加
3. Documentation Structure 更新

---

## リスクと軽減策

### リスク 1: ファイル数の増加

- **影響**: .claude/ ディレクトリが大幅に拡大
- **軽減策**: Git管理、必要なものだけコピー

### リスク 2: グローバル設定との乖離

- **影響**: グローバル更新時にローカルが古くなる
- **軽減策**: 定期的な同期、重要な更新はローカルにも反映

### リスク 3: 既存設定との競合

- **影響**: プロジェクト固有コマンドとの名前衝突
- **軽減策**: 既存コマンドはサブディレクトリ維持、新規はルートに配置

---

## 成功基準

### 完了基準

- [ ] コアルール（core/, reference/）追加完了
- [ ] コマンド（13個）追加完了
- [ ] エージェント（18個）追加完了
- [ ] スキル（5個）追加完了
- [ ] 開発ルール（development/）追加完了
- [ ] CLAUDE.md 更新完了
- [ ] settings.json hooks 設定完了

### 動作確認

- [ ] `/think` コマンド動作確認
- [ ] `/review` コマンド動作確認
- [ ] PRE_TASK_CHECK 自動注入確認
- [ ] code-principles skill 自動起動確認

---

## Critical Files

### コピー元（グローバル）

| カテゴリ | パス |
|---------|------|
| コアルール | `/Users/thkt/.claude/rules/core/` |
| 参照ルール | `/Users/thkt/.claude/rules/reference/` |
| 開発ルール | `/Users/thkt/.claude/rules/development/` |
| コマンド | `/Users/thkt/.claude/commands/` |
| エージェント | `/Users/thkt/.claude/agents/` |
| スキル | `/Users/thkt/.claude/skills/` |

### コピー先（ローカル）

| カテゴリ | パス |
|---------|------|
| コアルール | `/Users/thkt/GitHub/kai/main/.claude/rules/core/` |
| 参照ルール | `/Users/thkt/GitHub/kai/main/.claude/rules/reference/` |
| 開発ルール | `/Users/thkt/GitHub/kai/main/.claude/rules/development/` |
| コマンド | `/Users/thkt/GitHub/kai/main/.claude/commands/` |
| エージェント | `/Users/thkt/GitHub/kai/main/.claude/agents/` |
| スキル | `/Users/thkt/GitHub/kai/main/.claude/skills/` |

### 更新ファイル

| ファイル | 変更内容 |
|---------|---------|
| `.claude/settings.json` | hooks セクション追加 |
| `CLAUDE.md` | Global Development Principles, Standard Workflows セクション追加 |

---

## 最終ディレクトリ構造

```
.claude/
├── commands/
│   ├── prisma/              # 既存（維持）
│   ├── remix/               # 既存（維持）
│   ├── storybook/           # 既存（維持）
│   ├── ui/                  # 既存（維持）
│   ├── think.md             # 新規追加
│   ├── code.md              # 新規追加
│   ├── fix.md               # 新規追加
│   ├── research.md          # 新規追加
│   ├── test.md              # 新規追加
│   ├── review.md            # 新規追加
│   ├── hotfix.md            # 新規追加
│   ├── validate.md          # 新規追加
│   ├── sow.md               # 新規追加
│   ├── branch.md            # 新規追加
│   ├── commit.md            # 新規追加
│   ├── pr.md                # 新規追加
│   └── context.md           # 新規追加
├── rules/
│   ├── core/                # 新規追加
│   │   ├── AI_OPERATION_PRINCIPLES.md
│   │   └── PRE_TASK_CHECK.md
│   ├── reference/           # 新規追加
│   │   ├── SOLID.md
│   │   ├── DRY.md
│   │   ├── OCCAMS_RAZOR.md
│   │   ├── MILLERS_LAW.md
│   │   └── YAGNI.md
│   ├── development/         # 新規追加
│   │   ├── TDD_RGRC.md
│   │   ├── PROGRESSIVE_ENHANCEMENT.md
│   │   └── READABLE_CODE.md
│   ├── file-organization.md # 既存（維持）
│   └── testing-strategy.md  # 既存（維持）
├── agents/                  # 新規追加
│   ├── reviewers/
│   ├── orchestrators/
│   ├── git/
│   ├── generators/
│   └── enhancers/
├── skills/
│   ├── implementation-patterns/  # 既存（維持）
│   ├── code-principles/          # 新規追加
│   ├── tdd-test-generation/      # 新規追加
│   ├── progressive-enhancement/  # 新規追加
│   ├── performance-optimization/ # 新規追加
│   └── security-review/          # 新規追加
├── docs/                    # 既存（維持）
├── logs/                    # 既存（維持）
├── workspace/               # 既存（維持）
├── settings.json            # 更新（hooks追加）
└── settings.local.json      # 既存（維持）
```

---

**作成日**: 2025-12-01
**合計工数**: 約4時間
**優先度**: 全機能をバランスよく統合

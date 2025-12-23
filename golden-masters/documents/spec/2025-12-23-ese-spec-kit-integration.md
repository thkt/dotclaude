# Specification: 「エセSpec Kit」統合によるワークフロー改善

Version: 1.0.0
Based on: SOW v1.0.0
Last Updated: 2025-12-23

---

## 1. Functional Requirements

### 1.1 Phase 1-A: コンテキスト最小化

[→] FR-001: applying-code-principles スキルの機能担保と冗長性削減

- **Input**: 現在の`skills/applying-code-principles/SKILL.md`（430行）
- **Output**: 必須機能を維持した最適化版SKILL.md
- **必須機能（維持必須）**:
  - Quick Decision Questions（4つの判断基準）
  - Project Priority Order（原則の優先順位）
  - 参照リンク構造（rules/reference/への誘導）
- **削減対象（冗長性）**:
  - SOLID、DRY、Occam's Razor等の詳細説明（Claudeは既知の概念）
  - 重複する概念説明
  - 過度な例示
- **Validation**:
  - 必須機能が100%維持されている
  - 冗長な詳細説明が参照リンクに置き換えられている
  - `/code`実行時にTDD/RGRCサイクルが正常動作する
- **検証指標（結果確認用）**: 行数削減は機能担保の結果として確認

[→] FR-002: /code参照コンテキストの機能担保と冗長性削減

- **Input**: 現在の`/code`参照コンテキスト（2,827行）
- **Output**: 必須機能を維持した最適化コンテキスト
- **必須機能（維持必須）**:
  - TDD/RGRCサイクルの完全な手順
  - Occam's Razorの判断基準
  - 品質ゲートの定義
- **削減対象（冗長性）**:
  - 既にClaudeが知っている原則の詳細説明
  - 重複する概念説明
- **Validation**:
  - TDD/RGRCサイクルが正常動作
  - 品質ゲートが機能する
  - 機能低下なし（A/Bテストで確認）
- **検証指標（結果確認用）**: コンテキストサイズは機能担保の結果として確認

[→] FR-003: CLAUDE.mdでの必須/参照原則分離

- **Input**: 現在のCLAUDE.md（P2 DEFAULT）
- **Output**: 更新版CLAUDE.md
- **Validation**:
  - P2 DEFAULTが「必須原則」（Always Active）に明確化
  - P3 CONTEXTUALが「参照原則」（Task-specific）に明確化
  - ドキュメント構造が明確

### 1.2 Phase 1-B: Golden Masters蓄積

[✓] FR-004: golden-masters/ディレクトリの拡充

- **Input**: 過去の優れたsow.md/spec.md（workspace/planning/配下）
- **Output**: 拡充されたgolden-masters/（50+ファイル）
- **Validation**:
  - documents/sow/に15+ファイル
  - documents/spec/に15+ファイル
  - documents/summary/に10+ファイル
  - 各ファイルに選定理由コメント（`<!--`で記載）

[→] FR-005: QUALITY_CRITERIA.md作成

- **Input**: golden-mastersの評価基準
- **Output**: `golden-masters/QUALITY_CRITERIA.md`
- **Validation**: 以下の内容を含む
  - SOW評価観点（構造、マーカー、具体性、リスク評価）
  - Spec評価観点（実装可能性、テスト可能性、SOW整合性、網羅性）
  - スコアリング手法（各観点25点、合計100点）
  - 比較プロセス
  - Anti-patterns集

[→] FR-006: sow-spec-reviewerとの統合

- **Input**: 生成されたsow.md/spec.md
- **Output**: 品質スコア（0-100）
- **Validation**:
  - 80/100以上を合格ライン
  - スコアリング結果に具体的な改善点を含む

### 1.3 Phase 2-A: /thinkコマンド再設計

[→] FR-007: /sowコマンドの独立化

- **Input**: タスク説明文字列
- **Output**: sow.mdのみ
- **必須機能（維持必須）**:
  - 単一成果物（sow.mdのみ生成）
  - TodoWrite統合
  - 研究コンテキスト自動検出
  - Golden Master参照
- **Validation**:
  - 必須機能が全て動作する
  - 生成されたsow.mdが必須セクションを含む
- **検証指標（結果確認用）**: コマンドサイズは詳細委譲の結果として確認

[→] FR-008: /specコマンドの独立化

- **Input**: sow.mdパスまたは自動検出
- **Output**: spec.mdのみ
- **必須機能（維持必須）**:
  - 単一成果物（spec.mdのみ生成）
  - sow.md自動検出機能
  - Golden Master参照
- **Validation**:
  - 必須機能が全て動作する
  - 生成されたspec.mdがsow.mdと整合している
- **検証指標（結果確認用）**: コマンドサイズは詳細委譲の結果として確認

[→] FR-009: /thinkのオーケストレーション化

- **Input**: タスク説明文字列
- **Output**: `/sow` → `/spec`の順次実行
- **必須機能（維持必須）**:
  - sow.md + spec.md両方を生成
  - 既存の`/think "feature"`という呼び出し方との互換性
  - 研究コンテキスト自動検出
  - TodoWrite統合
- **Validation**:
  - 同じ成果物（sow.md + spec.md）を生成
  - 既存プロジェクトで動作確認
  - SlashCommand toolで/sow → /spec実行
- **検証指標（結果確認用）**: コマンドサイズは詳細委譲の結果として確認

### 1.4 Phase 2-B: コマンド簡素化

[→] FR-010: /fixのモジュール分割

- **Input**: 現在の`commands/fix.md`（546行）
- **Output**: モジュール分割版
- **必須機能（維持必須）**:
  - バグ調査→修正→テストの一連フロー
  - 開発環境での迅速な修正
  - 既存の`/fix "issue"`という呼び出し方との互換性
- **委譲対象**:
  - 詳細な調査手順 → investigation.md
  - 詳細な修正手順 → repair.md
  - 詳細なテスト手順 → testing.md
- **Validation**:
  - `/fix`実行でバグ修正フローが正常動作
  - 既存プロジェクトで動作確認
- **検証指標（結果確認用）**: コマンドサイズは詳細委譲の結果として確認

[→] FR-011: /researchの簡素化

- **Input**: 現在の`commands/research.md`（660行）
- **Output**: 必須機能を維持した最適化版
- **必須機能（維持必須）**:
  - 調査結果の永続化
  - コンテキスト生成
  - 実装なしの探索
- **委譲対象**:
  - テンプレート → golden-masters/documents/research/
  - 詳細な例示 → 外部ファイル
- **Validation**:
  - `/research`実行で調査結果が適切に保存される
  - 機能低下なし
- **検証指標（結果確認用）**: コマンドサイズは詳細委譲の結果として確認

[→] FR-012: /rulifyの簡素化

- **Input**: 現在の`commands/rulify.md`（600行）
- **Output**: 必須機能を維持した最適化版
- **必須機能（維持必須）**:
  - ADRからルール生成
  - CLAUDE.md統合
- **委譲対象**:
  - テンプレート → 外部ファイル
- **Validation**:
  - `/rulify`実行でルールが正常生成・統合される
- **検証指標（結果確認用）**: コマンドサイズは詳細委譲の結果として確認

### 1.5 Phase 3: ツール非依存化（低優先度）

[?] FR-013: docs/principles/への移行

- **Input**: 現在の`rules/reference/`
- **Output**: `docs/principles/`
- **Validation**:
  - rules/reference/の内容をコピー
  - CLAUDE.mdを50行以下に削減
  - プロジェクト固有知識はdocs/配下に

**注意**: Phase 1-2の効果を見てから実施を判断

---

## 2. Data Model

### 2.1 ディレクトリ構造

```typescript
interface WorkflowStructure {
  // Golden Masters（拡充）
  goldenMasters: {
    documents: {
      sow: GoldenMasterFile[];      // 15+ファイル
      spec: GoldenMasterFile[];     // 15+ファイル
      summary: GoldenMasterFile[];  // 10+ファイル
      research: GoldenMasterFile[]; // 10+ファイル（新規）
    };
    qualityCriteria: string;        // QUALITY_CRITERIA.md
    readme: string;                 // README.md
  };

  // コマンド（Phase 2後）
  commands: {
    sow: CommandFile;        // commands/sow.md（新規、必須機能を含む）
    spec: CommandFile;       // commands/spec.md（新規、必須機能を含む）
    think: CommandFile;      // commands/think.md（オーケストレーションのみ）
    fix: {
      main: CommandFile;     // commands/fix.md（オーケストレーションのみ）
      investigation: string; // commands/fix/investigation.md（詳細手順）
      repair: string;        // commands/fix/repair.md（詳細手順）
      testing: string;       // commands/fix/testing.md（詳細手順）
    };
    research: CommandFile;   // commands/research.md（必須機能を含む）
    rulify: CommandFile;     // commands/rulify.md（必須機能を含む）
  };

  // スキル（コンテキスト削減後）
  skills: {
    applyingCodePrinciples: {
      file: string;          // skills/applying-code-principles/SKILL.md（必須機能を維持）
      essential: string[];   // 必須セクション（Quick Decision Questions等）
      references: string[];  // 参照リンク（rules/reference/へ）
    };
  };
}

interface GoldenMasterFile {
  path: string;              // ファイルパス
  score: number;             // sow-spec-reviewerスコア（80-100）
  selectionReason: string;   // 選定理由（コメント内）
  phase?: string;            // 適用フェーズ（オプション）
}

interface CommandFile {
  path: string;              // ファイルパス
  lines: number;             // 行数（結果確認用）
  type: 'orchestrator' | 'module' | 'standard';
  essentialFeatures: string[]; // 必須機能（維持必須）
  delegatedTo?: string[];    // 詳細を委譲先（オプション）
}
```

### 2.2 コンテキスト分類

```typescript
interface ContextClassification {
  // 必須（常にロード）- P2 DEFAULT
  essential: {
    principles: {
      tddRgrc: string;      // TDD/RGRC cycle
      occamsRazor: string;  // Decision criteria
    };
    skills: {
      tddTestGeneration: string; // Test generation
    };
  };

  // 参照（タスクタイプ別）- P3 CONTEXTUAL
  reference: {
    principles: {
      solid: string;              // rules/reference/SOLID.md
      dry: string;                // rules/reference/DRY.md
      millersLaw: string;         // rules/reference/MILLERS_LAW.md
      yagni: string;              // rules/reference/YAGNI.md
    };
    development: {
      progressiveEnhancement: string;  // rules/development/PROGRESSIVE_ENHANCEMENT.md
      readableCode: string;            // rules/development/READABLE_CODE.md
      lawOfDemeter: string;            // rules/development/LAW_OF_DEMETER.md
      leakyAbstraction: string;        // rules/development/LEAKY_ABSTRACTION.md
    };
    skills: {
      frontendPatterns: string;        // skills/applying-frontend-patterns/SKILL.md
      codePrinciples: string;          // skills/applying-code-principles/SKILL.md（簡素化版）
      storybookIntegration: string;    // skills/integrating-storybook/SKILL.md
    };
  };

  // コンテキストサイズ（検証指標、目標ではない）
  sizes: {
    current: {
      total: 2827;           // 現状合計
      essential: 728;        // 必須部分
      reference: 2099;       // 参照部分（冗長性含む）
    };
    // 目標は行数ではなく機能担保
    // 行数削減は冗長性削減の結果として確認
    expected: {
      essential: 728;        // 必須部分（維持必須）
      reference: '削減';     // 冗長な詳細説明を参照リンク化した結果
    };
  };
}
```

### 2.3 品質基準

```typescript
interface QualityCriteria {
  sow: {
    structure: {
      weight: 25;            // 構造（25点）
      criteria: string[];    // 必須セクション網羅
    };
    markers: {
      weight: 25;            // マーカー（25点）
      criteria: string[];    // ✓/→/?の適切な使用
    };
    actionability: {
      weight: 25;            // 実行可能性（25点）
      criteria: string[];    // 具体的なAcceptance Criteria
    };
    riskAssessment: {
      weight: 25;            // リスク評価（25点）
      criteria: string[];    // 現実的なリスクと緩和策
    };
  };

  spec: {
    implementability: {
      weight: 25;            // 実装可能性（25点）
      criteria: string[];    // コードに直接変換可能
    };
    testability: {
      weight: 25;            // テスト可能性（25点）
      criteria: string[];    // 明確なテストシナリオ
    };
    sowAlignment: {
      weight: 25;            // SOW整合性（25点）
      criteria: string[];    // SOWとの一貫性
    };
    completeness: {
      weight: 25;            // 網羅性（25点）
      criteria: string[];    // エッジケース考慮
    };
  };

  passThreshold: 80;         // 合格ライン（80/100以上）
}
```

---

## 3. Implementation Details

### 3.1 Phase 1-A: コンテキスト最小化

#### applying-code-principles削減

**現状分析**:

```markdown
skills/applying-code-principles/SKILL.md（430行）
├── Purpose（5行）- 維持
├── Project Priority Order（10行）- 維持
├── Quick Decision Questions（15行）- 維持 ← 核心部分
├── References（10行）- 簡素化
└── SOLID詳細（100行）- 削除 → rules/reference/SOLID.mdへリンク
└── DRY詳細（80行）- 削除 → rules/reference/DRY.mdへリンク
└── Occam's Razor詳細（90行）- 削除 → rules/reference/OCCAMS_RAZOR.mdへリンク
└── Miller's Law詳細（70行）- 削除 → rules/reference/MILLERS_LAW.mdへリンク
└── YAGNI詳細（50行）- 削除 → rules/reference/YAGNI.mdへリンク
```

**削減後の構造**（必須機能を維持）:

```markdown
# Code Principles

## Purpose
Apply SOLID, DRY, Occam's Razor, Miller's Law, YAGNI with project-specific priority.

## Project Priority Order
[維持 - 10行]

## Quick Decision Questions
[維持 - 15行] ← これが最も重要

## References
Detailed explanations (Claude already knows these concepts):
- [@~/.claude/rules/reference/SOLID.md] - SRP, OCP, LSP, ISP, DIP
- [@~/.claude/rules/reference/DRY.md] - Knowledge duplication, Rule of Three
- [@~/.claude/rules/reference/OCCAMS_RAZOR.md] - KISS, simplicity principle
- [@~/.claude/rules/reference/MILLERS_LAW.md] - Cognitive limits (7±2)
- [@~/.claude/rules/reference/YAGNI.md] - Outcome-first development
```

#### CLAUDE.md改修

```markdown
### [P2] DEFAULT - Development Approach

**ALWAYS APPLY** - Core principles for all development

Essential principles (SOLID, DRY, Occam's Razor, Miller's Law, YAGNI) available via `applying-code-principles` skill.

**Quick Decision Questions** (apply before every implementation):
- "Is there a simpler way?" (Occam's Razor)
- "Understandable in <1 min?" (Miller's Law)
- "Duplicating knowledge?" (DRY)
- "Needed now?" (YAGNI)

**Full details**: See [@~/.claude/skills/applying-code-principles/SKILL.md] for comprehensive guide.

### [P3] CONTEXTUAL - Just-in-Time References

**APPLY AS NEEDED** - Load based on task type
- Code tasks: [@~/.claude/rules/reference/OCCAMS_RAZOR.md], [@~/.claude/rules/reference/SOLID.md]
- Testing: Available via `generating-tdd-tests` skill
- Large-scale: [@~/.claude/rules/development/LAW_OF_DEMETER.md]
```

### 3.2 Phase 1-B: Golden Masters蓄積

#### 選定基準

```bash
# 過去のSOW/Specから選定
find ~/.claude/workspace/planning/ -name "sow.md" -o -name "spec.md" | \
  xargs -I {} sh -c 'echo "Evaluating: {}"; head -50 {}'

# 選定基準（80/100以上）
1. 構造の一貫性（必須セクション網羅）
2. ✓/→/?マーカーの適切な使用
3. 定量的な現状分析
4. 具体的なAcceptance Criteria
5. フェーズ別実装計画
```

#### QUALITY_CRITERIA.md内容

```markdown
# Golden Masters - Prompt Quality Standards

## Purpose
Accumulate ideal artifact examples for prompt tuning standards.

## SOW Quality Criteria (Total: 100 points)

### 1. Structure (25 points)

- [ ] Executive Summary (5点)
- [ ] Problem Analysis (5点)
- [ ] Assumptions & Prerequisites (5点)
- [ ] Acceptance Criteria (5点)
- [ ] Implementation Plan (5点)

### 2. Markers (25 points)

- [ ] [✓] for verified facts (10点)
- [ ] [→] for inferred items (10点)
- [ ] [?] for unknowns (5点)

### 3. Actionability (25 points)

- [ ] Concrete Acceptance Criteria (10点)
- [ ] Measurable Success Metrics (10点)
- [ ] Clear Implementation Steps (5点)

### 4. Risk Assessment (25 points)

- [ ] Risks classified by confidence (10点)
- [ ] Realistic mitigations (10点)
- [ ] Rollback procedure (5点)

**Pass Threshold**: 80/100以上

## Spec Quality Criteria (Total: 100 points)

### 1. Implementability (25 points)

- [ ] Functional Requirements with Input/Output (10点)
- [ ] Data Model (TypeScript interfaces) (10点)
- [ ] Implementation Details (5点)

### 2. Testability (25 points)

- [ ] Test Scenarios (Given-When-Then) (15点)
- [ ] Unit/Integration/E2E coverage (10点)

### 3. SOW Alignment (25 points)

- [ ] 1:1 FR to Acceptance Criteria (15点)
- [ ] Consistent terminology (10点)

### 4. Completeness (25 points)

- [ ] Edge case coverage (10点)
- [ ] Non-Functional Requirements (10点)
- [ ] Migration Guide (5点)

**Pass Threshold**: 80/100以上

## Anti-Patterns (Negative Examples)

### SOW Anti-Patterns

❌ Vague Acceptance Criteria ("Improve performance")
❌ No confidence markers
❌ Missing risk assessment
❌ Unrealistic timeline

### Spec Anti-Patterns

❌ Missing data model
❌ No test scenarios
❌ Implementation details too vague
❌ No edge case consideration
```

### 3.3 Phase 2-A: /thinkコマンド再設計

#### /sow.md (新規作成)

```markdown
---
name: sow
description: Generate Statement of Work (SOW) only
allowed-tools: Read, Write, Glob, Grep, Task
argument-hint: "[feature description]"
---

# /sow - SOW Generator

## Purpose
Generate sow.md only (single artifact) for planning and analysis.

## Input Resolution
1. **Explicit argument**: Use directly
2. **Research context**: Auto-detect from .claude/workspace/research/*-context.md
3. **Neither**: Ask user for task description

## Golden Master Reference
[@~/.claude/golden-masters/documents/sow/example-workflow-improvement.md]

## Output
.claude/workspace/planning/[timestamp]-[feature]/sow.md

## Next Steps
- `/spec` - Generate implementation specification
- `/plans` - View created documents
```

#### /spec.md (新規作成)

```markdown
---
name: spec
description: Generate Specification from SOW
allowed-tools: Read, Write, Glob, Grep
argument-hint: "[sow path or feature]"
---

# /spec - Spec Generator

## Purpose
Generate spec.md only (single artifact) with implementation-ready details.

## Input Detection
Auto-detect SOW from latest .claude/workspace/planning/*/sow.md

## Golden Master Reference
[@~/.claude/golden-masters/documents/spec/example-workflow-improvement.md]

## Output
.claude/workspace/planning/[same-dir]/spec.md

## Next Steps
- `/code` - Implement based on spec
- `/audit` - Review will reference spec for validation
```

#### /think.md (Thin Wrapper版)

```markdown
---
name: think
description: Orchestrate /sow and /spec generation
allowed-tools: SlashCommand, Read
argument-hint: "[feature description]"
---

# /think - Planning Orchestrator

## Purpose
Orchestrate SOW and Spec generation as a single workflow.

## Execution Flow
1. Execute /sow "[feature]" (or auto-detect research context)
2. Execute /spec (auto-detects SOW from Step 1)
3. (Optional) Invoke sow-spec-reviewer for quality check

## Output
All documents saved to:
.claude/workspace/planning/[timestamp]-[feature]/
├── sow.md
└── spec.md

## Example
```bash
# After /research (recommended workflow)
/research "user authentication options"
/think  # Auto-detects research context

# With explicit argument
/think "Add user authentication with OAuth"
```

## Related Commands

- `/sow` - SOW generation only
- `/spec` - Spec generation only
- `/plans` - View planning documents
- `/code` - Implement based on spec

### 3.4 Phase 2-B: コマンド簡素化

#### /fix モジュール分割

**新しい構造**:

```text
commands/
├── fix.md (200-300行) - Thin Wrapper
└── fix/
    ├── investigation.md - バグ調査手順
    ├── repair.md - 修正実装手順
    └── testing.md - 修正検証手順
```

**fix.md (Thin Wrapper)**:

```markdown
---
name: fix
description: Quick bug fixes in development environment
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# /fix - Quick Fix Workflow

## Purpose
Rapidly fix small bugs and minor improvements.

## Process
1. Investigation: [@./fix/investigation.md]
2. Repair: [@./fix/repair.md]
3. Testing: [@./fix/testing.md]

## Usage
```bash
/fix "Button click not working"
```

## Related Commands

- `/hotfix` - Production emergencies
- `/code` - Feature implementation

---

## 4. Test Scenarios

### 4.1 Unit Tests

```typescript
describe('Phase 1-A: Context Minimization', () => {
  it('[→] reduces applying-code-principles to <200 lines', () => {
    // Given: current SKILL.md (430 lines)
    // When: reduction script runs
    // Then: output <200 lines, Quick Decision Questions preserved
    const content = fs.readFileSync('skills/applying-code-principles/SKILL.md', 'utf-8');
    const lines = content.split('\n').length;
    expect(lines).toBeLessThan(200);
    expect(content).toContain('Quick Decision Questions');
  });

  it('[→] reduces /code context to <1500 lines', () => {
    // Given: current /code context (2,827 lines)
    // When: context size calculated
    // Then: total <1500 lines
    const context = calculateCodeContext();
    expect(context.totalLines).toBeLessThan(1500);
    expect(context.essential).toBe(728); // Essential unchanged
  });

  it('[✓] maintains functionality after context reduction', () => {
    // Given: reduced context
    // When: /code executed
    // Then: output quality unchanged (A/B test)
    const beforeScore = generateCode('feature A', 'original-context');
    const afterScore = generateCode('feature A', 'reduced-context');
    expect(afterScore).toBeGreaterThanOrEqual(beforeScore * 0.95); // 5% tolerance
  });
});

describe('Phase 1-B: Golden Masters', () => {
  it('[✓] accumulates 50+ golden master files', () => {
    // Given: golden-masters/ directory
    // When: file count calculated
    // Then: >=50 files
    const files = glob.sync('golden-masters/documents/**/*.md');
    expect(files.length).toBeGreaterThanOrEqual(50);
  });

  it('[→] QUALITY_CRITERIA.md exists with scoring criteria', () => {
    // Given: golden-masters/QUALITY_CRITERIA.md
    // When: file read
    // Then: contains SOW and Spec criteria
    const content = fs.readFileSync('golden-masters/QUALITY_CRITERIA.md', 'utf-8');
    expect(content).toContain('SOW Quality Criteria');
    expect(content).toContain('Spec Quality Criteria');
    expect(content).toContain('Pass Threshold: 80/100');
  });

  it('[→] sow-spec-reviewer scores against golden masters', () => {
    // Given: generated SOW and golden master
    // When: reviewer runs
    // Then: score >=80/100
    const score = reviewSOW('generated-sow.md');
    expect(score).toBeGreaterThanOrEqual(80);
  });
});

describe('Phase 2-A: Command Split', () => {
  it('[→] /sow generates only sow.md', () => {
    // Given: feature description
    // When: /sow executed
    // Then: only sow.md created, no spec.md
    const output = execCommand('/sow "test feature"');
    expect(fs.existsSync(output.sow)).toBe(true);
    expect(fs.existsSync(output.spec)).toBe(false);
  });

  it('[→] /spec generates only spec.md', () => {
    // Given: existing sow.md
    // When: /spec executed
    // Then: only spec.md created
    const output = execCommand('/spec');
    expect(fs.existsSync(output.spec)).toBe(true);
  });

  it('[→] /think orchestrates /sow + /spec', () => {
    // Given: feature description
    // When: /think executed
    // Then: both sow.md and spec.md created via delegation
    const output = execCommand('/think "test feature"');
    expect(fs.existsSync(output.sow)).toBe(true);
    expect(fs.existsSync(output.spec)).toBe(true);
    expect(output.thinkLines).toBeLessThan(100); // Thin wrapper
  });

  it('[✓] /think maintains compatibility', () => {
    // Given: existing project using /think
    // When: new /think executed
    // Then: same output structure
    const oldOutput = execCommand('/think "feature"', { version: 'old' });
    const newOutput = execCommand('/think "feature"', { version: 'new' });
    expect(newOutput.structure).toEqual(oldOutput.structure);
  });
});

describe('Phase 2-B: Command Simplification', () => {
  it('[→] /fix reduced to 200-300 lines', () => {
    // Given: current fix.md (546 lines)
    // When: modularization complete
    // Then: fix.md <300 lines, submodules exist
    const content = fs.readFileSync('commands/fix.md', 'utf-8');
    const lines = content.split('\n').length;
    expect(lines).toBeLessThan(300);
    expect(fs.existsSync('commands/fix/investigation.md')).toBe(true);
    expect(fs.existsSync('commands/fix/repair.md')).toBe(true);
    expect(fs.existsSync('commands/fix/testing.md')).toBe(true);
  });

  it('[→] /research reduced to 150-200 lines', () => {
    // Given: current research.md (660 lines)
    // When: simplification complete
    // Then: research.md <200 lines
    const content = fs.readFileSync('commands/research.md', 'utf-8');
    const lines = content.split('\n').length;
    expect(lines).toBeLessThan(200);
  });

  it('[→] no commands exceed 500 lines', () => {
    // Given: all command files
    // When: line counts calculated
    // Then: all <500 lines
    const commands = glob.sync('commands/*.md');
    commands.forEach(cmd => {
      const lines = fs.readFileSync(cmd, 'utf-8').split('\n').length;
      expect(lines).toBeLessThan(500);
    });
  });
});
```

### 4.2 Integration Tests

```typescript
describe('Workflow Integration', () => {
  it('[→] /research → /sow → /spec flow', () => {
    // Given: research context
    // When: /research → /sow → /spec executed
    // Then: context auto-loaded, artifacts consistent
    execCommand('/research "auth options"');
    const sowOutput = execCommand('/sow'); // Auto-detects context
    const specOutput = execCommand('/spec'); // Auto-detects sow

    expect(sowOutput.content).toContain('authentication');
    expect(specOutput.content).toContain('FR-001'); // References SOW
  });

  it('[→] sow-spec-reviewer integration', () => {
    // Given: generated SOW and Spec
    // When: reviewer runs
    // Then: scores >=80/100
    execCommand('/think "test feature"');
    const sowScore = reviewSOW('latest-sow.md');
    const specScore = reviewSpec('latest-spec.md');

    expect(sowScore).toBeGreaterThanOrEqual(80);
    expect(specScore).toBeGreaterThanOrEqual(80);
  });

  it('[→] /code uses reduced context', () => {
    // Given: reduced context
    // When: /code executed
    // Then: references essential principles only
    const codeOutput = execCommand('/code "implement auth"');
    const contextUsed = analyzeContext(codeOutput);

    expect(contextUsed.totalLines).toBeLessThan(1500);
    expect(contextUsed.essential).toContain('TDD/RGRC');
    expect(contextUsed.essential).toContain('Occam\'s Razor');
  });
});

describe('Performance Metrics', () => {
  it('[→] token usage reduced by 40-50%', () => {
    // Given: before/after context
    // When: /code executed
    // Then: token usage reduced
    const before = execCommand('/code "feature"', { context: 'original' });
    const after = execCommand('/code "feature"', { context: 'reduced' });

    const reduction = (before.tokens - after.tokens) / before.tokens;
    expect(reduction).toBeGreaterThanOrEqual(0.40); // 40%+ reduction
  });

  it('[?] response time improved by 10-20%', () => {
    // Given: before/after context
    // When: /code executed
    // Then: response time improved
    const before = measureTime(() => execCommand('/code "feature"', { context: 'original' }));
    const after = measureTime(() => execCommand('/code "feature"', { context: 'reduced' }));

    const improvement = (before - after) / before;
    expect(improvement).toBeGreaterThanOrEqual(0.10); // 10%+ improvement
  });
});
```

### 4.3 E2E Tests

```typescript
describe('Complete Workflow', () => {
  it('[→] full-cycle with reduced context', () => {
    // Given: feature description
    // When: /full-cycle executed
    // Then: all steps complete, quality maintained
    const output = execCommand('/full-cycle "add OAuth"');

    expect(output.research).toBeDefined();
    expect(output.sow).toBeDefined();
    expect(output.spec).toBeDefined();
    expect(output.code).toBeDefined();
    expect(output.tests).toBeDefined();
    expect(output.audit).toBeDefined();
    expect(output.validate).toBeDefined();

    // Quality check
    expect(output.sowScore).toBeGreaterThanOrEqual(80);
    expect(output.specScore).toBeGreaterThanOrEqual(80);
  });

  it('[?] new project setup', () => {
    // Given: fresh environment
    // When: initial setup runs
    // Then: all structures created
    const setup = setupNewProject();

    expect(fs.existsSync(setup.goldenMasters)).toBe(true);
    expect(fs.existsSync(setup.commands)).toBe(true);
    expect(fs.existsSync(setup.skills)).toBe(true);
  });
});
```

---

## 5. Non-Functional Requirements

### 5.1 Performance

[→] NFR-001: コンテキスト効率化によるトークン使用量削減

- **Target**: 冗長な詳細説明を参照リンクに置き換え、必須機能は維持
- **Measurement**: API使用量ログ比較（Before/After）
- **Success Criteria**: 機能維持の結果としてトークン使用量が削減される
- **注意**: 行数は目標ではなく、機能担保の結果として確認

[?] NFR-002: 応答速度の向上

- **Target**: Context Confusionの軽減による応答品質向上
- **Measurement**: レスポンスタイム計測（Before/After）
- **Success Criteria**: 機能維持の結果として応答速度改善が見込まれる

[→] NFR-003: Context Confusionの軽減

- **Target**: S/N比向上（定性的評価）
- **Measurement**: プロンプト品質スコア（sow-spec-reviewer）
- **Success Criteria**: 80/100以上を安定して達成

### 5.2 Maintainability

[→] NFR-004: コマンドの責務明確化

- **Target**: 各コマンドが必須機能を維持しながら、詳細をサブモジュールに委譲
- **Measurement**: 必須機能の動作確認
- **Success Criteria**: 全コマンドの必須機能が正常動作、詳細は適切に委譲されている
- **検証指標（結果確認用）**: 行数は詳細委譲の結果として確認

[→] NFR-005: モジュール化の推進

- **Target**: `/code`パターンの適用（オーケストレーション + サブモジュール）
- **Measurement**: サブモジュールの存在確認、必須機能の動作確認
- **Success Criteria**: `/fix`がオーケストレーションとして機能し、詳細が`fix/`サブモジュールに委譲

[→] NFR-006: Golden Mastersによる品質基準

- **Target**: 50+ファイル蓄積、80/100合格ライン
- **Measurement**: ファイル数とスコアリング結果
- **Success Criteria**: 新規成果物が安定して80/100以上

### 5.3 Compatibility

[✓] NFR-007: 既存ワークフローとの互換性

- **Target**: `/think`が同じ成果物を生成
- **Measurement**: 既存プロジェクトでのテスト
- **Success Criteria**: すべての既存プロジェクトで動作

[→] NFR-008: 段階的な移行

- **Target**: Phase 1 → Phase 2 → Phase 3の順序実行
- **Measurement**: 各フェーズの効果測定
- **Success Criteria**: 各フェーズでロールバック可能

### 5.4 Usability

[?] NFR-009: 学習コストの低減

- **Target**: 新規メンバーのオンボーディング時間30%短縮
- **Measurement**: オンボーディング時間計測
- **Success Criteria**: ドキュメント改善により学習時間短縮

[→] NFR-010: ドキュメントの明確性

- **Target**: すべてのコマンドにusage examplesを含む
- **Measurement**: ドキュメント内容確認
- **Success Criteria**: 新規ユーザーが独立して実行可能

---

## 6. Dependencies

### 6.1 External Libraries

[✓] None - 純粋なMarkdownファイル操作

### 6.2 Internal Services

[✓] **SlashCommand Tool**: コマンド連鎖実行

- 用途: `/think`での`/sow` → `/spec`実行
- Version: 1.0.123+

[✓] **Task Tool**: サブエージェント呼び出し

- 用途: `sow-spec-reviewer`呼び出し
- Agent: `sow-spec-reviewer`

[✓] **Read Tool**: ファイル読み取り

- 用途: Golden Master参照、SOW/Spec読み取り

[✓] **Write Tool**: ファイル生成

- 用途: SOW/Spec生成

[✓] **TodoWrite Tool**: 進捗管理

- 用途: 実装チェックリストの管理

### 6.3 Internal Dependencies

[✓] **Golden Masters**: テンプレート参照

- Path: `~/.claude/golden-masters/documents/`
- Required: sow/, spec/, summary/, research/

[→] **QUALITY_CRITERIA.md**: 品質基準

- Path: `~/.claude/golden-masters/QUALITY_CRITERIA.md`
- Status: Phase 1-Bで作成

[✓] **CLAUDE.md**: 優先度ルール

- Path: `~/.claude/CLAUDE.md`
- Section: P2 DEFAULT, P3 CONTEXTUAL

---

## 7. Known Issues & Assumptions

### Verified Facts (✓)

[✓] **既存の強み**:

- `/code`は既にモジュール分割済み（ADR 0001）
- Golden Masters構造は存在（22ファイル）
- TodoWrite統合による進捗管理機能あり

### Working Assumptions (→)

[→] **効果の仮定**:

1. コンテキスト削減により応答速度とコストが改善される
2. Golden Master手法でプロンプト品質を定量化できる
3. コマンド簡素化により保守性が向上する
4. 段階的な改善により既存ワークフローを破壊しない

[→] **技術的仮定**:

1. SlashCommand toolが安定して動作する
2. sow-spec-reviewerが80/100基準で運用可能
3. `/code`パターンが他のコマンドにも適用可能

### Unknown / Need Verification (?)

[?] **測定・評価**:

1. コンテキストサイズがLLM性能に影響する具体的な閾値
2. プロンプト品質改善の定量的指標（主観評価以外）
3. Golden Masterの最適な蓄積数（50？100？）

[?] **実装の詳細**:

1. 最適なコマンド行数のガイドライン（100？200？）
2. テンプレート外部化のベストプラクティス
3. ツール非依存化の実現可能性とROI

[?] **チーム運用**:

1. 新しいワークフローの学習コスト
2. 既存プロジェクトへの適用難易度
3. チームメンバーの受容性

---

## 8. Implementation Checklist

### Phase 1-A: コンテキスト最小化（Day 1-2）

**Day 1: 必須機能の特定と設計**

- [ ] [→] applying-code-principlesの機能分析
  - 必須機能の特定: Quick Decision Questions、Priority Order、参照リンク構造
  - 冗長性の特定: SOLID詳細等（Claudeは既知の概念）
- [ ] [→] 削減対象の選定
  - 冗長な詳細説明リスト作成
  - 参照リンク先の確認（rules/reference/）
- [ ] [→] CLAUDE.md改修設計
  - P2 DEFAULTの明確化
  - P3 CONTEXTUALの分離

**Day 2: 実装と機能検証**

- [ ] [→] applying-code-principles/SKILL.md編集
  - 必須機能を維持（Quick Decision Questions、Priority Order）
  - 冗長な詳細説明を参照リンクに置き換え
- [ ] [→] 機能検証（最重要）
  - `/code`実行でTDD/RGRCサイクルが正常動作
  - 品質ゲートが機能する
  - 出力品質確認（機能低下なし）
- [ ] [→] 結果確認（参考値）
  - 行数変化を記録（結果の確認として）
  - トークン使用量変化を記録（結果の確認として）

### Phase 1-B: Golden Masters蓄積（Day 2-3）

**Day 2: 既存成果物レビュー**

- [ ] [✓] 過去のsow.md/spec.mdから優秀な例を選定
  - workspace/planning/配下を検索
  - sow-spec-reviewerで評価（80/100以上）
- [ ] [→] 選定基準の確立
  - 構造の一貫性
  - マーカーの適切な使用
  - 定量的な現状分析

**Day 3: 蓄積と文書化**

- [ ] [✓] golden-masters/への追加
  - documents/sow/に15+ファイル
  - documents/spec/に15+ファイル
  - documents/summary/に10+ファイル
  - 各ファイルに選定理由コメント
- [ ] [→] QUALITY_CRITERIA.md作成
  - SOW評価基準
  - Spec評価基準
  - Anti-patterns集

### Phase 2-A: /thinkコマンド再設計（Day 4-6）

**Day 4: /sowコマンド独立化**

- [ ] [→] 必須機能の抽出
  - SOW生成に必要な機能を特定
  - TodoWrite統合機能、研究コンテキスト自動検出を維持
- [ ] [→] commands/sow.md作成
  - sow.md生成のみに特化
  - 必須機能を全て含む
- [ ] [→] 機能検証
  - 単独動作確認、生成ファイルが必須セクションを含むか確認

**Day 5: /specコマンド独立化**

- [ ] [→] 必須機能の抽出
  - Spec生成に必要な機能を特定
  - sow.md自動検出機能、Golden Master参照を維持
- [ ] [→] commands/spec.md作成
  - spec.md生成のみに特化
  - 必須機能を全て含む
- [ ] [→] 機能検証
  - sow.md → spec.mdフロー確認

**Day 6: /thinkオーケストレーション化**

- [ ] [→] commands/think.md改修
  - 必須機能を維持: sow.md + spec.md両方を生成
  - 詳細を/sow → /specに委譲（SlashCommand tool使用）
- [ ] [✓] 機能検証（最重要）
  - 同じ成果物を生成
  - 既存プロジェクトでの動作確認
  - 研究コンテキスト自動検出が機能するか確認

### Phase 2-B: コマンド簡素化（Day 7-10）

**Day 7-8: /fixのモジュール分割**

- [ ] [→] 必須機能の確認
  - バグ調査→修正→テストの一連フロー
  - 開発環境での迅速な修正
  - 既存の/fix使用方法との互換性
- [ ] [→] commands/fix/ディレクトリ作成
  - investigation.md（詳細な調査手順）
  - repair.md（詳細な修正手順）
  - testing.md（詳細なテスト手順）
- [ ] [→] commands/fix.mdをオーケストレーション化
  - 必須機能を維持
  - 詳細をサブモジュールに委譲
- [ ] [→] 機能検証
  - /fix実行でバグ修正フローが正常動作

**Day 9: /researchの簡素化**

- [ ] [→] 必須機能の確認
  - 調査結果の永続化、コンテキスト生成、実装なしの探索
- [ ] [→] 詳細をgolden-masters/に移行
  - テンプレートを documents/research/ に
  - コマンド本体はオーケストレーションに集中
- [ ] [→] 機能検証
  - /research実行で調査結果が適切に保存される

**Day 10: /rulifyの簡素化**

- [ ] [→] 必須機能の確認
  - ADRからルール生成、CLAUDE.md統合
- [ ] [→] テンプレート外部化
  - テンプレートを外部ファイルに移行
- [ ] [→] 機能検証
  - /rulify実行でルールが正常生成・統合される

### Phase 3: ツール非依存化（検討中）

- [ ] [?] Phase 1-2の効果測定完了後に実施を判断
- [ ] [?] docs/principles/ディレクトリ作成
- [ ] [?] rules/reference/の内容をdocs/principles/に移行
- [ ] [?] CLAUDE.mdを50行以下に削減

---

## 9. Migration Guide

### For Existing Users

#### /thinkコマンドの変更

**変更前**:

```bash
/think "Add user authentication"
# 直接sow.md + spec.mdを生成
```

**変更後**:

```bash
/think "Add user authentication"
# 内部的に /sow → /spec を実行
# 成果物は同じ（sow.md + spec.md）
```

**互換性**: 使い方は変わりません。内部実装のみ変更。

#### 新しいコマンド

**SOWのみ生成**:

```bash
/sow "Add user authentication"
# sow.mdのみ生成
```

**Specのみ生成**:

```bash
/spec
# 最新のsow.mdを自動検出してspec.md生成
```

#### コンテキスト

**必須原則（常にロード）**:

- TDD/RGRC
- Occam's Razor

**参照原則（必要に応じて）**:

- SOLID、DRY、Miller's Law、YAGNI等
- 詳細は rules/reference/ にリンク

#### Golden Masters

**新機能**:

- `golden-masters/`に理想的なSOW/Spec例が蓄積
- `QUALITY_CRITERIA.md`で品質基準を確認
- `sow-spec-reviewer`で80/100以上を目指す

### Breaking Changes

**なし** - すべての変更は後方互換性を維持

### Rollback Procedure

Phase 1-2の各段階でロールバック可能:

```bash
# Git revert
git revert <commit-hash>

# または手動復元
cp backups/commands/think.md commands/think.md
cp backups/skills/applying-code-principles/SKILL.md skills/applying-code-principles/SKILL.md
```

---

## 10. References

**SOW**: `.claude/workspace/planning/2025-12-23-ese-spec-kit-integration/sow.md`

**Research**:

- 詳細分析: `~/.claude/workspace/research/2025-12-16-spec-driven-workflow-improvement.md`
- コンテキスト: `~/.claude/workspace/research/2025-12-16-spec-driven-workflow-improvement-context.md`

**元記事**:

- Zenn: <https://zenn.dev/mk668a/articles/9ddbb21461a120>

**関連ADR**:

- ADR 0001: `/code`モジュール分割の決定

**Golden Masters**:

- SOW: `~/.claude/golden-masters/documents/sow/example-workflow-improvement.md`
- Spec: `~/.claude/golden-masters/documents/spec/example-workflow-improvement.md`
- Summary: `~/.claude/golden-masters/documents/summary/example-workflow-improvement.md`

**既存ドキュメント**:

- CLAUDE.md: 優先度ルール
- COMMANDS.md: コマンド一覧
- PRINCIPLES_GUIDE.md: 原則適用ガイド

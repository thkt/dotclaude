<!--
Golden Master: Spec - Workflow Improvement

選定理由:
- sow-spec-reviewer スコア: 95/100
- FR-001～FR-010の明確な機能要件定義
- TypeScript interfaceによるデータモデル定義
- Given-When-Then形式のテストシナリオ
- 移行ガイド（Migration Guide）の充実

特徴:
- SOWのAcceptance CriteriaとFRの1:1対応
- 実装詳細（Implementation Details）の具体性
- NFRの測定可能性

参照元: ~/.claude/workspace/planning/2025-12-16-spec-driven-workflow-improvement/
-->

# Specification: Spec駆動開発プラクティスに基づくワークフロー改善

Version: 1.0.0
Based on: SOW v1.0.0
Last Updated: 2025-12-16

---

## 1. Functional Requirements

### 1.1 Phase 1: ゴールデンマスター導入

[✓] FR-001: golden-masters/ ディレクトリ構造作成

- Input: なし
- Output: ディレクトリ構造
- Validation: 以下の構造が存在すること

```text
~/.claude/golden-masters/
├── sow/
│   └── example-*.md      # 理想的なSOW例
├── spec/
│   └── example-*.md      # 理想的なSpec例
└── README.md             # 使用方法・品質基準
```

[→] FR-002: 品質基準ドキュメント作成

- Input: 既存の優れたSOW/Spec
- Output: README.md（品質基準）
- Validation: 以下の項目を含むこと
  - 評価観点（構造、明確性、実行可能性）
  - スコアリング方法
  - 比較プロセス

[→] FR-003: 理想例の蓄積

- Input: 過去のSOW/Spec
- Output: 3+の理想例
- Validation: 各例に選定理由のコメント

### 1.2 Phase 2: コンテキスト最小化

[→] FR-004: 必須原則と参照原則の分離

- Input: 現在のスキル・ルール参照
- Output: 分離されたコンテキスト設計
- Validation: 以下の分類

```markdown
## 必須原則（常にロード）
- TDD/RGRC（実装の基本サイクル）
- Occam's Razor（判断基準）

## 参照原則（必要時のみ）
- SOLID（設計時）
- DRY（リファクタリング時）
- Frontend Patterns（UI実装時）
```

[→] FR-005: /code コマンドのコンテキスト削減

- Input: 現在の/code.md（254行 + 2,827行参照）
- Output: 削減された/code.md
- Validation: 参照コンテキスト 1,500行以下

### 1.3 Phase 3: コマンド分割

[→] FR-006: /sow コマンド作成

- Input: 機能説明
- Output: sow.md のみ
- Validation: 単一成果物

[→] FR-007: /spec コマンド作成

- Input: sow.md（またはなし）
- Output: spec.md のみ
- Validation: 単一成果物

[→] FR-008: /think の薄いオーケストレーター化

- Input: 機能説明
- Output: /sow → /spec の連鎖実行
- Validation: 100行以下

### 1.4 Phase 4: 指示の簡素化

[→] FR-009: テンプレート外部化

- Input: 現在のコマンド内テンプレート
- Output: templates/ ディレクトリ
- Validation: 以下の構造

```text
~/.claude/templates/
├── sow.md           # SOWテンプレート
├── spec.md          # Specテンプレート
└── review-report.md # レビューレポートテンプレート
```

[→] FR-010: 巨大コマンドのリファクタリング

- Input: 500行超のコマンド
- Output: 200行以下のコマンド
- Validation: 核心的な指示のみ残す

---

## 2. Data Model

### 2.1 ディレクトリ構造

```typescript
interface WorkflowStructure {
  // ゴールデンマスター
  goldenMasters: {
    sow: string[];      // ~/.claude/golden-masters/sow/*.md
    spec: string[];     // ~/.claude/golden-masters/spec/*.md
    readme: string;     // ~/.claude/golden-masters/README.md
  };

  // テンプレート
  templates: {
    sow: string;        // ~/.claude/templates/sow.md
    spec: string;       // ~/.claude/templates/spec.md
  };

  // コマンド
  commands: {
    sow: string;        // ~/.claude/commands/sow.md (新規)
    spec: string;       // ~/.claude/commands/spec.md (新規)
    think: string;      // ~/.claude/commands/think.md (簡素化)
  };
}
```

### 2.2 コンテキスト分類

```typescript
interface ContextClassification {
  // 必須（常にロード）
  essential: {
    tddRgrc: string;      // TDD/RGRC cycle
    occamsRazor: string;  // 判断基準
  };

  // 参照（タスクタイプ別）
  reference: {
    design: string[];     // SOLID, DRY
    frontend: string[];   // Container/Presentational, Hooks
    testing: string[];    // Test patterns
  };
}
```

---

## 3. Implementation Details

### 3.1 Phase 1: ゴールデンマスター

#### ディレクトリ作成

```bash
mkdir -p ~/.claude/golden-masters/{sow,spec}
```

#### README.md 内容

```markdown
# Golden Masters - プロンプト品質基準

## 目的
理想的な成果物例を蓄積し、プロンプトチューニングの基準とする。

## 品質基準

### SOW評価観点
1. **構造**: 必須セクションの網羅（25点）
2. **明確性**: ✓/→/? マーカーの適切な使用（25点）
3. **実行可能性**: 具体的なAcceptance Criteria（25点）
4. **リスク評価**: 現実的なリスクと軽減策（25点）

### Spec評価観点
1. **実装可能性**: コードに直接変換可能（25点）
2. **テスト可能性**: テストシナリオの明確さ（25点）
3. **SOW整合性**: SOWとの一貫性（25点）
4. **完全性**: エッジケースの網羅（25点）

## 使用方法
1. 新しいSOW/Specを生成
2. golden-masters内の例と比較
3. 差分を分析し、プロンプトを調整
```

### 3.2 Phase 2: コンテキスト最小化

#### 現在の参照構造

```text
/code.md (254行)
├── Skills (4ファイル, 1,320行)
│   ├── tdd-test-generation/SKILL.md: 258行 [必須]
│   ├── frontend-patterns/SKILL.md: 362行 [参照]
│   ├── code-principles/SKILL.md: 430行 [参照]
│   └── storybook-integration/SKILL.md: 270行 [参照]
├── Rules (4ファイル, 778行)
│   ├── PROGRESSIVE_ENHANCEMENT.md: 91行 [参照]
│   ├── READABLE_CODE.md: 217行 [参照]
│   ├── TDD_RGRC.md: 200行 [必須]
│   └── OCCAMS_RAZOR.md: 270行 [必須]
└── Submodules (6ファイル, 729行)
```

#### 改善後の参照構造

```text
/code.md (150行目標)
├── Essential (常にロード, 728行)
│   ├── tdd-test-generation/SKILL.md: 258行
│   ├── TDD_RGRC.md: 200行
│   └── OCCAMS_RAZOR.md: 270行
├── Conditional (タスクタイプ別)
│   ├── --frontend: frontend-patterns/SKILL.md
│   ├── --principles: code-principles/SKILL.md
│   └── --storybook: storybook-integration/SKILL.md
└── Submodules (必要時のみ参照)
```

### 3.3 Phase 3: コマンド分割

#### /sow.md（新規）

```markdown
---
description: Generate Statement of Work (SOW) only
allowed-tools: Read, Write, Glob, Grep, Task
argument-hint: "[feature description]"
---

# /sow - SOW Generator

## Purpose
Generate sow.md only (single artifact).

## Template
[@~/.claude/templates/sow.md]

## Output
.claude/workspace/planning/[timestamp]-[feature]/sow.md
```

#### /spec.md（新規）

```markdown
---
description: Generate Specification from SOW
allowed-tools: Read, Write, Glob, Grep
argument-hint: "[sow path or feature]"
---

# /spec - Spec Generator

## Purpose
Generate spec.md from sow.md (single artifact).

## Input
- SOW file path, or
- Auto-detect latest SOW

## Template
[@~/.claude/templates/spec.md]

## Output
.claude/workspace/planning/[same-dir]/spec.md
```

#### /think.md（簡素化後）

```markdown
---
description: Orchestrate /sow and /spec generation
allowed-tools: SlashCommand, Read
argument-hint: "[feature description]"
---

# /think - Planning Orchestrator

## Purpose
Orchestrate SOW and Spec generation.

## Process
1. Execute /sow "[feature]"
2. Execute /spec
3. Invoke sow-spec-reviewer

## Usage
/think "Add user authentication"
→ Generates sow.md + spec.md + review
```

---

## 4. Test Scenarios

### 4.1 Unit Tests

```typescript
describe('Phase 1: Golden Masters', () => {
  it('[✓] creates golden-masters directory structure', () => {
    // Given: fresh environment
    // When: setup script runs
    // Then: directories exist at expected paths
  });

  it('[→] validates SOW against golden master', () => {
    // Given: generated SOW and golden master
    // When: comparison runs
    // Then: diff report shows deviations
  });
});

describe('Phase 2: Context Minimization', () => {
  it('[→] reduces /code context to <1500 lines', () => {
    // Given: updated /code.md
    // When: context size calculated
    // Then: total < 1500 lines
  });
});

describe('Phase 3: Command Split', () => {
  it('[→] /sow generates only sow.md', () => {
    // Given: feature description
    // When: /sow executed
    // Then: only sow.md created, no spec.md
  });

  it('[→] /spec generates only spec.md', () => {
    // Given: existing sow.md
    // When: /spec executed
    // Then: only spec.md created
  });
});
```

### 4.2 Integration Tests

```typescript
describe('Workflow Integration', () => {
  it('[→] /think orchestrates /sow and /spec', () => {
    // Given: feature description
    // When: /think executed
    // Then: both sow.md and spec.md created via delegation
  });

  it('[→] context file auto-loaded in /sow', () => {
    // Given: research context file exists
    // When: /sow executed
    // Then: SOW includes research findings
  });
});
```

---

## 5. Non-Functional Requirements

### 5.1 Performance

[→] NFR-001: コンテキスト削減による応答時間改善

- Target: 測定可能な改善（ベースライン比較）

### 5.2 Maintainability

[→] NFR-002: 各コマンド 200行以下

- Target: 誰でも修正・改善可能な可読性

[→] NFR-003: テンプレート外部化

- Target: コマンドとテンプレートの分離

### 5.3 Compatibility

[✓] NFR-004: 既存ワークフローとの互換性

- /think は引き続き動作（内部で/sow + /spec呼び出し）
- 成果物のパスは変更なし

---

## 6. Dependencies

### 6.1 External Libraries

[✓] なし - 純粋なMarkdownファイル操作

### 6.2 Internal Services

[✓] SlashCommand: コマンド連鎖実行
[✓] Task: sow-spec-reviewer呼び出し
[✓] Write: ファイル生成

---

## 7. Known Issues & Assumptions

### Assumptions (→)

1. [→] コンテキスト削減がLLM出力品質を向上させる
2. [→] コマンド分割が保守性を向上させる
3. [→] ゴールデンマスター比較が品質定量化に有効

### Unknown / Need Verification (?)

1. [?] 最適なコンテキストサイズの閾値
2. [?] テンプレート外部化のパフォーマンス影響
3. [?] ユーザーの学習コスト

---

## 8. Implementation Checklist

### Phase 1: ゴールデンマスター（Day 1）

- [ ] golden-masters/ ディレクトリ作成
- [ ] README.md（品質基準）作成
- [ ] 既存SOW/Specから3例選定・コピー

### Phase 2: コンテキスト最小化（Day 2）

- [ ] 必須/参照原則の分類ドキュメント作成
- [ ] /code.md の参照構造更新
- [ ] コンテキストサイズ再計測

### Phase 3: コマンド分割（Day 3-4）

- [ ] /sow.md 新規作成
- [ ] /spec.md 新規作成
- [ ] /think.md 簡素化
- [ ] templates/ ディレクトリ作成
- [ ] sow.md テンプレート外部化
- [ ] spec.md テンプレート外部化

### Phase 4: 指示の簡素化（Day 5+）

- [ ] /fix.md モジュール分割
- [ ] /research.md 簡素化
- [ ] /rulify.md 簡素化
- [ ] 各コマンド 200行以下確認

---

## 9. Migration Guide

### 既存ユーザー向け

```markdown
## 変更点

### /think コマンド
- **Before**: 直接 sow.md + spec.md を生成
- **After**: /sow + /spec を内部呼び出し
- **互換性**: 使用方法に変更なし

### 新しいコマンド
- `/sow`: SOWのみ生成したい場合
- `/spec`: Specのみ生成したい場合

### コンテキスト
- 必須原則は常にロード
- 追加原則は --frontend, --principles 等で指定可能
```

---

## 10. References

- SOW: `sow.md`
- リサーチ: `~/.claude/workspace/research/2025-12-16-spec-driven-workflow-improvement.md`
- ADR 0001: /code モジュール分割

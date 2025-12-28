# Specification: 日英ドキュメント完全同期プロジェクト

Version: 1.0.0
Based on: SOW v1.0.0
Last Updated: 2025-12-20

---

## 1. Functional Requirements

### 1.0 Phase 0: 最適化新規ファイル翻訳（30分）

[✓] FR-000: PRINCIPLE_RELATIONSHIPS.md翻訳

- Input: `/Users/thkt/.claude/rules/PRINCIPLE_RELATIONSHIPS.md`
- Output: `/Users/thkt/.claude/ja/rules/PRINCIPLE_RELATIONSHIPS.md`
- Validation:
  - [ ] マトリックス表の翻訳完了
  - [ ] 原則名の一貫性（Occam's Razor→オッカムの剃刀等）
  - [ ] リファレンスリンクの動作確認

[✓] FR-001: PRE_TASK_CHECK_VERBOSE.md翻訳

- Input: `/Users/thkt/.claude/rules/core/PRE_TASK_CHECK_VERBOSE.md` (16KB)
- Output: `/Users/thkt/.claude/ja/rules/core/PRE_TASK_CHECK_VERBOSE.md`
- Validation:
  - [ ] 詳細フロー説明の翻訳
  - [ ] サンプルコードのコメント翻訳
  - [ ] PRE_TASK_CHECK_COMPACT.mdとの整合性

### 1.1 Phase 1: Core Rules同期（30分）

[✓] FR-002: ESSENTIAL_PRINCIPLES.md翻訳

- Input: `/Users/thkt/.claude/rules/core/ESSENTIAL_PRINCIPLES.md` (72行)
- Output: `/Users/thkt/.claude/ja/rules/core/ESSENTIAL_PRINCIPLES.md`
- Validation:
  - [ ] Markdown syntax valid
  - [ ] 相対リンクパス調整済み（`@./`→`@./`）
  - [ ] セクション構造の英日一致
  - [ ] 技術用語の一貫性（例: "Occam's Razor"→"オッカムの剃刀"）

[✓] FR-003: PRE_TASK_CHECK_COMPACT.md翻訳

- Input: `/Users/thkt/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md` (49行)
- Output: `/Users/thkt/.claude/ja/rules/core/PRE_TASK_CHECK_COMPACT.md`
- Validation:
  - [ ] プログレスバー表示の日本語化（"理解度"等）
  - [ ] コマンド例の翻訳
  - [ ] リファレンスリンクの動作確認

### 1.2 Phase 2: Guidesシリーズ翻訳（3-4時間）

[→] FR-004: part1-three-layer-architecture.md翻訳

- Input: `/Users/thkt/.claude/docs/guides/part1-three-layer-architecture.md`
- Output: `/Users/thkt/.claude/ja/docs/guides/part1-three-layer-architecture.md`
- Validation: Commands/Agents/Skillsの3層説明が明確

[→] FR-004: part2-research-investigation.md翻訳

- Input: `/Users/thkt/.claude/docs/guides/part2-research-investigation.md`
- Output: `/Users/thkt/.claude/ja/docs/guides/part2-research-investigation.md`
- Validation: /researchワークフローの手順が明確

[→] FR-005: part3-think-sow-spec.md翻訳

- Input: `/Users/thkt/.claude/docs/guides/part3-think-sow-spec.md`
- Output: `/Users/thkt/.claude/ja/docs/guides/part3-think-sow-spec.md`
- Validation: SOW/Spec生成プロセスが明確

[→] FR-006: part4-code-implementation.md翻訳

- Input: `/Users/thkt/.claude/docs/guides/part4-code-implementation.md`
- Output: `/Users/thkt/.claude/ja/docs/guides/part4-code-implementation.md`
- Validation: TDD/RGRCサイクルの説明が明確

[→] FR-007: part5-review-quality.md翻訳

- Input: `/Users/thkt/.claude/docs/guides/part5-review-quality.md`
- Output: `/Users/thkt/.claude/ja/docs/guides/part5-review-quality.md`
- Validation: /auditプロセスの説明が明確

[→] FR-008: part6-pre-task-check.md翻訳

- Input: `/Users/thkt/.claude/docs/guides/part6-pre-task-check.md`
- Output: `/Users/thkt/.claude/ja/docs/guides/part6-pre-task-check.md`
- Validation: PRE_TASK_CHECK統合説明が明確

### 1.3 Phase 3: Commands/codeモジュール翻訳（1-2時間）

[→] FR-009: code/completion.md翻訳

- Input: `/Users/thkt/.claude/commands/code/completion.md`
- Output: `/Users/thkt/.claude/ja/commands/code/completion.md`
- Validation: 完了判定基準の説明が明確

[→] FR-010: code/quality-gates.md翻訳

- Input: `/Users/thkt/.claude/commands/code/quality-gates.md`
- Output: `/Users/thkt/.claude/ja/commands/code/quality-gates.md`
- Validation: 品質ゲートの閾値が明確

[→] FR-011: code/rgrc-cycle.md翻訳

- Input: `/Users/thkt/.claude/commands/code/rgrc-cycle.md`
- Output: `/Users/thkt/.claude/ja/commands/code/rgrc-cycle.md`
- Validation: Red-Green-Refactor-Commitサイクルの説明が明確

[→] FR-012: code/spec-context.md翻訳

- Input: `/Users/thkt/.claude/commands/code/spec-context.md`
- Output: `/Users/thkt/.claude/ja/commands/code/spec-context.md`
- Validation: Spec参照方法の説明が明確

[→] FR-013: code/storybook.md翻訳

- Input: `/Users/thkt/.claude/commands/code/storybook.md`
- Output: `/Users/thkt/.claude/ja/commands/code/storybook.md`
- Validation: Storybook統合手順が明確

[→] FR-014: code/test-preparation.md翻訳

- Input: `/Users/thkt/.claude/commands/code/test-preparation.md`
- Output: `/Users/thkt/.claude/ja/commands/code/test-preparation.md`
- Validation: テスト準備フェーズの説明が明確

### 1.4 Phase 4: 差分ファイル同期（1-2時間）← 最適化後更新

[→] FR-015: PROGRESSIVE_ENHANCEMENT.md差分解消

- Input (EN): 89行（最適化後）、Input (JA): 51行
- Output: 差分-38行の内容確認と同期（改善: 元-46行）
- Validation: YAML frontmatter翻訳、削除された内容の意図確認

[→] FR-016: AI_OPERATION_PRINCIPLES.md差分解消

- Input (EN): 86行（最適化後）、Input (JA): 54行
- Output: 差分-32行の内容確認と同期（拡大: 元-30行）
- Validation: PRE_TASK_CHECK_VERBOSE.mdへの参照更新確認

[→] FR-017: OCCAMS_RAZOR.md差分解消

- Input (EN): 250行（最適化後）、Input (JA): 237行
- Output: 差分-13行の内容確認と同期（改善: 元-23行）
- Validation: YAML frontmatter翻訳、例示コードの一致確認

[→] FR-018: READABLE_CODE.md差分解消

- Input (EN): 247行、Input (JA): 246行
- Output: 差分-1行（大幅改善: 元-9行）
- Validation: ほぼ同期済み、YAML frontmatter確認のみ

[→] FR-019: LEAKY_ABSTRACTION.md差分解消（重要）

- Input (EN): 154行（大幅削減: 元244行）、Input (JA): 235行
- Output: 差分+81行（逆転: 元-9行）
- Validation: 英語版の大幅削減内容を確認、日本語版への反映方針決定

[→] FR-020: TIDYINGS.md差分解消

- Input (EN): 47行、Input (JA): 34行
- Output: 差分-13行（拡大: 元-9行）
- Validation: YAML frontmatter翻訳、内容確認

### 1.5 Phase 5: その他ファイル翻訳（2-3時間）

[→] FR-021: hookify関連3ファイル翻訳

- hookify.md
- hookify/configure.md
- hookify/list.md
- Validation: フックシステムの説明が明確

[→] FR-022: その他7ファイル翻訳

- issue.md
- docs/agents/reviewers/_base-template.md
- docs/adr/0001-code-command-responsibility-separation.md
- docs/designs/output-verification.md
- docs/designs/hookify-automation.md
- docs/CONTEXT_CLASSIFICATION.md
- Validation: 各ファイルの目的説明が明確

---

## 2. Data Model

### 2.1 File Metadata

```typescript
interface TranslationFile {
  // Source
  source: {
    path: string;           // 英語版パス
    lines: number;          // 行数
    exists: boolean;        // 存在確認
  };

  // Target
  target: {
    path: string;           // 日本語版パス（ja/配下）
    lines: number | null;   // 行数（未作成ならnull）
    exists: boolean;        // 存在確認
  };

  // Metadata
  priority: 1 | 2 | 3;      // 優先度（1=高、2=中、3=低）
  phase: 1 | 2 | 3 | 4 | 5; // 実装フェーズ
  category: 'core' | 'docs' | 'commands' | 'skills' | 'diff';

  // Validation
  validation: {
    markdownValid: boolean;     // Markdown構文検証
    linksValid: boolean;        // リンク動作確認
    structureMatch: boolean;    // 構造一致確認
    terminologyConsistent: boolean; // 技術用語一貫性
  };
}
```

### 2.2 Sync State

```typescript
interface SyncState {
  // Overall
  totalFiles: {
    en: number;               // 英語版総ファイル数
    ja: number;               // 日本語版総ファイル数
  };

  // Per Category
  categories: {
    rules: CategorySync;
    docs: CategorySync;
    commands: CategorySync;
    skills: CategorySync;
  };

  // Progress
  progress: {
    phase1: PhaseProgress;    // Core Rules
    phase2: PhaseProgress;    // Guides
    phase3: PhaseProgress;    // Commands/code
    phase4: PhaseProgress;    // 差分同期
    phase5: PhaseProgress;    // その他
  };
}

interface CategorySync {
  total: number;              // カテゴリ内総ファイル数
  synced: number;             // 同期済みファイル数
  missing: number;            // 欠落ファイル数
  diff: number;               // 差分ありファイル数
  syncRate: number;           // 同期率（%）
}

interface PhaseProgress {
  status: 'pending' | 'in_progress' | 'completed';
  filesTotal: number;         // フェーズ内総ファイル数
  filesCompleted: number;     // 完了ファイル数
  startedAt: string | null;   // 開始日時
  completedAt: string | null; // 完了日時
}
```

### 2.3 Translation Rules

```typescript
interface TranslationRules {
  // Technical Terms
  terminology: {
    [en: string]: string;     // 例: "Occam's Razor" → "オッカムの剃刀"
  };

  // Path Adjustments
  pathRules: {
    relativeLinkPrefix: string;  // "@./" → "@./"（変更なし）
    directoryDepth: number;      // ja/配下は+1階層深い
  };

  // Special Handling
  exceptions: {
    japanesOnlyFiles: string[];   // 日本語版専用ファイル
    skipTranslation: string[];    // 翻訳不要ファイル（コードのみ等）
  };
}
```

---

## 3. Implementation Details

### 3.1 Phase 1: Core Rules（30分）

#### Step-by-Step Process

```bash
# Step 1: Read source files
Read ~/.claude/rules/core/ESSENTIAL_PRINCIPLES.md
Read ~/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md

# Step 2: Translate with terminology consistency
# 技術用語マッピング:
# - "Occam's Razor" → "オッカムの剃刀"
# - "Miller's Law" → "ミラーの法則"
# - "SOLID" → "SOLID"（そのまま）
# - "DRY" → "DRY"（そのまま）

# Step 3: Write translated files
Write ~/.claude/ja/rules/core/ESSENTIAL_PRINCIPLES.md
Write ~/.claude/ja/rules/core/PRE_TASK_CHECK_COMPACT.md

# Step 4: Validate links
# 相対リンク例:
# - [@~/.claude/rules/reference/OCCAMS_RAZOR.md]
# → [@~/.claude/ja/rules/reference/OCCAMS_RAZOR.md]（パス変更なし）

# Step 5: Git commit
git add ja/rules/core/ESSENTIAL_PRINCIPLES.md ja/rules/core/PRE_TASK_CHECK_COMPACT.md
git commit -m "docs: Core Rules日本語版追加 (ESSENTIAL_PRINCIPLES, PRE_TASK_CHECK_COMPACT)"
```

#### Quality Checks

```typescript
function validateCoreRulesTranslation(file: TranslationFile): boolean {
  // Check 1: Markdown syntax
  const markdownValid = lintMarkdown(file.target.path);

  // Check 2: Relative links
  const linksValid = validateRelativeLinks(file.target.path);

  // Check 3: Structure match
  const structureMatch = compareStructure(file.source.path, file.target.path);

  // Check 4: Terminology consistency
  const terminologyConsistent = checkTerminology(file.target.path, terminologyMap);

  return markdownValid && linksValid && structureMatch && terminologyConsistent;
}
```

### 3.2 Phase 2: Guides（3-4時間）

#### Translation Workflow

```typescript
const guidesFiles = [
  'part1-three-layer-architecture.md',
  'part2-research-investigation.md',
  'part3-think-sow-spec.md',
  'part4-code-implementation.md',
  'part5-review-quality.md',
  'part6-pre-task-check.md',
];

async function translateGuides() {
  for (const file of guidesFiles) {
    const sourcePath = `~/.claude/docs/guides/${file}`;
    const targetPath = `~/.claude/ja/docs/guides/${file}`;

    // 1. Read source
    const sourceContent = await Read(sourcePath);

    // 2. Translate
    const translatedContent = await translateWithTerminology(sourceContent);

    // 3. Write target
    await Write(targetPath, translatedContent);

    // 4. Validate
    await validateTranslation(sourcePath, targetPath);
  }

  // 5. Commit all guides at once
  await gitCommit('docs: Guidesシリーズ日本語版追加 (part1-6)');
}
```

### 3.3 Phase 3: Commands/code（1-2時間）

#### Modular Translation

```typescript
const codeModules = [
  'completion.md',
  'quality-gates.md',
  'rgrc-cycle.md',
  'spec-context.md',
  'storybook.md',
  'test-preparation.md',
];

async function translateCodeModules() {
  for (const module of codeModules) {
    const sourcePath = `~/.claude/commands/code/${module}`;
    const targetPath = `~/.claude/ja/commands/code/${module}`;

    // Translate with ADR 0001 context
    const translatedContent = await translateWithContext(sourcePath, {
      adr: 'docs/adr/0001-code-command-responsibility-separation.md'
    });

    await Write(targetPath, translatedContent);
  }

  // Commit with ADR reference
  await gitCommit('docs: Commands/code モジュール日本語版追加 (ref: ADR 0001)');
}
```

### 3.4 Phase 4: 差分同期（1時間）

#### Diff Analysis Process

```typescript
interface FileDiff {
  file: string;
  enLines: number;
  jaLines: number;
  diff: number;
  reason: 'intentional' | 'omission' | 'update';
}

async function analyzeDiff(file: FileDiff): Promise<string> {
  // 1. Read both versions
  const enContent = await Read(`~/.claude/${file.file}`);
  const jaContent = await Read(`~/.claude/ja/${file.file}`);

  // 2. Line-by-line comparison
  const lineDiff = compareLines(enContent, jaContent);

  // 3. Identify missing sections
  const missingSections = findMissingSections(lineDiff);

  // 4. Determine reason
  if (missingSections.length === 0) {
    return 'intentional'; // Natural translation variation
  } else if (missingSections.some(s => s.critical)) {
    return 'omission'; // Critical content missing
  } else {
    return 'update'; // EN version updated after JA translation
  }
}

async function syncDiff() {
  const diffFiles: FileDiff[] = [
    { file: 'rules/development/PROGRESSIVE_ENHANCEMENT.md', enLines: 97, jaLines: 51, diff: -46 },
    { file: 'rules/core/AI_OPERATION_PRINCIPLES.md', enLines: 84, jaLines: 54, diff: -30 },
    { file: 'rules/reference/OCCAMS_RAZOR.md', enLines: 260, jaLines: 237, diff: -23 },
    // ... other files
  ];

  for (const fileDiff of diffFiles) {
    const reason = await analyzeDiff(fileDiff);

    if (reason === 'omission') {
      // Add missing content to JA version
      await addMissingContent(fileDiff);
    } else if (reason === 'update') {
      // Update JA version with new EN content
      await updateContent(fileDiff);
    } else {
      // Document as intentional
      console.log(`${fileDiff.file}: Intentional variation (-${Math.abs(fileDiff.diff)} lines)`);
    }
  }

  await gitCommit('docs: Rules差分同期（PROGRESSIVE_ENHANCEMENT他6ファイル）');
}
```

### 3.5 Phase 5: その他（2-3時間）

#### Remaining Files Translation

```bash
# hookify関連
~/.claude/commands/hookify.md → ja/commands/hookify.md
~/.claude/commands/hookify/configure.md → ja/commands/hookify/configure.md
~/.claude/commands/hookify/list.md → ja/commands/hookify/list.md

# その他
~/.claude/commands/issue.md → ja/commands/issue.md
~/.claude/docs/agents/reviewers/_base-template.md → ja/docs/agents/reviewers/_base-template.md
~/.claude/docs/adr/0001-code-command-responsibility-separation.md → ja/docs/adr/0001-code-command-responsibility-separation.md
~/.claude/docs/designs/output-verification.md → ja/docs/designs/output-verification.md
~/.claude/docs/designs/hookify-automation.md → ja/docs/designs/hookify-automation.md
~/.claude/docs/CONTEXT_CLASSIFICATION.md → ja/docs/CONTEXT_CLASSIFICATION.md
```

---

## 4. Test Scenarios

### 4.1 Unit Tests

```typescript
describe('Phase 1: Core Rules Translation', () => {
  it('[✓] ESSENTIAL_PRINCIPLES.md is valid Japanese', () => {
    // Given: Translated file exists
    const file = '~/.claude/ja/rules/core/ESSENTIAL_PRINCIPLES.md';

    // When: Validation runs
    const result = validateMarkdown(file);

    // Then: All checks pass
    expect(result.markdownValid).toBe(true);
    expect(result.linksValid).toBe(true);
    expect(result.structureMatch).toBe(true);
  });

  it('[✓] PRE_TASK_CHECK_COMPACT.md has correct path adjustments', () => {
    // Given: Translated file with links
    const file = '~/.claude/ja/rules/core/PRE_TASK_CHECK_COMPACT.md';

    // When: Link validation runs
    const links = extractLinks(file);

    // Then: All relative links point to ja/ versions
    expect(links.every(link => link.includes('/ja/') || link.startsWith('@./'))).toBe(true);
  });
});

describe('Phase 2: Guides Translation', () => {
  it('[→] All 6 guides have matching structure', () => {
    // Given: All guides translated
    const guides = ['part1', 'part2', 'part3', 'part4', 'part5', 'part6'];

    // When: Structure comparison runs
    const results = guides.map(guide =>
      compareStructure(
        `~/.claude/docs/guides/${guide}-*.md`,
        `~/.claude/ja/docs/guides/${guide}-*.md`
      )
    );

    // Then: All structures match
    expect(results.every(r => r.match)).toBe(true);
  });
});

describe('Phase 4: Diff Sync', () => {
  it('[→] PROGRESSIVE_ENHANCEMENT.md diff is resolved', () => {
    // Given: EN version (97 lines) and JA version (51 lines)
    const enFile = '~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md';
    const jaFile = '~/.claude/ja/rules/development/PROGRESSIVE_ENHANCEMENT.md';

    // When: Diff analysis runs
    const diff = await analyzeDiff({ file: enFile, enLines: 97, jaLines: 51, diff: -46 });

    // Then: Reason is determined and documented
    expect(['intentional', 'omission', 'update']).toContain(diff);
  });
});
```

### 4.2 Integration Tests

```typescript
describe('Cross-Reference Links', () => {
  it('[→] All internal links work across EN and JA versions', () => {
    // Given: All files translated
    const allFiles = findAllMarkdownFiles('~/.claude/ja/');

    // When: Link validation runs
    const brokenLinks = [];
    for (const file of allFiles) {
      const links = extractLinks(file);
      for (const link of links) {
        if (!linkExists(link)) {
          brokenLinks.push({ file, link });
        }
      }
    }

    // Then: No broken links
    expect(brokenLinks).toHaveLength(0);
  });
});

describe('Terminology Consistency', () => {
  it('[→] Technical terms are translated consistently', () => {
    // Given: All translated files
    const allFiles = findAllMarkdownFiles('~/.claude/ja/');

    // When: Terminology check runs
    const inconsistencies = [];
    for (const file of allFiles) {
      const terms = extractTechnicalTerms(file);
      for (const term of terms) {
        if (!isConsistentWithMap(term, terminologyMap)) {
          inconsistencies.push({ file, term });
        }
      }
    }

    // Then: All terms are consistent
    expect(inconsistencies).toHaveLength(0);
  });
});
```

### 4.3 E2E Tests

```typescript
describe('Complete Sync Workflow', () => {
  it('[✓] Sync rate reaches 100%', async () => {
    // Given: All phases completed
    await completeAllPhases();

    // When: Sync rate calculation runs
    const syncRate = calculateSyncRate();

    // Then: 100% achieved
    expect(syncRate).toBe(100);
  });

  it('[?] /context command shows balanced token usage', async () => {
    // Given: Complete sync
    await completeAllPhases();

    // When: /context command runs
    const context = await runContextCommand();

    // Then: Token usage is balanced (EN and JA roughly equal)
    const ratio = context.jaTokens / context.enTokens;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.2);
  });
});
```

---

## 5. Non-Functional Requirements

### 5.1 Translation Quality

[→] NFR-001: 技術用語の一貫性

- Target: 100% consistency with terminologyMap
- Measurement: 自動チェックスクリプト

[→] NFR-002: 構造一致度

- Target: 100% section header match between EN/JA
- Measurement: Structure comparison tool

### 5.2 Maintainability

[→] NFR-003: Markdown linting

- Target: Zero linting errors
- Tool: markdownlint or similar

[→] NFR-004: Git commit clarity

- Target: All commits follow Conventional Commits format
- Format: `docs: <scope> <description>`

### 5.3 Performance

[→] NFR-005: Translation speed

- Target: <10 minutes per file on average
- Measurement: Time tracking per phase

### 5.4 Accessibility

[→] NFR-006: クロスリファレンスの完全性

- Target: 100% of internal links work
- Measurement: Link validation script

---

## 6. Dependencies

### 6.1 External Tools

[✓] None - All operations use built-in Claude Code tools

### 6.2 Internal Tools

[✓] Read: ソースファイル読み込み
[✓] Write: ターゲットファイル書き込み
[✓] Bash: Git操作、ファイル数カウント
[✓] Glob: ファイル検索
[✓] Grep: 技術用語検索

### 6.3 Documentation Standards

[✓] DOCUMENTATION_RULES.md: 同期ルール定義
[✓] Research Report: 2025-12-20-ja-en-doc-sync.md

---

## 7. Known Issues & Assumptions

### Assumptions (→)

1. [→] 欠落ファイルは翻訳未実施（意図的削除ではない）
2. [→] 行数差分の大半は翻訳時の自然な省略
3. [→] 技術用語の一貫性維持が品質の鍵
4. [→] 段階的実行により既存ワークフローへの影響を最小化

### Unknown / Need Verification (?)

1. [?] PROGRESSIVE_ENHANCEMENT.md -46行差分の具体的理由
   - Mitigation: 詳細な行比較実施、原作者確認
2. [?] 日本語版専用ファイル（4個）の扱い
   - Options: 英語版作成 or DOCUMENTATION_RULES.md例外リスト追加
3. [?] 完全同期後の継続的メンテナンス方法
   - Mitigation: 自動チェックスクリプト作成、定期的なdiff確認

---

## 8. Implementation Checklist

### Phase 0: 最適化新規ファイル（Day 0 - 30分）

- [ ] Read PRINCIPLE_RELATIONSHIPS.md
- [ ] Translate matrix table with terminology consistency
- [ ] Write ja/rules/PRINCIPLE_RELATIONSHIPS.md
- [ ] Validate markdown, links, table structure
- [ ] Read PRE_TASK_CHECK_VERBOSE.md (16KB)
- [ ] Translate with flow diagrams and code examples
- [ ] Write ja/rules/core/PRE_TASK_CHECK_VERBOSE.md
- [ ] Validate against PRE_TASK_CHECK_COMPACT.md consistency
- [ ] Git commit: "docs: Rules最適化新規ファイル日本語版追加 (PRINCIPLE_RELATIONSHIPS, PRE_TASK_CHECK_VERBOSE)"
- [ ] Git push

### Phase 1: Core Rules（Day 1 - 30分）

- [ ] Read ESSENTIAL_PRINCIPLES.md (72行)
- [ ] Translate with terminology map
- [ ] Write ja/rules/core/ESSENTIAL_PRINCIPLES.md
- [ ] Validate markdown, links, structure
- [ ] Read PRE_TASK_CHECK_COMPACT.md (49行)
- [ ] Translate with terminology map
- [ ] Write ja/rules/core/PRE_TASK_CHECK_COMPACT.md
- [ ] Validate markdown, links, structure
- [ ] Git commit: "docs: Core Rules日本語版追加 (ESSENTIAL_PRINCIPLES, PRE_TASK_CHECK_COMPACT)"
- [ ] Git push

### Phase 2: Guides（Day 2-3 - 3-4時間）

- [ ] Translate part1-three-layer-architecture.md
- [ ] Translate part2-research-investigation.md
- [ ] Translate part3-think-sow-spec.md
- [ ] Translate part4-code-implementation.md
- [ ] Translate part5-review-quality.md
- [ ] Translate part6-pre-task-check.md
- [ ] Validate all 6 guides (markdown, links, structure)
- [ ] Cross-reference validation
- [ ] Git commit: "docs: Guidesシリーズ日本語版追加 (part1-6)"
- [ ] Git push

### Phase 3: Commands/code（Day 4 - 1-2時間）

- [ ] Translate code/completion.md
- [ ] Translate code/quality-gates.md
- [ ] Translate code/rgrc-cycle.md
- [ ] Translate code/spec-context.md
- [ ] Translate code/storybook.md
- [ ] Translate code/test-preparation.md
- [ ] Validate all 6 modules
- [ ] ADR 0001 reference consistency check
- [ ] Git commit: "docs: Commands/code モジュール日本語版追加 (ref: ADR 0001)"
- [ ] Git push

### Phase 4: 差分同期（Day 4 - 1-2時間）← 最適化後更新

- [ ] Analyze PROGRESSIVE_ENHANCEMENT.md diff (89 vs 51 = -38行、改善)
- [ ] Analyze AI_OPERATION_PRINCIPLES.md diff (86 vs 54 = -32行、拡大)
- [ ] Analyze OCCAMS_RAZOR.md diff (250 vs 237 = -13行、改善)
- [ ] Analyze READABLE_CODE.md diff (247 vs 246 = -1行、大幅改善)
- [ ] Analyze LEAKY_ABSTRACTION.md diff (154 vs 235 = +81行、逆転・要確認)
- [ ] Analyze TIDYINGS.md diff (47 vs 34 = -13行、拡大)
- [ ] Investigate LEAKY_ABSTRACTION.md massive reduction (244→154行)
- [ ] Translate YAML frontmatter for all 6 files
- [ ] Document diff reasons with optimization context
- [ ] Sync missing content based on analysis
- [ ] Git commit: "docs: Rules差分同期（最適化後、PROGRESSIVE_ENHANCEMENT他6ファイル）"
- [ ] Git push

### Phase 5: その他（Day 5 - 2-3時間）

- [ ] Translate hookify.md
- [ ] Translate hookify/configure.md
- [ ] Translate hookify/list.md
- [ ] Translate issue.md
- [ ] Translate docs/agents/reviewers/_base-template.md
- [ ] Translate docs/adr/0001-code-command-responsibility-separation.md
- [ ] Translate docs/designs/output-verification.md
- [ ] Translate docs/designs/hookify-automation.md
- [ ] Translate docs/CONTEXT_CLASSIFICATION.md
- [ ] Validate all 10 files
- [ ] Sync rate 100% verification: `find ~/.claude -name "*.md" | wc -l` vs `find ~/.claude/ja -name "*.md" | wc -l`
- [ ] Git commit: "docs: 残り欠落ファイル日本語版追加（完全同期達成）"
- [ ] Git push

### Post-Implementation Verification

- [ ] Run DOCUMENTATION_RULES.md checklist
- [ ] Cross-reference link validation (全件)
- [ ] Terminology consistency check (全件)
- [ ] Structure comparison (EN vs JA)
- [ ] `/context` command - Token usage balance check
- [ ] Final sync rate calculation

---

## 9. Migration Guide

### For Users

#### Before

```bash
# Some documents only available in English
~/.claude/docs/guides/part1-three-layer-architecture.md  ✓
~/.claude/ja/docs/guides/part1-three-layer-architecture.md  ✗ (Missing)
```

#### After

```bash
# Complete bilingual documentation
~/.claude/docs/guides/part1-three-layer-architecture.md  ✓
~/.claude/ja/docs/guides/part1-three-layer-architecture.md  ✓ (New!)
```

### No Breaking Changes

- 既存の英語版ドキュメントはそのまま
- 日本語版を追加するのみ
- 既存のクロスリファレンスリンクは動作継続

### New Features

- **完全な日本語ドキュメント**: 80%→100%
- **一貫した技術用語**: terminologyMap適用
- **ワークフロー学習コスト削減**: Guidesシリーズ利用可能

---

## 10. References

- **SOW**: `/Users/thkt/.claude/workspace/planning/2025-12-20-ja-en-doc-sync/sow.md`
- **Research Report**: `/Users/thkt/.claude/workspace/research/2025-12-20-ja-en-doc-sync.md`
- **Context File**: `/Users/thkt/.claude/workspace/research/2025-12-20-ja-en-doc-sync-context.md`
- **DOCUMENTATION_RULES**: `/Users/thkt/.claude/docs/DOCUMENTATION_RULES.md`
- **Golden Master Spec**: `~/.claude/golden-masters/documents/spec/example-workflow-improvement.md`

---

## Appendix A: Terminology Map

| English | 日本語 | Notes |
| --- | --- | --- |
| Occam's Razor | オッカムの剃刀 | 原則名 |
| Miller's Law | ミラーの法則 | 認知科学 |
| SOLID | SOLID | そのまま |
| DRY | DRY | そのまま |
| TDD | TDD | そのまま |
| Baby Steps | ベイビーステップ | 手法名 |
| Red-Green-Refactor-Commit | Red-Green-Refactor-Commit | サイクル名（英語保持） |
| Leaky Abstraction | 漏れのある抽象化 | 概念名 |
| Law of Demeter | デメテルの法則 | 原則名 |
| Progressive Enhancement | プログレッシブエンハンスメント | 手法名 |

## Appendix B: File Count Verification

```bash
# Expected final count (最適化により+2)
EN: 88 files (元86 + PRINCIPLE_RELATIONSHIPS.md + PRE_TASK_CHECK_VERBOSE.md)
JA: 88 files (80% → 100%)

# Verification command
find ~/.claude -name "*.md" -not -path "*/ja/*" | wc -l  # Should be 88
find ~/.claude/ja -name "*.md" | wc -l                    # Should be 88
```

## Appendix C: Git Commit Messages

```bash
# Phase 0
docs: Rules最適化新規ファイル日本語版追加 (PRINCIPLE_RELATIONSHIPS, PRE_TASK_CHECK_VERBOSE)

# Phase 1
docs: Core Rules日本語版追加 (ESSENTIAL_PRINCIPLES, PRE_TASK_CHECK_COMPACT)

# Phase 2
docs: Guidesシリーズ日本語版追加 (part1-6)

# Phase 3
docs: Commands/code モジュール日本語版追加 (ref: ADR 0001)

# Phase 4
docs: Rules差分同期（最適化後、PROGRESSIVE_ENHANCEMENT他6ファイル）

# Phase 5
docs: 残り欠落ファイル日本語版追加（完全同期達成）
```

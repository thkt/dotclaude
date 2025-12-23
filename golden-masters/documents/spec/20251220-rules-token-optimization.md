# SPEC: rules/ Directory Token Optimization

**Based on**: [sow.md](./sow.md)
**Created**: 2025-12-20
**Target**: `~/.claude/rules/` (42 files → 35-38 files, 4,233 lines → 2,700-3,200 lines)

---

## Functional Requirements

### FR-001: PRE_TASK_CHECK Replacement [✓]

**Input**: CLAUDE.md currently references `PRE_TASK_CHECK.md` (448 lines)
**Output**: CLAUDE.md references `PRE_TASK_CHECK_COMPACT.md` (49 lines)
**Validation**:
- [ ] COMPACT version loads correctly
- [ ] PRE_TASK_CHECK still triggers in conversations
- [ ] No functional regression
- [ ] 399 lines saved (89% reduction)

**Implementation**:
```yaml
File: ~/.claude/CLAUDE.md
Change:
  from: "[@~/.claude/rules/core/PRE_TASK_CHECK.md]"
  to: "[@~/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md]"

Archive:
  source: rules/core/PRE_TASK_CHECK.md
  dest: rules/archive/PRE_TASK_CHECK_VERBOSE.md
```

---

### FR-002: Command Framework Consolidation [✓]

**Input**:
- `rules/commands/COMMAND_SELECTION.md` (83 lines)
- `rules/commands/STANDARD_WORKFLOWS.md` (42 lines)

**Output**: Single `rules/commands/COMMAND_WORKFLOWS.md` (65-85 lines)

**Validation**:
- [ ] Decision matrix complete
- [ ] All workflows covered
- [ ] References updated
- [ ] 40-60 lines saved

**Structure**:
```markdown
# Command Workflows

## Decision Matrix (Table format)
| Task Type | Command | Reason |

## Standard Workflows (Table format)
| Workflow | Commands | Steps |

## Edge Cases
- [ ] List exceptions
```

---

### FR-003: Cross-Reference Matrix Creation [✓]

**Input**: 14 files with "Related Principles" sections (210-280 lines total)
**Output**: Single `rules/PRINCIPLE_RELATIONSHIPS.md` (40-50 lines)

**Validation**:
- [ ] All relationships captured
- [ ] Matrix format clear
- [ ] 14 files updated
- [ ] 150-200 lines saved

**Matrix Format**:
```markdown
# Principle Relationships

| Principle | Related To | Relationship Type |
|-----------|------------|-------------------|
| SOLID | DRY | DRY drives abstractions (DIP) |
| OCCAMS_RAZOR | YAGNI | Simplicity principle |
| MILLERS_LAW | READABLE_CODE | Scientific basis |
```

**Files to Update** (14 total):
1. `rules/reference/SOLID.md`
2. `rules/reference/DRY.md`
3. `rules/reference/OCCAMS_RAZOR.md`
4. `rules/reference/MILLERS_LAW.md`
5. `rules/reference/YAGNI.md`
6. `rules/development/TDD_RGRC.md`
7. `rules/development/READABLE_CODE.md`
8. `rules/development/LAW_OF_DEMETER.md`
9. `rules/development/CONTAINER_PRESENTATIONAL.md`
10. `rules/development/PROGRESSIVE_ENHANCEMENT.md`
11. `rules/development/LEAKY_ABSTRACTION.md`
12. `rules/development/AI_ASSISTED_DEVELOPMENT.md`
13. `rules/development/TEST_GENERATION.md`
14. `rules/PRINCIPLES_GUIDE.md`

**Replacement Pattern**:
```markdown
FROM:
## Related Principles

- [@~/.claude/rules/reference/SOLID.md] - Description
- [@~/.claude/rules/reference/DRY.md] - Description
- ...

TO:
## Related Principles

See [@~/.claude/rules/PRINCIPLE_RELATIONSHIPS.md] for principle relationships.
```

---

### FR-004: PRINCIPLES_GUIDE Compression [→]

**Input**: `rules/PRINCIPLES_GUIDE.md` (420 lines)
**Output**: Compressed version (210-252 lines)

**Validation**:
- [ ] Duplicate summaries removed
- [ ] Mermaid diagram extracted
- [ ] Individual files referenced
- [ ] 168-210 lines saved

**Optimization Strategy**:
1. **Remove Duplicate Summaries** (100-150 lines)
   - Current: Full principle explanations inline
   - Target: Reference individual files instead
   ```markdown
   FROM:
   ### SOLID Principles
   [Full 50-line explanation]

   TO:
   ### SOLID Principles
   See [@./reference/SOLID.md] for details. Quick summary: [2-3 lines]
   ```

2. **Extract Mermaid Diagram** (100 lines)
   - Move to `rules/visuals/PRINCIPLE_RELATIONSHIPS_DIAGRAM.md`
   - Keep simple reference in PRINCIPLES_GUIDE

3. **Trim Redundant Examples** (20-30 lines)
   - Keep 1 best example per principle
   - Remove duplicates with individual files

---

### FR-005: Code Example Standardization [✓] - Achieved via Alternative Approach

**Input**: 10+ files with ❌ Bad / ✅ Good blocks (200-300 lines)
**Output** (Alternative Approach):
- Table format conversion instead of separate library
- Pattern consolidation in TEST_GENERATION.md, AI_ASSISTED_DEVELOPMENT.md
- Domain-specific examples remain inline

**Validation**:
- [✓] Pattern consolidation via table format (more efficient than separate file)
- [✓] References consolidated to PRINCIPLE_RELATIONSHIPS.md
- [✓] 225+ lines saved (TEST_GENERATION.md alone)

**Implementation Note**: Originally planned to create `rules/examples/COMMON_PATTERNS.md`, but table format conversion achieved the same goal more efficiently by consolidating patterns directly within principle files.

**Pattern Library Structure**:
```markdown
# Common Code Patterns

## Pattern: Premature Abstraction

### ❌ Anti-pattern
```typescript
interface PaymentProcessor {
  process(amount: number): Promise<Result>
}
class StripePaymentProcessor implements PaymentProcessor { }
// No other processors exist
```

### ✅ Correct Pattern
```typescript
async function processPayment(amount: number) {
  return stripe.charge(amount)
}
// Add interface when second processor needed
```

**Usage**: Reference in principles with `See [@./examples/COMMON_PATTERNS.md#premature-abstraction]`
```

---

### FR-006: Principle File Trimming [→]

**Target Files** (6 files, 2,100 lines → 1,470-1,680 lines):

| File | Current | Target | Reduction |
|------|---------|--------|-----------|
| YAGNI.md | 352 | 250 | 102 lines (29%) |
| OCCAMS_RAZOR.md | 260 | 180 | 80 lines (31%) |
| MILLERS_LAW.md | 243 | 170 | 73 lines (30%) |
| LEAKY_ABSTRACTION.md | 244 | 170 | 74 lines (30%) |
| AI_ASSISTED_DEVELOPMENT.md | 272 | 190 | 82 lines (30%) |
| TEST_GENERATION.md | 441 | 310 | 131 lines (30%) |
| **Total** | **1,812** | **1,270** | **542 lines (30%)** |

**Trimming Strategy** (Apply to each):
1. **Remove verbose examples** (50-80 lines per file)
   - Keep 2-3 best examples
   - Move common patterns to library
   - Reference library for others

2. **Consolidate "Related Principles"** (15-20 lines per file)
   - Replace with reference to PRINCIPLE_RELATIONSHIPS.md

3. **Trim "Integration" sections** (10-20 lines per file)
   - Keep only unique integration points
   - Remove generic statements

4. **Preserve** (Do NOT remove):
   - Core concepts
   - Quick decision questions
   - Scientific foundation (MILLERS_LAW)
   - Unique domain knowledge

**Validation**:
- [ ] Core concepts intact
- [ ] Readability maintained
- [ ] No information loss (moved, not deleted)

---

### FR-007: Reference Path Optimization [?]

**Input**: 64 absolute path references (`[@~/.claude/rules/...]`)
**Output**: Relative paths where appropriate (`[@./reference/...]`)

**Validation**:
- [ ] All paths still resolve
- [ ] Token efficiency improved
- [ ] ~50-100 tokens saved

**Conversion Rules**:
```yaml
Within rules/:
  from: "[@~/.claude/rules/reference/SOLID.md]"
  to: "[@./reference/SOLID.md]"

Cross-directory:
  from: "[@~/.claude/rules/reference/SOLID.md]"  # from development/
  to: "[@../reference/SOLID.md]"

External references (skills, commands):
  Keep absolute: "[@~/.claude/rules/reference/SOLID.md]"
```

---

## Data Model

### File Structure Changes

**Before**:
```
rules/
├── core/          (4 files)
├── reference/     (6 files)
├── development/   (8 files)
├── commands/      (2 files)
└── root/          (1 file)
Total: 21 English files
```

**After**:
```
rules/
├── core/          (3 files)  [-1: archived PRE_TASK_CHECK_VERBOSE]
├── reference/     (6 files)  [no change]
├── development/   (8 files)  [no change]
├── commands/      (1 file)   [-1: merged COMMAND_WORKFLOWS]
├── examples/      (1 file)   [+1: COMMON_PATTERNS]
├── visuals/       (1 file)   [+1: PRINCIPLE_RELATIONSHIPS_DIAGRAM]
├── archive/       (2 files)  [+2: archived files]
└── root/          (2 files)  [+1: PRINCIPLE_RELATIONSHIPS]
Total: 22 English files (but significantly reduced content)
```

### Backup Strategy

**PRE-IMPLEMENTATION**:
```bash
for file in $(find ~/.claude/rules -name "*.md"); do
  cp "$file" "$file.bak"
done
```

**Backup Location**: Same directory, `.bak` extension

**Rollback**:
```bash
for file in $(find ~/.claude/rules -name "*.bak"); do
  mv "$file" "${file%.bak}"
done
```

---

## Implementation Details

### Phase 1: Quick Wins (Week 1)

#### Day 1-2: PRE_TASK_CHECK Replacement

**Step 1.1.1**: Verify COMPACT version
```bash
# Check COMPACT version exists and is valid
cat ~/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md
# Verify: 49 lines, all sections present
```

**Step 1.1.2**: Update CLAUDE.md
```bash
# Edit CLAUDE.md
sed -i.bak 's|PRE_TASK_CHECK\.md|PRE_TASK_CHECK_COMPACT.md|g' ~/.claude/CLAUDE.md
```

**Step 1.1.3**: Archive verbose version
```bash
mkdir -p ~/.claude/rules/archive
mv ~/.claude/rules/core/PRE_TASK_CHECK.md \
   ~/.claude/rules/archive/PRE_TASK_CHECK_VERBOSE.md
```

**Step 1.1.4**: Test
```bash
# Run sample conversation
# Verify PRE_TASK_CHECK still triggers
# Measure token reduction: /context
```

#### Day 3-4: Command Framework Consolidation

**Step 1.2.1**: Create merged file
```bash
# Template for COMMAND_WORKFLOWS.md
cat > ~/.claude/rules/commands/COMMAND_WORKFLOWS.md <<'EOF'
# Command Workflows

## Decision Matrix

| Task Intent | Command | Rationale |
|-------------|---------|-----------|
| Quick fix | /fix | Small, well-defined issue |
| Emergency | /hotfix | Production critical |
| Feature | /think → /code | Plan then implement |
| Investigation | /research | Understand before implementing |

## Standard Workflows

| Pattern | Commands | Use When |
|---------|----------|----------|
| Bug fix | /research → /fix | Unknown root cause |
| Feature | /research → /think → /code → /test | New capability |
| Emergency | /hotfix | Production down |

## Edge Cases
[Document specific scenarios]
EOF
```

**Step 1.2.2**: Merge content
- Extract decision logic from COMMAND_SELECTION.md
- Extract workflows from STANDARD_WORKFLOWS.md
- Convert to table format
- Add unique content from both files

**Step 1.2.3**: Archive old files
```bash
mv ~/.claude/rules/commands/COMMAND_SELECTION.md \
   ~/.claude/rules/archive/
mv ~/.claude/rules/commands/STANDARD_WORKFLOWS.md \
   ~/.claude/rules/archive/
```

**Step 1.2.4**: Update references
```bash
# Find all references
grep -r "COMMAND_SELECTION\|STANDARD_WORKFLOWS" ~/.claude/

# Update each reference to COMMAND_WORKFLOWS
```

#### Day 5-7: Cross-Reference Extraction

**Step 1.3.1**: Build relationship matrix
```bash
# Extract all "Related Principles" sections
for file in $(find ~/.claude/rules -name "*.md"); do
  grep -A 5 "## Related Principles" "$file"
done > /tmp/relationships.txt

# Manually review and create matrix
```

**Step 1.3.2**: Create PRINCIPLE_RELATIONSHIPS.md
```markdown
# Principle Relationships

Quick reference for principle interconnections.

## Core Principles Network

| Principle | Related | Relationship |
|-----------|---------|--------------|
| SOLID | DRY, OCCAMS_RAZOR | Abstractions vs simplicity |
| DRY | SOLID, TDD_RGRC | Single source of truth |
| OCCAMS_RAZOR | YAGNI, PROGRESSIVE_ENHANCEMENT | Simplicity first |
| MILLERS_LAW | READABLE_CODE, SOLID | Cognitive limits basis |
| YAGNI | OCCAMS_RAZOR, PROGRESSIVE_ENHANCEMENT | Avoid premature features |

## Development Practices Network

| Practice | Related | Relationship |
|----------|---------|--------------|
| TDD_RGRC | SOLID, DRY | Test-driven design |
| READABLE_CODE | MILLERS_LAW, OCCAMS_RAZOR | Clarity principles |
| PROGRESSIVE_ENHANCEMENT | YAGNI, OCCAMS_RAZOR | Incremental complexity |
| LAW_OF_DEMETER | SOLID, READABLE_CODE | Encapsulation |

## Quick Navigation

- **For simplicity**: OCCAMS_RAZOR → YAGNI → PROGRESSIVE_ENHANCEMENT
- **For design**: SOLID → DRY → LAW_OF_DEMETER
- **For readability**: READABLE_CODE → MILLERS_LAW → OCCAMS_RAZOR
- **For development**: TDD_RGRC → PROGRESSIVE_ENHANCEMENT → TIDYINGS
```

**Step 1.3.3**: Update 14 files
```bash
# For each file, replace "Related Principles" section
FILES=(
  "rules/reference/SOLID.md"
  "rules/reference/DRY.md"
  "rules/reference/OCCAMS_RAZOR.md"
  "rules/reference/MILLERS_LAW.md"
  "rules/reference/YAGNI.md"
  "rules/development/TDD_RGRC.md"
  "rules/development/READABLE_CODE.md"
  "rules/development/LAW_OF_DEMETER.md"
  "rules/development/CONTAINER_PRESENTATIONAL.md"
  "rules/development/PROGRESSIVE_ENHANCEMENT.md"
  "rules/development/LEAKY_ABSTRACTION.md"
  "rules/development/AI_ASSISTED_DEVELOPMENT.md"
  "rules/development/TEST_GENERATION.md"
  "rules/PRINCIPLES_GUIDE.md"
)

for file in "${FILES[@]}"; do
  # Replace "Related Principles" section with reference
  # Keep file-specific context if any
done
```

---

### Phase 2: Content Optimization (Week 2)

#### Day 8-10: PRINCIPLES_GUIDE Compression

**Step 2.1.1**: Extract Mermaid diagram
```bash
mkdir -p ~/.claude/rules/visuals
# Extract diagram lines (estimated 100 lines)
# Save to visuals/PRINCIPLE_RELATIONSHIPS_DIAGRAM.md
```

**Step 2.1.2**: Replace duplicate summaries
```bash
# For each principle summary in PRINCIPLES_GUIDE:
# 1. Identify if it duplicates individual file
# 2. Replace with 2-3 line summary + reference
# 3. Keep unique meta-level insights
```

**Step 2.1.3**: Trim redundant examples
```bash
# Review all examples
# Keep 1 best example per principle
# Remove examples that duplicate individual files
```

**Target Structure**:
```markdown
# Principles Guide (210-252 lines)

## Quick Reference (20 lines)
[Compact table of all principles]

## Understanding Principles (50 lines)
[Meta-level guidance on when/how to apply]

## Principle Summaries (100 lines)
### SOLID (8-10 lines)
Quick summary + See [@./reference/SOLID.md]

### DRY (8-10 lines)
Quick summary + See [@./reference/DRY.md]

[Repeat for all principles]

## Conflict Resolution (30 lines)
[When principles compete]

## References (10 lines)
- Diagram: [@./visuals/PRINCIPLE_RELATIONSHIPS_DIAGRAM.md]
- Relationships: [@./PRINCIPLE_RELATIONSHIPS.md]
- Individual principles: [@./reference/] and [@./development/]
```

#### Day 11-12: Code Example Standardization

**Step 2.2.1**: Create pattern library
```bash
mkdir -p ~/.claude/rules/examples
cat > ~/.claude/rules/examples/COMMON_PATTERNS.md <<'EOF'
# Common Code Patterns

Examples referenced by multiple principles.

## TOC
- [Premature Abstraction](#premature-abstraction)
- [Over-Engineering](#over-engineering)
- [Cognitive Overload](#cognitive-overload)
- [Train Wreck](#train-wreck)
EOF
```

**Step 2.2.2**: Extract repeating patterns
```bash
# Identify patterns appearing in 3+ files:
# 1. Premature abstraction (interface for single impl)
# 2. Over-engineering (unnecessary classes)
# 3. Cognitive overload (7± violations)
# 4. Train wreck (Law of Demeter violations)
# 5. Deep nesting (control flow complexity)
```

**Step 2.2.3**: Update principle files
```bash
# For each file with extracted pattern:
# Replace inline example with reference
FROM:
```typescript
// ❌ Bad: Interface for single implementation
interface PaymentProcessor { }
class StripePaymentProcessor implements PaymentProcessor { }

// ✅ Good: Direct implementation
async function processPayment(amount: number) { }
```

TO:
See [@./examples/COMMON_PATTERNS.md#premature-abstraction] for anti-pattern example.
```

**Keep Inline**: Domain-specific examples unique to that principle

#### Day 13-14: Principle File Trimming

**Step 2.3.1**: YAGNI.md (352 → 250 lines)
```bash
# Trim strategy:
# 1. Move 5 code examples to COMMON_PATTERNS (50 lines)
# 2. Replace Related Principles with reference (20 lines)
# 3. Consolidate "When to Add Complexity" section (15 lines)
# 4. Trim verbose examples (17 lines)
# Result: -102 lines
```

**Step 2.3.2**: OCCAMS_RAZOR.md (260 → 180 lines)
```bash
# Trim strategy:
# 1. Move 3 code examples to COMMON_PATTERNS (30 lines)
# 2. Replace Related Principles (15 lines)
# 3. Trim "Warning Signs" section (20 lines)
# 4. Consolidate "Task Scope" section (15 lines)
# Result: -80 lines
```

**Step 2.3.3**: Apply same pattern to remaining 4 files
- MILLERS_LAW.md (-73 lines)
- LEAKY_ABSTRACTION.md (-74 lines)
- AI_ASSISTED_DEVELOPMENT.md (-82 lines)
- TEST_GENERATION.md (-131 lines)

**Verification After Each**:
```bash
# 1. Read trimmed file end-to-end
# 2. Verify core concepts intact
# 3. Check examples still make sense
# 4. Test references resolve
```

---

### Phase 3: Structural Refinement (Week 3)

#### Day 15-16: Reference Path Optimization

**Step 3.1.1**: Audit all references
```bash
grep -rn "[@~/.claude/rules" ~/.claude/rules/ > /tmp/all-refs.txt
# Count: Expected ~64 references
```

**Step 3.1.2**: Categorize references
```bash
# Same directory: Convert to relative
# Parent/sibling directory: Convert to relative
# External (from skills/commands): Keep absolute
```

**Step 3.1.3**: Convert paths
```bash
# Within rules/reference/ files:
sed -i 's|@~/.claude/rules/reference/|@./|g' rules/reference/*.md

# Within rules/development/ files:
sed -i 's|@~/.claude/rules/development/|@./|g' rules/development/*.md
sed -i 's|@~/.claude/rules/reference/|@../reference/|g' rules/development/*.md

# Keep absolute in CLAUDE.md, skills/, commands/
```

**Step 3.1.4**: Verify all links
```bash
# For each reference, verify file exists
for ref in $(grep -oh "@[./~][^]]*" ~/.claude/rules/**/*.md); do
  # Resolve path and check existence
done
```

#### Day 17-18: Final Verification

**Step 3.2.1**: Run test suite
```bash
# Unit tests
# - Parse all YAML frontmatter
# - Verify all references resolve
# - Check markdown syntax

# Integration tests
# - Verify CLAUDE.md loads
# - Check cross-file references
# - Test command workflows

# E2E tests
# - Measure /context token usage
# - Test PRE_TASK_CHECK triggers
# - Sample conversation with principles
```

**Step 3.2.2**: Measure results
```bash
# Before/after comparison
echo "Lines (English):"
find ~/.claude/rules -name "*.md" ! -name "*.bak" | \
  xargs wc -l | tail -1

echo "Memory files tokens:"
# Run /context and capture output

echo "File count:"
find ~/.claude/rules -name "*.md" ! -name "*.bak" | wc -l

echo "Cross-references:"
grep -r "[@~" ~/.claude/rules | wc -l
```

**Step 3.2.3**: Manual review
```bash
# Sample conversations:
# 1. Trigger PRE_TASK_CHECK
# 2. Ask about SOLID principles
# 3. Request command recommendation
# 4. Check principle relationship navigation

# Verify no regressions
```

**Step 3.2.4**: Documentation
```bash
# Update DOCUMENTATION_RULES.md if structure changed
# Document new directories (examples/, visuals/)
# Add note about PRINCIPLE_RELATIONSHIPS.md
```

---

## Test Scenarios

### TS-001: PRE_TASK_CHECK Replacement

**Given**: CLAUDE.md references PRE_TASK_CHECK_COMPACT.md
**When**: User requests file modification
**Then**: PRE_TASK_CHECK should trigger with compact format

**Steps**:
1. Ask Claude to create a new file
2. Verify understanding check displays
3. Confirm compact format (not verbose 448-line version)
4. Check workflow completes successfully

**Expected**: ✅ PRE_TASK_CHECK triggers, compact format, no errors

---

### TS-002: Cross-Reference Navigation

**Given**: PRINCIPLE_RELATIONSHIPS.md exists, 14 files updated
**When**: User asks "What principles relate to SOLID?"
**Then**: Claude references PRINCIPLE_RELATIONSHIPS.md correctly

**Steps**:
1. Ask Claude about principle relationships
2. Verify it references PRINCIPLE_RELATIONSHIPS.md
3. Check response includes correct related principles
4. Navigate to individual principle files

**Expected**: ✅ Correct relationships, valid references, no 404s

---

### TS-003: Command Workflow Selection

**Given**: COMMAND_WORKFLOWS.md exists (merged file)
**When**: User describes a task
**Then**: Claude recommends correct command

**Steps**:
1. Describe bug fix scenario
2. Verify Claude recommends /research → /fix
3. Describe feature scenario
4. Verify Claude recommends /think → /code → /test

**Expected**: ✅ Correct command recommendations, references COMMAND_WORKFLOWS

---

### TS-004: Code Example Reference

**Given**: COMMON_PATTERNS.md library exists
**When**: User asks about premature abstraction
**Then**: Claude references pattern library

**Steps**:
1. Ask "What is premature abstraction?"
2. Verify response references COMMON_PATTERNS.md
3. Check example is accessible
4. Confirm no inline duplication

**Expected**: ✅ Reference to library, no duplicate examples

---

### TS-005: Principle File Readability

**Given**: Principle files trimmed (30% reduction)
**When**: User asks about YAGNI
**Then**: Response is complete and accurate

**Steps**:
1. Ask detailed question about YAGNI principle
2. Verify core concepts present in response
3. Check examples are relevant
4. Confirm no information loss

**Expected**: ✅ Complete information, maintains quality, concise

---

### TS-006: Token Usage Reduction

**Given**: All optimizations complete
**When**: Run /context command
**Then**: Memory files show 25-35% token reduction

**Steps**:
1. Capture baseline: /context before optimization
2. Apply all changes
3. Capture result: /context after optimization
4. Calculate reduction percentage

**Expected**: ✅ 25-35% reduction (9.5k → 6.5-7.5k tokens)

---

## Non-Functional Requirements

### NFR-001: Performance [→]

**Requirement**: Reduce Memory files token usage by 25-35%

**Baseline**: 9.5k tokens
**Target**: 6.5-7.5k tokens
**Measurement**: `/context` output

**Acceptance**:
- [ ] PRE_TASK_CHECK: 4.4k → <500 tokens
- [ ] PRINCIPLES_GUIDE: 4.1k → 2.5-3.0k tokens
- [ ] Total: 9.5k → 6.5-7.5k tokens

---

### NFR-002: Maintainability [✓]

**Requirement**: Maintain rule effectiveness and navigability

**Criteria**:
- [ ] No increase in conversation errors
- [ ] Principle guidance remains complete
- [ ] Cross-references resolve correctly
- [ ] New contributors can navigate easily

**Measurement**:
- Monitor error rates for 2 weeks post-deployment
- Sample 10 conversations for quality
- Review navigation flow

---

### NFR-003: Compatibility [✓]

**Requirement**: No breaking changes to existing references

**External References**:
- skills/ → rules/ (15+ files)
- commands/ → rules/ (10+ files)
- CLAUDE.md → rules/ (5+ files)

**Acceptance**:
- [ ] All external references still valid
- [ ] No 404 errors
- [ ] Skills load correctly
- [ ] Commands execute successfully

**Verification**:
```bash
# Check all external references
grep -r "rules/" ~/.claude/skills/*.md
grep -r "rules/" ~/.claude/commands/*.md
grep -r "rules/" ~/.claude/CLAUDE.md
```

---

### NFR-004: Reversibility [✓]

**Requirement**: Changes must be reversible via backups

**Backup Strategy**: `.bak` files for all modified files
**Rollback Time**: < 5 minutes
**Data Loss**: None (moves, not deletes)

**Acceptance**:
- [ ] All .bak files created
- [ ] Rollback script tested
- [ ] Archive directory contains old files
- [ ] No data permanently deleted

---

## Dependencies

### Internal Dependencies

| Dependency | Type | Impact | Mitigation |
|------------|------|--------|------------|
| CLAUDE.md | Configuration | High | Test reference changes |
| skills/ | Cross-reference | Medium | Verify external refs |
| commands/ | Cross-reference | Medium | Verify external refs |
| PRE_TASK_CHECK_COMPACT.md | Core file | High | Verify exists and is valid |

**No External Dependencies**: No new libraries, all internal file operations

---

## Known Issues & Assumptions

### From SOW [→]

**Assumptions**:
- Users reference PRINCIPLES_GUIDE.md less frequently than individual files
- Code examples serve educational purpose but can be consolidated
- Cross-reference network can be simplified
- 25-35% reduction won't compromise effectiveness

**Unknowns** [?]:
- Usage frequency of each file
- Whether Japanese/English can share structure
- Optimal balance between consolidation and accessibility

### Implementation-Specific

**Known Limitations**:
- Japanese mirror files not optimized in Phase 1-3
- Reference path optimization may not work with all external tools
- Manual review required for subjective trimming decisions

**Risk Mitigation**:
- Test extensively before committing
- Keep backups
- Monitor conversations for quality
- Iterate based on feedback

---

## Implementation Checklist

### Pre-Implementation

- [ ] Document current /context output
- [ ] Count files: `find ~/.claude/rules -name "*.md" | wc -l`
- [ ] Count lines: `find ~/.claude/rules -name "*.md" | xargs wc -l`
- [ ] Create backups: `.bak` extension for all files
- [ ] Verify PRE_TASK_CHECK_COMPACT.md is valid

### Phase 1 Checklist

- [ ] PRE_TASK_CHECK replaced in CLAUDE.md
- [ ] Verbose version archived
- [ ] Test PRE_TASK_CHECK triggers
- [ ] COMMAND_WORKFLOWS.md created
- [ ] Old command files archived
- [ ] References updated (skills/, commands/)
- [ ] PRINCIPLE_RELATIONSHIPS.md created
- [ ] 14 files updated with reference
- [ ] All cross-references valid
- [ ] Phase 1 /context measurement: 15-20% reduction

### Phase 2 Checklist

- [ ] Mermaid diagram extracted to visuals/
- [ ] PRINCIPLES_GUIDE compressed to 210-252 lines
- [ ] Duplicate summaries removed
- [ ] COMMON_PATTERNS.md created
- [ ] Repeating patterns extracted
- [ ] Principle files reference library
- [ ] YAGNI.md trimmed to ~250 lines
- [ ] OCCAMS_RAZOR.md trimmed to ~180 lines
- [ ] MILLERS_LAW.md trimmed to ~170 lines
- [ ] LEAKY_ABSTRACTION.md trimmed to ~170 lines
- [ ] AI_ASSISTED_DEVELOPMENT.md trimmed to ~190 lines
- [ ] TEST_GENERATION.md trimmed to ~310 lines
- [ ] Core concepts verified in all files
- [ ] Phase 2 /context measurement: 25-30% cumulative

### Phase 3 Checklist

- [ ] Reference paths audited (64 instances)
- [ ] Paths converted (same dir, parent dir)
- [ ] External refs kept absolute
- [ ] All links verified
- [ ] Unit tests passed
- [ ] Integration tests passed
- [ ] E2E tests passed
- [ ] Token reduction verified: 30-35%
- [ ] Manual review completed
- [ ] DOCUMENTATION_RULES.md updated

### Post-Implementation

- [ ] Archive all .bak files (or delete if satisfied)
- [ ] Update related documentation
- [ ] Monitor conversations for 1 week
- [ ] Collect feedback on usability
- [ ] Measure error rates
- [ ] Final /context measurement logged

---

## Migration Guide

### For End Users (Minimal Impact)

**What Changes**:
- PRE_TASK_CHECK is now compact (same functionality, less verbose)
- Principle files are shorter (same information, more concise)
- Cross-references consolidated (easier navigation)

**What Stays the Same**:
- All principles available
- CLAUDE.md behavior unchanged
- Command recommendations work as before
- Conversation quality maintained

**Action Required**: None (automatic)

### For Contributors (Moderate Impact)

**New Structure**:
```
rules/
├── examples/          [NEW] Common code patterns
├── visuals/           [NEW] Diagrams
├── archive/           [NEW] Old files
├── PRINCIPLE_RELATIONSHIPS.md [NEW] Cross-reference matrix
```

**Updated Files**:
- 14 files now reference PRINCIPLE_RELATIONSHIPS.md
- Principle files are 30% shorter
- Command files merged

**Documentation**:
- Read PRINCIPLE_RELATIONSHIPS.md for navigation
- Check examples/ for common patterns
- See archive/ for verbose versions

**Action Required**:
- Update local clones
- Review new structure
- Update any scripts referencing old files

### For Developers (High Impact)

**Breaking Changes**:
- `rules/commands/COMMAND_SELECTION.md` → MOVED to archive/
- `rules/commands/STANDARD_WORKFLOWS.md` → MOVED to archive/
- `rules/core/PRE_TASK_CHECK.md` → MOVED to archive/
- New file: `rules/commands/COMMAND_WORKFLOWS.md`
- New file: `rules/PRINCIPLE_RELATIONSHIPS.md`

**Reference Updates Required**:
```bash
# If your code references:
"rules/commands/COMMAND_SELECTION.md"
# Update to:
"rules/commands/COMMAND_WORKFLOWS.md"

# If your code references:
"rules/core/PRE_TASK_CHECK.md"
# Update to:
"rules/core/PRE_TASK_CHECK_COMPACT.md"
```

**Verification**:
```bash
# Test all references resolve
grep -r "rules/" your-code/ | while read ref; do
  # Check file exists
done
```

---

## References

### Source Documents

- [@./sow.md] - Statement of Work
- [@~/.claude/workspace/planning/20251220-skill-token-optimization/] - Similar optimization
- [@~/.claude/docs/DOCUMENTATION_RULES.md] - Documentation standards

### Target Files (Phase 1)

- [@~/.claude/CLAUDE.md] - Configuration file
- [@~/.claude/rules/core/PRE_TASK_CHECK_COMPACT.md] - Compact reference
- [@~/.claude/rules/commands/COMMAND_SELECTION.md] - To be merged
- [@~/.claude/rules/commands/STANDARD_WORKFLOWS.md] - To be merged

### Generated Files

- `rules/PRINCIPLE_RELATIONSHIPS.md` - Cross-reference matrix
- `rules/commands/COMMAND_WORKFLOWS.md` - Merged command guide
- `rules/examples/COMMON_PATTERNS.md` - Pattern library
- `rules/visuals/PRINCIPLE_RELATIONSHIPS_DIAGRAM.md` - Extracted diagram

---

**Version**: 1.0
**Status**: Implementation-ready
**Next Step**: Begin Phase 1 implementation

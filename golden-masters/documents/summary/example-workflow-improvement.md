<!--
Golden Master: Summary - Workflow Improvement

Purpose:
- Reduce review burden by extracting key points from SOW/Spec
- Enable quick alignment on overall direction
- Highlight discussion points for synchronous review

Selection criteria:
- Concise (under 50 lines)
- Covers: purpose, scope, discussion points, risks
- Actionable for reviewers

Source: Derived from SOW/Spec golden masters
Last Reviewed: 2025-12-22
-->

# Summary: Workflow Improvement (Review Summary)

## 🎯 Purpose (1-2 sentences)

Apply spec-driven development best practices to current Claude Code workflow, addressing context confusion and improving prompt quality.

## 📋 Change Overview

| Phase | Description | Duration |
| --- | --- | --- |
| Phase 1 | Golden Master introduction | 1 day |
| Phase 2 | Context minimization | 1 day |
| Phase 3 | /think split (/sow + /spec) | 2 days |
| Phase 4 | Instruction simplification | 2+ days |

## 📁 Scope of Impact

**Files to modify:**

- `~/.claude/commands/think.md` → Thin orchestrator
- `~/.claude/commands/sow.md` → New file
- `~/.claude/commands/spec.md` → New file

**Affected components:**

- `/think`, `/code` workflows
- sow-spec-reviewer agent

## ❓ Discussion Points

1. **Context reduction threshold**: Targeting 1,500 lines, but optimal value needs verification
2. **Template location**: templates/ vs golden-masters/ directory
3. **Gradual migration**: Minimizing impact on existing users

## ⚠️ Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Existing workflow breakage | High | Gradual migration, compatibility layer |
| Functionality degradation from context reduction | Medium | Careful selection of essential principles |

## ✅ Key Acceptance Criteria

- [ ] 3+ ideal examples in golden-masters/
- [ ] /code reference context below 1,500 lines
- [ ] Each command under 200 lines
- [ ] Compatibility with existing workflow maintained

## 🔗 Detailed Documentation

- SOW: `sow.md`
- Spec: `spec.md`

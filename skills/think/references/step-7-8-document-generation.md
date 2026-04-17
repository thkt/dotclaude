# Steps 7-8: SOW / Spec Generation

## Step 7: SOW

Read template `~/.claude/templates/sow/template.md`. Fill from design context
(Steps 0-6). ID format: AC-N.

Output: `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md`

### Quality Gates

Apply before writing each section.

| Section | Gate                                                                                                                                      |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Why     | 5 fields all filled. Outcome = measurable result, not deliverable                                                                         |
| AC      | Each traces to Why Outcome. No orphan ACs. No scope creep beyond Why Problem                                                              |
| Scope   | YAGNI checklist items checked with rationale, not just excluded. Out of Scope: each exclusion traces Why not to a Why field or Constraint |
| Impl    | Files < 5 per Phase. Steps describe concrete changes                                                                                      |
| Test    | Every AC has ≥1 test. Verification states what is checked concretely                                                                      |
| Risks   | ≥1 risk identified with mitigation                                                                                                        |

## Step 8: Spec

Read template `~/.claude/templates/spec/template.md`. Generate from SOW.
ID format: FR-001, T-001, NFR-001.

Traceability: `FR-001 Implements: AC-001` → `T-001 Validates: FR-001`

If UI-related: include Component API (Props, variants, states, usage).

Output: `.claude/workspace/planning/[same-dir]/spec.md`

### Quality Gates

Apply before writing each section.

| Section | Gate                                                                          |
| ------- | ----------------------------------------------------------------------------- |
| FR      | EARS syntax required. 1 SHALL per sentence. No vague values (appropriate etc) |
| FR      | Document rationale for design decisions (variant reuse, YAGNI reasoning etc)  |
| Domain  | Concept-level only. No type/field names. Invariants trace to FRs              |
| Test    | Every FR has ≥1 scenario. Concrete values in all Given-When-Then columns      |
| NFR     | Measurement column specifies how to measure (code review, manual timing etc)  |
| Trace   | AC → FR → Test → NFR chain unbroken                                           |

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
| AC      | Each traces to Why Outcome. Observable signal column filled (HTTP 200, state X). No orphan ACs, no scope creep beyond Why Problem |
| Scope   | YAGNI checklist checked with rationale. Out of Scope traces Why not. In Scope Observable outcome column filled (concrete signal) |
| Impl    | Files < 5 per Phase. Steps describe concrete changes                                                                                      |
| Test    | Every AC has ≥1 test. Verification states what is checked concretely                                                                      |
| Risks   | ≥1 risk identified. Probability column filled. Mitigation required when Impact = HIGH                                                     |

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
| NFR     | Rationale column filled — why this target value (UX budget, SLA etc)          |
| Assume  | Assumptions include Impact-if-broken for each entry                           |
| Impl    | Depends column specifies prior Phase IDs or `none`                            |
| Trace   | AC → FR → Test → NFR chain unbroken                                           |

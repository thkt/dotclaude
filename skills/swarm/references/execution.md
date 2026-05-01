# Execution Phases

Detailed phase execution for /swarm. SKILL.md references this per phase.

## Phase 0: SOW Detection

1. SOW/spec auto-detection
2. No SOW → `$ARGUMENTS` is sole instruction

## Phase 1: Team Setup + Architecture

1. `TeamCreate` with name `swarm-{timestamp}`
2. Spawn Architect (architect-feature) with the following prompt.
   - Spawn Context (see ${CLAUDE_SKILL_DIR}/references/contracts.md#spawn-context-leader--all-agents)
   - `$ARGUMENTS` implementation description
   - Expected output: Architect Output contract via DM
3. Spawn QA (team-qa) with the following prompt.
   - Instruction: observe Architect's design, comment via peer DM
   - Read team config to discover teammates
4. Wait for Architect's contract DM

## Phase 2: Decomposition Approval

1. Present Architect's decomposition to user.
   - Parallel units with file assignments
   - Shared changes (applied before parallel execution)
   - Dependency graph (ideally all independent)
   - Estimated worker count
2. User may adjust the decomposition.
   - Merge/split units
   - Reassign files between units
   - Override dependency decisions
3. Proceed to Phase 3 after approval

## Phase 3: Test Generation

1. After final Architect Output contract is confirmed (Phase 1 + QA review)
2. Spawn generator-test as standalone background agent (`subagent_type: generator-test`, `run_in_background: true`)
3. Include Architect's contract in test-gen prompt
4. Receive test results via `TaskOutput`

## Phase 4: File Assignment

1. Receive final Architect Output contract (confirmed after QA review rounds)
2. Receive test-gen results via `TaskOutput`
3. Spawn Implementer(s) per Architect's `parallel_units` mechanically with no analysis.
   - One Implementer per parallel unit (worktree isolation)
   - Single unit → single Implementer
   - `mode: "dontAsk"` (worktree isolation provides safety for autonomous Bash)
   - Prompt: Implementer Assignment contract at ${CLAUDE_SKILL_DIR}/references/contracts.md#implementer-assignment-leader--implementer
   - Instruction: RGRC cycle, DM Architect for questions
4. Forward file assignments to QA for observation

## Phase 5: RGRC Implementation

1. Implementer(s) work on assigned files
2. Wait for `started` DM from each Implementer (receipt confirmation)
   - 120s timeout per Implementer (aligned with /audit convention)
   - No `started` DM within 120s → shutdown, re-spawn same assignment (max 1 retry → escalate to user)
3. Peer DM channels.
   - Implementer ↔ Architect: contract questions, design clarification
   - QA → Implementer: edge case observations
   - QA → Architect: contract quality observations
   - QA → Leader: verification command requests
4. Leader handles QA verification requests mechanically.
   - Receive command request → execute → return result to QA
5. Wait for all Implementers to complete (DM with status)
6. Detect suspected death (no completion DM, abnormally long silence).
   - Leader inspects worktree: `git -C <worktree-path> status`
   - Modified files → partial progress exists
   - Clean → Implementer never started real work
   - Shutdown dead Implementer, re-spawn with same assignment (max 1 retry → escalate to user). New Implementer reads worktree state and decides independently whether to continue or restart

## Phase 6: Integration + Quality Gates

### 6a: Merge Strategy

1. Apply shared_changes first (from Architect Output).
   - Leader applies shared changes to main branch directly
   - If application fails → halt merge, escalate to user
   - Verify: run type-check/lint on main after applying
2. Merge remaining worktrees sequentially.
   - Merge independent units in completion order
   - For units with depends_on, merge in build_sequence order
   - Resolve conflicts via `git merge` or update branch
3. Final state: all changes on main branch

<!-- canonical: skills/use-workflow-code (full gate table) -->

### 6b: Quality Gates

1. Leader executes QG on main branch (tests, lint, types, coverage)
2. If Spec exists: Spec compliance check
   - File coverage: compare `git diff --name-only` against Spec `## Implementation` file list. New test files and config files are exempt
   - AC verification: for each AC in SOW, confirm implementation + test exist. Flag unmet or partially met ACs with specific gaps
3. On failure, take the following actions.
   - Identify responsible agent from failing file
   - Forward failure details to that agent via DM
   - Agent fixes and reports back
4. Re-run QG after fix
5. Max 3 iterations → escalate to user

## Phase 7: Summary

1. Collect results from all agents
2. Generate summary report (files modified, tests, issues)
3. Shutdown all agents (`shutdown_request`)
4. `TeamDelete` for cleanup
5. Present summary to user

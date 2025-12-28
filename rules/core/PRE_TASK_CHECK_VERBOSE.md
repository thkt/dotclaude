# Pre-Task Understanding Check

Technical specification for understanding check and execution planning.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚡ QUICK REFERENCE (Read This First)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 🔴 CRITICAL: 95% Understanding Rule

**Never proceed with confidence <95%**. Always ask for clarification first.

### Decision Tree

```text
START
  ↓
Will modify files? ──YES──→ [EXECUTE CHECK]
  ↓ NO
Will run commands? ──YES──→ [EXECUTE CHECK]
  ↓ NO
Understanding <95%? ──YES──→ [EXECUTE CHECK]
  ↓ NO
Multi-step workflow? ──YES──→ [EXECUTE CHECK]
  ↓ NO
[SKIP CHECK] ← Simple question, confirmation, or read-only query
```

### Decision Matrix

| Condition | Action | Example |
| --- | --- | --- |
| **Execute Check** | | |
| File modification | → Execute | Create/edit CLAUDE.md |
| Command execution | → Execute | Run `npm test` |
| Understanding <95% | → Execute | Ambiguous user request |
| Multi-step workflow | → Execute | Feature implementation |
| **Skip Check** | | |
| Simple question | → Skip | "What is PRE_TASK_CHECK?" |
| Confirmation | → Skip | "yes", "ok", "y" |
| Read-only query | → Skip | Read file, Grep search |
| Follow-up clarification | → Skip | Additional context |

### Basic Flow (5 Steps)

1. **Analyze** → Mark confidence (✓/→/?)
2. **If <95%** → Ask questions → STOP
3. **If ≥95%** → Display check → Wait for Y
4. **Show Impact** → Execution Plan → Wait for final Y
5. **Execute**

### Confidence Markers

- **[✓]** = High (directly verified from files/context)
- **[→]** = Medium (reasonable inference)
- **[?]** = Low (assumption needing confirmation)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📖 DETAILED RULES (Reference as Needed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Execution Rule

**PRIMARY**: PRE_TASK_CHECK is executed for tasks that involve:

- File operations (create/edit/delete)
- Command executions (bash, npm, etc.)
- Multi-step workflows
- Requests meeting ANY of these criteria:
  - **Ambiguous**: Contains pronouns without clear referents ("it", "that") OR vague quantities ("some", "a few")
  - **Complex**: Requires 3+ distinct actions OR affects 5+ files OR involves 2+ subsystems
- When understanding is below 95%

**SKIP CONDITIONS** (AI judgment allowed):

- Simple factual questions ("What is X?")
- Confirmation responses ("y", "yes", "ok")
- Direct information queries about existing content
- Follow-up clarifications that don't require action
- Requests for explanations or documentation

**ALWAYS REQUIRED FOR**:

- Any file system modifications
- Code implementation requests
- System commands execution
- Tasks requiring /commands
- When user explicitly requests planning

## Analysis Method

Analyze the user request to determine:

- Understanding percentage based on available information
- Clear and unclear elements
- Command selection based on these prioritized criteria:
  1. **Task scope**: Single file = /fix, Multiple files = /code, Investigation = /research
  2. **Change type**: Bug fix = /fix, New feature = /think → /code
  3. **Confidence level**: <70% = /research first, 70-90% = /think, >90% = /code directly
- Feasibility of execution

**Output Verifiability Requirements** (per AI Operation Principles #4):

For each element in the understanding check, assess:

- **Confidence level**: High (verified), Medium (inferred), Low (assumed)
- **Evidence basis**: Direct observation, logical inference, or assumption
- **Knowledge gaps**: Explicitly acknowledge what is unknown or uncertain

**Markers for confidence levels**:

- ✓ = High confidence (directly verified from files/context)
- → = Medium confidence (reasonable inference)
- ? = Low confidence (assumption that needs confirmation)

## 95% Understanding Rule

**Core principle from evidence-based practice:**

Never proceed with implementation below 95% understanding. This threshold is evidence-based (see Rationale below).

### When to Apply

**ALWAYS ask clarifying questions when:**

- Average confidence across elements is below 95%
- Any critical element is marked with [?] (Low confidence)
- Multiple elements are marked with [→] (Medium confidence)
- User requirements contain ambiguity
- Implementation approach meets ANY of these unclear conditions:
  - Cannot identify specific files to modify within 30 seconds of analysis
  - Multiple valid approaches exist with no clear selection criteria
  - Required technology/framework is not explicitly stated
  - Success criteria cannot be defined in measurable terms

**Rule**: If weighted average confidence < 95%, display follow-up questions and wait for user response before proceeding.

### Follow-Up Question Format

When understanding is below 95%, explicitly state what needs clarification:

```markdown
🤔 Questions to reach 95% confidence:
1. [Specific question about unclear element]
2. [Specific question about assumed element]
3. [Specific question about implementation approach]

These clarifications are needed before proceeding.
```

### Integration with Analysis Method

1. **Analyze** user request → determine confidence for each element
2. **Calculate** weighted average confidence
3. **If <95%**: Display clarifying questions and wait
4. **If ≥95%**: Proceed with understanding check display
5. **Always**: Mark confidence explicitly with ✓/→/? markers

**Rationale**: Implementation below 95% confidence frequently requires rework. Asking upfront saves time and builds trust.

**Remember**: Asking for clarification is always better than assuming incorrectly.

## Display Format

Standard format for understanding check (when required):

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 Understanding Level: [progress bar] XX%

✅ Elements I understand clearly:
- [✓] [Items with direct evidence from files/context]
- [→] [Items based on reasonable inference]

❓ Unclear or assumed elements:
- [?] [Ambiguous parts requiring confirmation]
- [?] [Assumptions that may be incorrect]

📋 Additional information I'd like to confirm:
- [Required specifications]

🎯 Done Definition:
- [ ] [Inferred completion criterion 1]
- [ ] [Inferred completion criterion 2]
- [ ] [Inferred completion criterion 3]

Is this definition correct? Please point out any missing or incorrect items.

💡 Suggested approach:
- Command: [/command or N/A]
- Reason: [Brief explanation]

⚡ Feasibility: 🟢 Immediately executable / 🟡 Additional info needed / 🔴 Significant gap

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Is this understanding correct? An execution plan will be shown if needed. (Y/n/i)
```

**[STOP HERE - Wait for user response]**

Note: Output labels will be translated to Japanese per CLAUDE.md P1 rule

**Progress Bar Construction**:

- Uses 10 blocks total to represent 100%
- Each block (█ or ░) represents 10%
- Fill from left to right based on percentage
- █ = filled (confidence level reached)
- ░ = empty (confidence level not reached)

**Examples**:

```text
100% → ██████████ 100%  (10 filled)
 90% → █████████░  90%  (9 filled, 1 empty)
 70% → ███████░░░  70%  (7 filled, 3 empty)
 50% → █████░░░░░  50%  (5 filled, 5 empty)
 30% → ███░░░░░░░  30%  (3 filled, 7 empty)
  0% → ░░░░░░░░░░   0%  (10 empty)
```

**Implementation pattern**:

```text
filled_count = Math.floor(percentage / 10)
empty_count = 10 - filled_count
bar = "█".repeat(filled_count) + "░".repeat(empty_count)
```

**Done Definition Section**: Display only for implementation/fix tasks (/code, /fix commands). This section is separate from TodoWrite - Done Definition represents the goal (what to achieve), while TodoWrite tracks execution steps (how to achieve it).

### Example: Output Verifiability in Practice

**Good example** (with confidence markers):

```markdown
✅ Elements I understand clearly:
- [✓] Target file is `src/components/Button.tsx` (user specified)
- [→] Project uses TypeScript (inferred from .tsx extension)

❓ Unclear or assumed elements:
- [?] Testing framework preference (Jest? Vitest? Not specified)
- [?] Style approach (styled-components? CSS modules? Unknown)
```

## Command Suggestion System

**When to suggest commands**: Understanding ≥ 70%, technical tasks
**Note**: This is ONLY for command suggestions, NOT for understanding check display
**Sources**: ~/.claude/commands/, .claude/commands/

### Dynamic Discovery

1. Scan directories for *.md files
2. Extract YAML metadata (if present)
3. Analyze task characteristics
4. Score & rank commands

### Task Analysis

Based on understanding the actual task intent and requirements.
See: [@~/.claude/rules/commands/COMMAND_WORKFLOWS.md](~/.claude/rules/commands/COMMAND_WORKFLOWS.md) for detailed algorithm

### Output Format

**IMPORTANT**: Command field MUST contain ONLY slash commands or "N/A". Never put descriptions or other text.

**Single command**:

```markdown
💡 Suggested approach:
- Command: /fix
- Reason: Best match for small fix, 90% understanding
```

**Workflow** (multi-action detected):

```markdown
💡 Suggested workflow:
- Steps: /think → /code → /test
- Reason: Complex task requiring planning
- TodoWrite: Will create 3 tasks automatically
```

**No command match**:

```markdown
💡 Suggested approach:
- Command: N/A
- Reason: No specific command needed for this task
```

## Standard Workflows

- **Bug Fix**: Investigate+Fix → `/research → /fix`
- **Feature**: Implement+Test → `/research → /think → /code → /test → /audit → /validate`

Details: [@~/.claude/rules/commands/COMMAND_WORKFLOWS.md](~/.claude/rules/commands/COMMAND_WORKFLOWS.md)

## User Response Handling

**Important: Always wait for user response after showing understanding check**

- Y: Proceed with implementation (show impact simulation if needed)
- n: Re-evaluate task understanding
- i: Wait for additional information

## Impact Simulation (Dry-run)

**When to display**: After Y confirmation, before Execution Plan, for file operations or complex changes.

Provides a brief simulation of expected changes and their impact. Based on the "Dry-run" approach - simulating changes without actual execution to preview effects.

**Display Format**:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Impact Simulation (Dry-run)

Expected changes:
• Files to modify: [list 2-5 key files]
• Affected components: [list impacted modules/components]
• Risk level: 🟢 Low / 🟡 Medium / 🔴 High
• Note: [Any important considerations]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Guidelines**:

- **Length limits**:
  - Bullet points: 3-5 items (enforce max 5)
  - Characters per bullet: max 100 characters
  - Total impact simulation: max 300 characters
- **Focus on impact**: What will change, what might break
- **Risk assessment**: Honest evaluation of potential issues
- **Actionable**: Highlight areas requiring special attention

**Example**:

```markdown
🔍 Impact Simulation (Dry-run)

Expected changes:
• Files to modify: src/auth/login.ts, src/components/LoginForm.tsx
• Affected components: AuthService, UserSession, LoginPage
• Risk level: 🟡 Medium (authentication flow change)
• Note: Existing user sessions may require re-login, update tests for new flow

```

**Skip conditions** (apply Impact Simulation ONLY when these are FALSE):

- **Simple file reads**: Read tool with no modifications
- **Documentation updates**: Only *.md files affected, no code changes
- **Obvious low-risk changes**: Single file, <10 lines changed, no dependencies affected

If any of the following apply, ALWAYS show Impact Simulation:

- Modifying core configuration (CLAUDE.md, PRE_TASK_CHECK.md, settings.json)
- Changing 3+ files simultaneously
- Affecting authentication, security, or data integrity logic

### Combined Display Format

**Format**:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Impact Simulation (Dry-run)

Expected changes:
• Files to modify: [list 2-5 key files]
• Affected components: [list impacted modules/components]
• Risk level: 🟢 Low / 🟡 Medium / 🔴 High
• Note: [Any important considerations]

─────────────────────────────────────────────────

📝 Execution Plan

Will execute the following:
1. [Specific action]
2. [Specific action]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proceed with this plan? (Y/n/i)
```

**Notes**: Single outer box with thin separator (─) between sections for cleaner visual hierarchy.

## Execution Plan (After Impact Simulation)

Display for operations that will modify files or execute commands.
Skip for pure read operations (Read, Grep, LS).

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Execution Plan

Will execute the following:
1. [Specific action]
2. [Specific action]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proceed with this plan? (Y/n/i)
```

**[STOP HERE - Wait for user response]**

**Examples**:

- File creation: "Create new file /path/to/file.js"
- File edit: "Edit /path/to/file.js - add error handling"
- Command execution: "Run npm test to verify changes"

**Important: Wait for user confirmation before proceeding.**

## Edge Cases

- No match (score <30): "Command: N/A"
- Complex task: Suggest workflow
- New commands: Auto-discovered if in command dirs

## Integrated Workflow

1. **Understanding Check**: Assess comprehension & suggest approach
2. **User Confirmation**: Wait for Y/n/i ← **STOP POINT**
3. **Impact Simulation** (if Y and complex/risky changes): Show dry-run preview
4. **Execution Plan** (if Y and file/command ops): Show specific actions
5. **Plan Confirmation**: Wait for final Y/n/i ← **STOP POINT**
6. **Execute**: Perform the approved actions

## Integration with Output Verifiability

Implements AI Operation Principle #4 using ✓/→/? markers to distinguish facts from assumptions and acknowledge uncertainty.

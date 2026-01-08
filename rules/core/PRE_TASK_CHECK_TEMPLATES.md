# PRE_TASK_CHECK Detailed Specification

Technical specification for understanding check and execution planning. For basic rules, see PRE_TASK_CHECK_RULES.md.

---

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
```

**[Use `AskUserQuestion` to confirm understanding before proceeding]**

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

1. Scan directories for \*.md files
2. Extract YAML metadata (if present)
3. Analyze task characteristics
4. Score & rank commands

### Task Analysis

Based on understanding the actual task intent and requirements.
See: [@../commands/COMMAND_WORKFLOWS.md](../commands/COMMAND_WORKFLOWS.md) for detailed algorithm

### Output Format

**IMPORTANT**: Command field MUST contain ONLY slash commands or "N/A".

```markdown
💡 Suggested approach:

- Command: [/command or N/A]
- Reason: [Brief explanation]
```

For workflows: `Steps: /think → /code → /test`

## Standard Workflows

- **Bug Fix**: Investigate+Fix → `/research → /fix`
- **Feature**: Implement+Test → `/research → /think → /code → /test → /audit → /validate`

Details: [@../commands/COMMAND_WORKFLOWS.md](../commands/COMMAND_WORKFLOWS.md)

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
- **Documentation updates**: Only \*.md files affected, no code changes
- **Obvious low-risk changes**: Single file, <10 lines changed, no dependencies affected

If any of the following apply, ALWAYS show Impact Simulation:

- Modifying core configuration (CLAUDE.md, PRE_TASK_CHECK.md, settings.json)
- Changing 3+ files simultaneously
- Affecting authentication, security, or data integrity logic

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
```

**[Use `AskUserQuestion` to confirm execution plan before proceeding]**

**Examples**:

- File creation: "Create new file /path/to/file.js"
- File edit: "Edit /path/to/file.js - add error handling"
- Command execution: "Run npm test to verify changes"

**Combined display**: When showing both, use thin separator (─) between Impact Simulation and Execution Plan within single outer box (━).

## Integrated Workflow

1. **Understanding Check**: Assess comprehension & suggest approach
2. **User Confirmation**: Use `AskUserQuestion` ← **STOP POINT**
3. **Impact Simulation** (if confirmed and complex/risky changes): Show dry-run preview
4. **Execution Plan** (if confirmed and file/command ops): Show specific actions
5. **Plan Confirmation**: Use `AskUserQuestion` ← **STOP POINT**
6. **Execute**: Perform the approved actions

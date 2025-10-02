# Pre-Task Understanding Check

Technical specification for understanding check and execution planning.

## Execution Rule

**PRIMARY**: PRE_TASK_CHECK is executed for tasks that involve:

- File operations (create/edit/delete)
- Command executions (bash, npm, etc.)
- Multi-step workflows
- Ambiguous or complex requests
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
- Appropriate commands or approach
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

💡 Suggested approach:
- Command: [/command or N/A]
- Reason: [Brief explanation]

⚡ Feasibility: 🟢 Immediately executable / 🟡 Additional info needed / 🔴 Significant gap

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Is this understanding correct? An execution plan will be shown if needed. (Y/n/i)
```

**[STOP HERE - Wait for user response]**

Note: Output labels will be translated to Japanese per CLAUDE.md P1 rule

Progress bar: █ = 10% (fill left to right, use ░ for empty)

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

**Bad example** (overconfident without evidence):

```markdown
✅ Elements I understand clearly:
- Project uses Jest for testing
- Components follow styled-components pattern
- ESLint rules enforce strict typing
```

**Why bad**: Claims presented as facts without evidence. Should use [?] markers and explicitly state these are assumptions.

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
See: [@../commands/COMMAND_SELECTION.md] for detailed algorithm

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
- **Feature**: Implement+Test → `/research → /think → /code → /test → /review → /validate`
- **Emergency**: Critical+Production → `/hotfix`

Details: [@../commands/STANDARD_WORKFLOWS.md]

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

- **Keep it concise**: 3-5 bullet points maximum
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

**Skip conditions**: Simple file reads, documentation updates, or when impact is obvious.

### Combined Display Format

**When to use**: When both Impact Simulation and Execution Plan are displayed consecutively.

**Purpose**: Reduce visual noise by combining both sections into a single box with cleaner separation.

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

**Key differences from separate display**:

- Single outer box (━) instead of two separate boxes
- Thin separator line (─) between sections
- One confirmation prompt at the end
- Cleaner visual hierarchy

**Example**:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Impact Simulation (Dry-run)

Expected changes:
• Files to modify: rules/core/PRE_TASK_CHECK.md, ja/rules/core/PRE_TASK_CHECK.md
• Affected components: Understanding Check workflow display
• Risk level: 🟢 Low (documentation only)
• Note: Adding combined display format option

─────────────────────────────────────────────────

📝 Execution Plan

Will execute the following:
1. Edit rules/core/PRE_TASK_CHECK.md - Add combined display format section
2. Edit ja/rules/core/PRE_TASK_CHECK.md - Sync Japanese version

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proceed with this plan? (Y/n/i)
```

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

This PRE_TASK_CHECK implements AI Operation Principle #4 (Output Verifiability) by:

1. **Distinguishing facts from assumptions**: Using ✓/~/? markers
2. **Providing evidence**: Referencing specific files, user statements, or context
3. **Stating confidence levels**: Explicitly marking high/medium/low confidence
4. **Admitting gaps**: Using ❓ section to acknowledge unknowns

**Key principle**: Never pretend to understand fully when uncertainty exists. It's better to ask than to assume incorrectly.

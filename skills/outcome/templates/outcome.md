# OUTCOME Template and Examples

Stub template and project-shape examples for `.claude/OUTCOME.md`. The /outcome skill reads this file during generation and update.

## Template

Each repository's `.claude/OUTCOME.md` follows the structure below. Behavior is required; Indicators are optional and only included when they sharpen a Behavior. Per-slot inline examples may be added as `<!-- e.g. ... -->` comments.

```markdown
# OUTCOME

## Outcome state

[Optional opening prose. The project's reason for being and the direction it evolves toward. Aspirational language allowed.]

### Behavior

[Subject (human user / AI agent / system) holds the named state in the done condition. Implementation-independent. Observable. One bullet per distinct behavior.]

<!-- e.g. AI agents fix violations within the same edit cycle and never bypass the hook -->
<!-- e.g. Developers integrate the API without referencing internal source -->

### Indicators

[Optional. States that corroborate the Behavior above. Numeric, temporal, or aspirational direction. Skip the section if none sharpen the Behavior.]

| Indicator  | Value                     | Corroborates            |
| ---------- | ------------------------- | ----------------------- |
| Time       | [bound]                   | [which Behavior bullet] |
| Error rate | [bound]                   | [which Behavior bullet] |
| Value      | [beneficiary holds value] | [which Behavior bullet] |

## Non-goals

[Bullet list. Explicitly out of scope.]

## Constraints

[Bullet list. Immovable technical, legal, or organizational limits.]
```

## Examples

Three project shapes. Each shows Behavior with optional Indicators.

### Internal hook tool (e.g. guardrails)

```markdown
## Outcome state

guardrails operates as a hook for AI agents and functions on frontend projects. By auditing AI-authored code and returning feedback, it keeps issues detectable and fixable within the agent's edit cycle. It evolves toward continuously improving feedback precision and the AI agent's experience.

### Behavior

- AI agents that emit banned patterns receive a blocking signal and fix the code within the same edit cycle.
- No banned pattern reaches main because every edit passes the hook before commit.
- AI agents read the hook's stderr and produce a fix without human intervention.

### Indicators

| Indicator | Value                                               | Corroborates                                                                |
| --------- | --------------------------------------------------- | --------------------------------------------------------------------------- |
| Precision | Violation-detection precision improves continuously | Agents act on trustworthy feedback                                          |
| UX        | AI agent edit experience improves continuously      | Agents do not perceive the hook as friction and run the fix loop themselves |
```

### Developer CLI (e.g. recall)

```markdown
## Outcome state

### Behavior

- Developers retrieve past session decisions without re-deriving them.
- Developers act on the recalled result without re-searching with different terms.

### Indicators

| Indicator | Value                                        | Corroborates                         |
| --------- | -------------------------------------------- | ------------------------------------ |
| Time      | Search returns within 2s for typical history | Developers do not abandon mid-search |
```

### SaaS feature (e.g. okr-dashboard)

```markdown
## Outcome state

### Behavior

- Team members update key results weekly without manual spreadsheet copy.
- Stakeholders read current org-wide OKR state without asking the owner.

### Indicators

| Indicator | Value                                             | Corroborates                               |
| --------- | ------------------------------------------------- | ------------------------------------------ |
| Value     | Each team member has the current OKR state in app | Updates happen because the data is visible |
```

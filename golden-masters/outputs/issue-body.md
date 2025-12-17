<!--
Golden Master: Output - Issue Body

Selection criteria:
- Clear and actionable structure
- Type-specific templates (bug, feature, docs)
- Measurable acceptance criteria

Features:
- Title format with type prefix
- Structured body sections
- Label suggestions

Source: /issue command output

Last Reviewed: 2025-12-17
Update Reason: Initial creation
Previous Version: N/A
-->

# Issue Body - Expected Output Format

## Title Format

```text
[Type] Brief, specific description (≤72 chars)
```

### Good Title Examples

```text
✅ [Bug] Login fails with OAuth on Safari mobile
✅ [Feature] Add CSV export for reports
✅ [Docs] Update API authentication guide
✅ [Enhancement] Improve search performance
```

### Bad Title Examples

```text
❌ Bug
   → No description

❌ [Bug] It doesn't work
   → Too vague

❌ Please fix the login issue that happens sometimes when...
   → Too long, no type prefix

❌ feature request
   → No brackets, no description
```

## Bug Report Template

```markdown
## Description

[Clear description of what's broken]

## Steps to Reproduce

1. Go to [page/feature]
2. Click on [element]
3. Enter [input]
4. Observe [error/unexpected behavior]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Environment

- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120]
- Version: [e.g., 1.2.3]

## Additional Context

[Screenshots, error logs, related issues]
```

## Feature Request Template

```markdown
## Description

[Clear description of the requested feature]

## Motivation

[Why is this feature needed? What problem does it solve?]

## Proposed Solution

[How should the feature work?]

## Acceptance Criteria

- [ ] [Specific, measurable criterion 1]
- [ ] [Specific, measurable criterion 2]
- [ ] [Specific, measurable criterion 3]

## Alternatives Considered

[Other approaches that were evaluated]

## Additional Context

[Mockups, examples, related features]
```

## Documentation Template

```markdown
## Description

[What documentation needs to be added or updated]

## Current State

[What's currently documented, or what's missing]

## Proposed Changes

- [ ] [Specific change 1]
- [ ] [Specific change 2]

## Related

[Links to related docs, code, or issues]
```

## Good Example: Bug Report

```markdown
## Title
[Bug] Login fails with OAuth on Safari mobile

## Body

## Description

Users cannot complete OAuth login flow on Safari mobile (iOS 17+). The redirect after authentication fails silently.

## Steps to Reproduce

1. Open the app in Safari on iOS 17
2. Tap "Login with Google"
3. Complete Google authentication
4. Observe redirect back to app

## Expected Behavior

User should be redirected back to the app and logged in successfully.

## Actual Behavior

Page shows blank white screen after Google authentication completes. No error message displayed.

## Environment

- OS: iOS 17.1
- Browser: Safari 17
- App Version: 2.1.0

## Additional Context

- Works correctly on Chrome mobile
- Console shows: `SecurityError: Blocked a frame with origin`
- Possibly related to #234 (CORS issue)
```

## Good Example: Feature Request

```markdown
## Title
[Feature] Add CSV export for reports

## Body

## Description

Add ability to export report data to CSV format for offline analysis and sharing with stakeholders.

## Motivation

Users frequently request report data in spreadsheet format for:
- Sharing with team members who don't have app access
- Creating custom visualizations in Excel
- Archiving historical data

## Proposed Solution

Add "Export to CSV" button on each report page that downloads the currently visible data.

## Acceptance Criteria

- [ ] Export button visible on all report pages
- [ ] CSV includes all visible columns
- [ ] Date filtering is respected in export
- [ ] Large exports (>10k rows) show progress indicator
- [ ] UTF-8 encoding for international characters

## Alternatives Considered

- **PDF export**: Considered but doesn't allow data manipulation
- **API endpoint**: Too technical for non-developer users

## Additional Context

Similar to export feature in competitor product X.
```

## Evaluation Criteria

| Aspect | Points | Criteria |
|--------|--------|----------|
| Title Clarity | 25 | Type prefix, specific, ≤72 chars |
| Problem Statement | 25 | Clear description, reproduction steps |
| Acceptance Criteria | 25 | Specific, measurable, checkbox format |
| Context | 25 | Environment, related info, screenshots |

## Label Mapping

| Issue Content | Suggested Labels |
|---------------|-----------------|
| crash, error, exception | `bug`, `critical` |
| slow, timeout, performance | `performance` |
| add, new, support, enable | `enhancement` |
| docs, readme, guide, tutorial | `documentation` |
| security, auth, permission | `security` |
| ui, design, style, layout | `ui/ux` |
| test, coverage, ci | `testing` |

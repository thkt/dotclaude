# Prompting Tips

Effective prompting techniques for Claude Code.

## Redo & Improve

| Prompt                                                                           | Effect                                         | When                          |
| -------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------- |
| "Knowing everything you know now, scrap this and implement the elegant solution" | Better implementation with accumulated context | After mediocre implementation |

## Review & Verification

| Prompt                                                                 | Effect                             | When               |
| ---------------------------------------------------------------------- | ---------------------------------- | ------------------ |
| "Grill me on these changes and don't make a PR until I pass your test" | Turn Claude into a strict reviewer | Before PR creation |

## Compute Resources

| Prompt                            | Effect                             | When        |
| --------------------------------- | ---------------------------------- | ----------- |
| Append "use subagents" to request | Parallel processing with subagents | Large tasks |

## Debugging

| Prompt                        | Effect                             | When        |
| ----------------------------- | ---------------------------------- | ----------- |
| "Go fix the failing CI tests" | Let it run without micromanagement | CI failures |

## Workflow

| Technique                                                                            | Effect                          |
| ------------------------------------------------------------------------------------ | ------------------------------- |
| Plan Mode → review with separate Claude session                                      | Improve plan quality            |
| Switch back to Plan Mode the moment something goes sideways                          | Avoid wasting time on bad paths |
| After every correction: "Update your CLAUDE.md so you don't make that mistake again" | Prevent recurring mistakes      |

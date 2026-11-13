---
name: sweep
description: Sweep the whole codebase through one lens, fix what is certain, and return the rest as a file:line list. Do NOT use to review a diff (use audit or polish).
when_to_use: 総点検, 全体を見直して, ホットパス, 暗黙の状態機械, モジュールを深く, 過剰な防御, 不要なコード, テストの整理, sweep, codebase scan
argument-hint: "<lens: async | state | modules | defense | dead | tests> [target path]"
---

# /sweep - Codebase Sweep

One run looks through one lens. That splits the diff by lens and keeps it small enough for a person to read.

## Input

| `$ARGUMENTS` | How it is read |
| --- | --- |
| A lens name | Sweep through that lens from the repository root |
| A lens name and a path | Sweep through that lens under the path only |
| empty | Ask for one lens via AskUserQuestion |

## Lenses

| Lens | What to find | How to fix |
| --- | --- | --- |
| `async` | Awaits on a hot path that do not depend on each other yet run one after another | Run them concurrently. Where the order matters, do not fix; list it |
| `state` | Implicit state machines spread across flags and booleans | Turn them into a type with explicit states and transitions. Do not fix conflicting transitions; list them |
| `modules` | Shallow modules: a wide interface over a thin body. Modules whose deletion would lose nothing. Special cases, ordering rules, validation, and derived values that callers have to know. Parameters the module could work out itself, that every caller passes the same way, or that nobody reads | Fix with Ousterhout's principles: deepen modules and simplify interfaces, pull complexity downwards, define errors out of existence. Keep a module whose deletion would push its complexity back onto its callers; merge away one whose deletion would lose nothing. Put each concept in the one module that owns it, and pull special cases and validation inside. Drop parameters until there is one way to call it. Move every caller to the new shape and delete the old path completely |
| `defense` | Revalidation inside the boundary, needless try/catch, single-use helpers, guards against cases that will not happen | Validate an external value once, at the boundary that owns it. Pass typed values inward |
| `dead` | Unused code, compatibility code no longer needed, docs that contradict the code | Delete it, or make the docs match the code. Do not touch a published API or a stored data format; list it |
| `tests` | Tests coupled to structure, module mocks, tests with logic, tests that do not check behavior | Check user-visible behavior through the public API. Use real dependencies instead of mocks. Delete a test only when another test calls the function it guards |

## Whether to fix

Rate each candidate 1 to 10 on how often it would happen and how bad it would be.

| Condition | Treatment |
| --- | --- |
| Frequency × severity is 5 or more, and the fix keeps behavior | Fix it |
| Frequency × severity is below 5 | Do not fix; list it |
| The fix changes behavior, or touches a published API or stored data | Do not fix; list it |
| You want to add a guard | Do not add it. List the failure mode, its likelihood, and the added complexity |

## Steps

1. Read `.claude/OUTCOME.md` and confirm the sweep target sits inside the outcome. If absent, generate the stub via /outcome.
2. Look for the lens's "What to find" across every target file. Split a wide area across Explore subagents.
3. Apply "Whether to fix" to each candidate.
4. Fix the candidates one at a time, and run the tests after each. When a test fails, revert that fix and list it.
5. When every candidate sits in either "Fixed" or "Listed", return the result in the output shape and stop.

## Output

| Section | Contents |
| --- | --- |
| Fixed | file:line, what was fixed, the tests run and their result |
| Listed | file:line, the problem, frequency × severity, why it was not fixed |
| Not looked at | Files left out of the target, and why |

## Sources

- Output shape: @alexalbert__'s "Fix what you're sure about and list the rest for me to review"
- `async`: @_dylanga. `state`: @steveruizok. `modules`: @veliorix and @_khrus (Ousterhout, A Philosophy of Software Design)
- `defense`: the Style Guide in anomalyco/opencode's AGENTS.md
- Whether to fix: @Voxyz_ai's frequency × severity product
- `tests`: @dmokafa

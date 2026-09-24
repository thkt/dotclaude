---
status: "accepted"
date: "2026-09-25"
decision-makers: thkt
---

# Keep research reports under docs/research in every repository

## Context and Problem Statement

`/research` saved reports to `.claude/workspace/research/`, a directory for session-local working state. DR-0107 made this repository track those reports anyway, so scribe's CI and local runs see the same input. The location said "scratch" while the files were durable, public records. The reports sat apart from `docs/wiki` and `docs/decisions`, the two records they feed.

## Decision Drivers

- The location names what the files are: durable records beside the wiki and the decisions they feed
- scribe keeps one cursor over PRs, issues and research, the reason DR-0107 gave for tracking research at all
- `/research` is a global skill, so one save location serves every repository alike
- The repository is public, so only the reports themselves are tracked, not the notes and scratch files beside them

## Considered Options

- Save to `docs/research/` in every repository (chosen)
- Save to `docs/research/` only where that directory exists, and fall back to `.claude/workspace/research/` elsewhere
- Keep `.claude/workspace/research/` and the negation chain

## Decision Outcome

Chosen option: "Save to `docs/research/` in every repository", because the reports are records in every repository that keeps them. New reports go to one location; reading still covers the legacy roots, so a repository that has not moved its reports keeps finding them.

In this repository, `.gitignore` tracks `docs/research/*.md` and ignores every other file and every subdirectory under it (`/docs/research/*` then `!/docs/research/*.md`). The legacy roots `research/` and `.claude/workspace/research/` keep the same markdown-only rule. A report's working notes, such as the per-ID detail files of the 2026-09-23 prompt audit, stay beside it unpublished. `.rumdl.toml`, `tests/table-paragraph.test.ts` and the retirement tests' `HISTORICAL_DIRS` treat `docs/research/` as history, the same way they treated the old path. `rules/conventions/MARKDOWN.md` lists `docs/research/**` as LLM-facing, since `/research` writes it and `/think` and `/scribe` read it.

`find-prior-research.ts` searches `docs/research`, `research` and `.claude/workspace/research` together, and an identical copy of the same report under two roots comes back as one candidate with `aliases`. scribe's research scan passes all three roots as pathspecs to `git log`. With a pathspec naming only the new path, git cannot pair a moved report with its old path, so the move commit would hand all 41 reports back to scribe as new input. scribe's wiki evidence links to the original report, and a legacy `(research)` marker whose original is unknown stays unlinked.

### Consequences

- Good, because a moved report keeps its history as a rename, and scribe does not read it again
- Bad, because `.gitignore` keeps a negation chain for each legacy root until every repository has moved its reports
- Bad, because a new report in another repository lands under `docs/`, which that repository may publish or lint. Each repository decides through its own `.gitignore` whether `docs/research/` is tracked

### Confirmation

`skills/scribe/tests/research_tracking_test.py` asserts that `git check-ignore` passes a markdown file directly under `docs/research/`, ignores a non-markdown file and a subdirectory file there, and keeps ignoring `.claude/workspace/planning/`. It also builds a repository, moves a report into `docs/research/` with `git mv`, and asserts that the scan command read out of `skills/scribe/SKILL.md` lists a newly added report and skips the moved one.

## Pros and Cons of the Options

### Save to docs/research/ only where it exists

- Good, because repositories that never opted in keep their reports untracked and out of `docs/`
- Bad, because the save location would differ per repository, and the user chose one location for all repositories

### Keep .claude/workspace/research/

- Good, because nothing moves
- Bad, because the directory name keeps contradicting the files' role, and the negation chain stays

## More Information

Supersedes DR-0107. Its reasoning for tracking research to keep scribe's single cursor still holds and carries over; only the location changes. PR #755 (#753) added the multi-root read, the `aliases` deduplication and the original-linked wiki evidence; this record describes the merged result.

`critic-design` reviewed the plan before implementation (verdict GO). Its high findings are the rename-blind scan, the table-paragraph test scanning `docs/`, and the need to land the lint and test exclusions in the same commit as the move. All three are addressed above. This DR supersedes DR-0107, so the skill's Challenge step asks for `/challenge`. That step is covered by this critique, not by a separate `/challenge` run.

### Transition Plan

- This repository: the 36 tracked reports moved with `git mv`, and the 5 untracked ones were added. The prompt-audit detail directory moved beside its report and stays ignored. A stray `.json` report and an empty `.claude/.cc-writes` directory were moved to the Trash
- Other repositories: out of scope. Each moves its reports and decides tracking on its own

### Reassessment Triggers

- A repository needs its research reports kept out of `docs/` for publishing or linting reasons that its own `.gitignore` cannot handle
- research reports gain content that cannot be public

---
name: scribe-setup
description: Prepare a target repo to be picked up by scribe (the mechanism that accumulates code-structure docs/wiki). Places the wiki-convention README and creates the scribe label.
when_to_use: このリポを scribe に追加, wiki 蓄積を始めたい, scribe setup, wiki 蓄積の準備
allowed-tools: Bash Read Write Edit Glob Grep
---

# scribe setup

Prepare a target repo to be picked up by `~/.claude/scribe`. Leave the mechanism itself untouched and, on the target repo side, put `docs/wiki/README.md` and the GitHub scribe label in place. The presence of `docs/wiki/README.md` itself is the mark of a scan target (there is no registry).

The target repo is the path argument, or cwd when absent. Hereafter `<repo>` is its absolute path.

## Phase 1. Understand the target repo

1. Resolve `<repo>` to an absolute path and `cd <repo>`. If it is not a git repo, stop and explain why.
2. Check the existing state. If `docs/wiki/README.md` exists, confirm with the user "already set up; does re-running overwrite the existing one?" before proceeding.
3. Get the slug with `gh repo view --json nameWithOwner -q .nameWithOwner`. For a repo where this fails (no GitHub remote), explain that it cannot be a scribe target and stop.
4. If `<repo>` is outside run.sh's SCAN_ROOTS (`~/Personal`, `~/GitHub/*/*`), tell the user it will not ride the periodic scan and runs only manually.

## Phase 2. Place the wiki-convention README

```bash
mkdir -p <repo>/docs/wiki
cp ~/.claude/scribe/wiki-readme.template.md <repo>/docs/wiki/README.md
```

The template is generic, so leave it mostly as-is. Add repo-specific formatting here if any. If a README already exists, confirm the diff with the user before overwriting.

## Phase 3. Create the scribe label

Create the label attached to PRs once in the target repo. scribe's diff baseline (searching for the last merged scribe PR) also depends on this label.

```bash
gh label create scribe -R <owner/repo> -c '#0E8A16' -d 'scribe が提案する wiki 更新' 2>/dev/null || true
```

## Phase 4. Confirm the first run

Confirm with the user "run the first scan now (read the whole codebase, seed the wiki, and open a PR)?". If running:

```bash
~/.claude/scribe/run.sh <repo の絶対パス>
```

codex runs, so it takes about 2 minutes and a hundred-some thousand tokens per repo. Report the PR URL when done. Approval is the user merging that PR. scribe never touches the default branch directly.

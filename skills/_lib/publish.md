# Publish procedure

Commit the files the calling skill wrote as one commit and open a draft PR. `/sweep`, `/dr`, and `/outcome` read this file as their last step.

## Values the caller passes

The subject opens with the prefix `workflows/implement.js` requires of an Issue title. Write the title in the language of `language` in `~/.claude/settings.json`, and in English when it is unset.

| Value   | Contents                                                                  |
| ------- | ------------------------------------------------------------------------- |
| branch  | The name of the branch to create when the current branch is the base      |
| subject | `[<prefix>] <title>`. The commit subject and the PR title use the same one |
| body    | The commit and PR body                                                    |
| files   | The paths of the files to `git add`                                       |

## Steps

1. Confirm the target repo's root with `git rev-parse --show-toplevel`. When `.dotagents.json` sits at the root, read it with `cat` and take the base from `baseBranch` and the remote from `remote`. Otherwise take the base from `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` and use `origin` as the remote
2. When the current branch is the base, run `git switch -c` with the name the caller passed. Otherwise keep the current branch. When a branch of the same name exists either locally (`git branch --list <name>`) or on the remote (`git ls-remote --heads <remote> <name>`), append a number starting from `-2`. Check each numbered name with the same two commands
3. When `.dotagents.json` carries `check`, run it at the repo root. Pass an array as command plus arguments, and a string to `sh -c`. When it exits non-zero, neither commit nor push; report the failing output and stop
4. Run `git add` on the files the caller passed, naming each path. Do not use `git add -A`, `git add .`, or `git commit -a`
5. Write the message, the subject on line 1 and the body after a blank line, to a file under `$TMPDIR`, and commit with `git commit -F <file>`
6. Run `git push <remote> <branch>`
7. Check for an open PR with `gh pr list --head <branch> --state open --json url`. When one exists, create none and use its URL. Otherwise write the body to a file under `$TMPDIR` and run `gh pr create --draft --base <base> --head <branch> --title <subject> --body-file <file>`
8. Report the PR URL

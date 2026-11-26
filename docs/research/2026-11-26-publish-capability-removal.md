# Research: publish-capability-removal

| Item | Value |
| --- | --- |
| Generated | 2026-11-26 |
| Intent | [#951](https://github.com/thkt/dotclaude/issues/951). Check whether an agent session can be built without the means to publish (push to GitHub, create a PR), within the Claude Code settings, before any implementation Issue |
| Domain | Harness |
| Prior research | thkt/ai-agent-knowledge `knowledge/command-string-gate-misses-publish-spellings.md` (2026-11-23, 16 of 29 spellings passed `publish_gate.ts`) |

## Verdict

Partly buildable. The answer differs between the two kinds of session.

| Session | Verdict | Reason |
| --- | --- | --- |
| The `claude -p` children that `launch.ts` starts | Buildable | A `--settings` file that puts the GitHub hosts in `sandbox.network.deniedDomains` and sets `sandbox.allowUnsandboxedCommands` to `false` blocked every shell spelling tried, including the escape-hatch retry. The children never need to publish, because `launch.ts publish` runs in the process that calls `launch.ts`, not in a child |
| The interactive session | Not buildable with the same settings | The sandbox applies per session, not per directory, so denying the hosts also takes away the `gh` reads thkt uses that session for. MCP tools that can create a PR run outside the sandbox |

## Setup

Each child was started from a scratch directory, the same way `skills/implement/scripts/claude-child.ts` starts one, plus `--settings`. The user settings (`~/.claude/settings.json`) stayed loaded. They enable the sandbox, allow `github.com` and `api.github.com` in `sandbox.network.allowedDomains`, and set `permissions.defaultMode` to `auto`.

```sh
claude -p --model claude-haiku-5-5 --max-turns 3 --output-format json --allowedTools Bash --settings <file> "<prompt>"
```

| Item | Value |
| --- | --- |
| Date | 2026-11-26 |
| Claude Code | 2.1.332, child model `claude-haiku-5-5` |
| Repository | thkt/dotclaude main `c35d6bbb` |
| Tools | macOS (arm64), git 2.56.1, Bun 1.4.5, gh logged in through the keyring |
| Documents read | <https://code.claude.com/docs/en/sandboxing> and <https://code.claude.com/docs/en/settings>, read on the date above |
| Total cost of the children | 0.12 USD |

The settings files passed with `--settings` follow.

| Name | Content |
| --- | --- |
| `s0` | `{}` |
| `s1` | `{"sandbox":{"enabled":true,"failIfUnavailable":true,"allowUnsandboxedCommands":false,"network":{"deniedDomains":["github.com","api.github.com","*.github.com"]}}}` |
| `s2` | `s1` plus `"excludedCommands":["./publish.sh","./publish.sh *"]` |
| `s3` | `{"sandbox":{"enabled":true,"failIfUnavailable":true,"allowUnsandboxedCommands":false,"credentials":{"files":[{"path":"~/.config/gh/hosts.yml","mode":"deny"},{"path":"~/Library/Keychains","mode":"deny"}],"envVars":[{"name":"GH_TOKEN","mode":"deny"},{"name":"GITHUB_TOKEN","mode":"deny"}]}}}` |

Every push and PR call targeted `https://github.com/thkt/nonexistent-probe-951.git` (`thkt/nonexistent-probe-951`), a repository that does not exist. A call that reaches GitHub ends with `Repository not found` or `Could not resolve to a Repository`, and a call the sandbox stops ends with `CONNECT tunnel failed, response 403` or `host is on the deny list`. No call could publish anything, whichever way it ended.

## Questions

### A. Can `--settings` on a `claude -p` child deny `github.com` and `api.github.com`?

Yes. A probe script ran the 16 spellings that passed `publish_gate.ts` on 2026-11-23, adapted to the probe URL, plus a plain `git push`, `git ls-remote`, `curl`, and `gh pr create` as controls. The child ran it as one Bash call (`bash probe.sh`), first under `s0` and then under `s1`. Under `s0` every call reached GitHub, and under `s1` every call was stopped. The spelling with an unclosed quote was left out, because the shell cannot run it.

| Spelling | `s0` | `s1` |
| --- | --- | --- |
| `git push <url> HEAD`, `git ls-remote <url>` | reached | stopped (403) |
| `bash -c '…'`, `sh -c "…"`, `eval '…'` | reached | stopped (403) |
| `git -c alias.p=push p …`, `g=git; $g push …`, line continuation inside `push` | reached | stopped (403) |
| `printf '…' \| sh`, python `subprocess.run(["git","push",…])` | reached | stopped (403) |
| `./publish.sh` (a script that runs `git push`) | reached | stopped (403) |
| `cd "$PWD" && git push …`, `git -C "$(pwd)" push …` | reached | stopped (403) |
| `curl https://api.github.com/…` | reached | stopped (403) |
| `gh api repos/…/pulls -f …`, `gh pr create`, `gh pr merge`, `gh workflow run` | reached | stopped (deny list) |
| `git send-pack <url>` | not run, because send-pack does not speak https | not run |

`deniedDomains` won over the user settings, which allow the same hosts. The documentation agrees: a host in `deniedDomains` is refused in every permission mode, even when a broader `allowedDomains` entry would allow it. The sandbox follows child processes, so the spelling of the command does not matter. The 403 came from the sandbox proxy, before any connection to GitHub.

### B. Can the way out of the sandbox be closed?

Yes, for the `dangerouslyDisableSandbox` retry. Under `s1`, the child was told to call Bash with `git ls-remote <url>` and `dangerouslyDisableSandbox: true`. The stream showed that the tool input carried the parameter, and the call was stopped (403, `host is on the deny list`).

The key is `sandbox.allowUnsandboxedCommands`, under `sandbox`. The documentation says that with it `false`, Claude Code ignores `dangerouslyDisableSandbox`. A `false` given through `--settings` also makes the sandbox admin-required, so the settings in a repository's `.claude/settings.json` that loosen the sandbox are ignored, `excludedCommands` among them.

Two ways out remain. `excludedCommands` in the `--settings` file itself opens one (question C). Tools other than Bash are not sandboxed (question E).

### C. Can the publish script alone run outside the sandbox?

Yes, but the agent can then rewrite the script. An excluded script opens the network to whatever the file holds when it runs, so the entry is only as safe as the file.

| Step | What the child did under `s2` | Result |
| --- | --- | --- |
| 1 | Ran `./publish.sh`, `bash -c './publish.sh'`, and `git push <url> HEAD`, each as its own Bash call | `./publish.sh` reached GitHub. The other two were stopped (403). The match is on the call's text, as the documentation says, so `bash -c './publish.sh'` does not match the entry |
| 2 | With Write allowed, overwrote `publish.sh` with a `curl` to `api.github.com`, then ran `./publish.sh` | `status=404`. The rewritten script reached GitHub. The child first tried the call with `allowed_domains`, and Claude Code refused it because an excluded command does not run in the sandbox |

The entry has to name a file the agent cannot write, such as one outside the worktree under a path that both the sandbox and the permission rules protect. That variant was not tried. The children do not need this, because `launch.ts publish` runs in the calling process. C matters only for question G.

### D. Can the `gh` and git credentials be made unreadable?

Yes, for sandboxed commands. `gh auth status` reports the token in the keyring. git has three credential helpers: `osxkeychain` from `/opt/homebrew/etc/gitconfig`, plus `git-credential-manager` and `gh auth git-credential` from `~/.gitconfig`. No `GH_TOKEN` or `GITHUB_TOKEN` is set, and `~/.config/gh/hosts.yml` exists.

Under `s3`, with the GitHub hosts still allowed, the child ran `gh auth token | wc -c`, `git credential fill` counting `password=` lines, a read of `hosts.yml`, and `gh api user`. `gh` stopped at startup (`open ~/.config/gh/hosts.yml: operation not permitted`). The token was 0 bytes, git returned no password, and `gh api user` printed no login.

Denying `hosts.yml` stops `gh` entirely, because gh reads the file before it reads the keyring. The test denied `~/Library/Keychains` together with `hosts.yml`, so it does not show which of the two kept git from getting a password. On macOS, a `mask` entry for a file falls back to a block, so masking cannot keep `gh` working. Once A denies the hosts, D is defense in depth.

### E. Are MCP tools and tools other than Bash in the sandbox?

No. The documentation says local MCP servers, hooks, and the status line run with full access. The built-in file and web tools follow permission rules instead of the sandbox, and `allowedDomains` does not limit WebFetch. WebFetch issues GET requests only, so it cannot push or create a PR.

A child under `s1` was asked to list its `mcp__` tools without calling any. It listed 75 tools, all from claude.ai connectors (Claude Docs, Figma, Google Docs, Google Sheets, Google Slides). None can push or create a PR on GitHub. The list depends on the account's connectors and on the host that starts the session. `claude-child.ts` does not pass `--strict-mcp-config`, so a connector added later reaches the children too.

The interactive session that ran this research has the T3 Code tools, among them `mcp__t3-code__pull_request_create`. Neither the sandbox nor the `Bash` matcher of `publish_gate.ts` covers that tool. It was not called, because calling it creates a real PR.

### F. Does a session with the GitHub hosts denied still finish implementation and `check`?

Yes for `check`. No for the prompts as written.

| Part | Result under `s1` |
| --- | --- |
| `gh issue view` | Stopped (A). The implement and review prompts tell the child to run it (`skills/implement/scripts/prompts.ts` lines 5 and 221), so the child cannot read the Issue. `launch.ts` would have to put the Issue text into the prompt |
| `bun install --frozen-lockfile` | Passed in a clone (397 packages, 644 ms). The packages were cached locally, so this does not show the install with an empty cache. `launch.ts prepare` runs the setup in the calling process anyway, not in a child |
| The whole `check` | Did not finish in one child Bash call. That call has a 10-minute limit, and the child stopped the command after it moved to the background, which left six `launch-*.test.ts` files pending |
| `launch-run.test.ts` alone, to tell the limit from the denied hosts | Passed 46 of 46 tests in 106 seconds, the same as under `s0` |

Every command in `check` reads only local files, and `npx` resolves from `node_modules`. The `done_gate.ts stop` hook runs `check` as a hook, outside the sandbox, so the denied hosts do not reach it.

### G. Can the interactive session that starts publishing get the same settings?

No, not without losing what that session is for.

| Finding | Basis |
| --- | --- |
| The sandbox settings belong to a session, not to a directory. Nothing limits `deniedDomains` to the worktree that holds the gate | The sandboxing page |
| `gh issue view`, `gh pr view`, and `gh pr checks` use the same `api.github.com` as `gh pr create`, so a host rule cannot tell reads from writes. thkt uses the interactive session to read Issues and PRs, and `/implement` reads CI results there | A |
| [#1029](https://github.com/thkt/dotclaude/pull/1029) was pushed from the main checkout with `git push`, and `publish_gate.ts` did not stop it. This is the second path in #951 | Observed in this session |
| The T3 Code MCP tool `pull_request_create` is outside both the sandbox and the hook | E |

To close the session anyway, the publish script would have to run outside the sandbox through `excludedCommands` (C), naming a file the agent cannot write. Even then, the session keeps the MCP tool and every way out that skips the sandbox.

## What a change would need

This covers the `launch.ts` children only, and each item needs its own Issue. The interactive session keeps the risks in question G. The ways to only detect them stay open: record each publish and check the record later.

| Change | Where | What is lost |
| --- | --- | --- |
| Pass a `--settings` file with `deniedDomains` for the GitHub hosts and `allowUnsandboxedCommands: false` | `claude-child.ts`, which today passes `--settings` only from `CLAUDE_RUN_SETTINGS` | The child cannot read anything from GitHub |
| Put the Issue title and body into the implement and review prompts in place of `gh issue view` | `skills/implement/scripts/prompts.ts` | The prompt grows by the Issue's length. An edit to the Issue after `agree` reaches the child only through `reread` |
| Pass `--strict-mcp-config` with no MCP config | `claude-child.ts` | The children lose the claude.ai connectors |
| Add a test that the argv carries the settings and the flag | `skills/implement/tests/` | Nothing |

## Not covered

- The variant of C that names a file the agent cannot write.
- Whether an empty package cache needs `registry.npmjs.org`. This affects only a child that runs `bun install` itself.
- Linux and WSL2, where `mask` works for files.

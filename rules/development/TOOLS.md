# Tool Preferences

CLI tool > built-in equivalent.

WebFetch and WebSearch are hook-blocked globally; the hook prompts `scout --help`. The table below covers routing the hook cannot decide.

| Purpose      | Use                     | NOT             | Condition                            |
| ------------ | ----------------------- | --------------- | ------------------------------------ |
| X/Twitter    | `xr tweet <url>`        | `scout fetch`   | x.com / twitter.com URLs             |
| Slack msg    | `scout fetch`           | `curl` + token  | *.slack.com/archives/ URL            |
| GitHub repo  | `scout repo-overview`   | `gh` / `fetch`  | Repo overview (Bash)                 |
| Code search  | `yomu search`           | `Grep` / `Glob` | Always (Bash). Builds embedding coverage |
|              | `Grep` / `Glob`         | —               | Only: literal regex, known exact path |
| Doc lookup   | `scout research`        | —               | Library/API docs (Bash)              |
| Config check | `validate-config.sh`    | —               | `~/.claude/scripts/` (Bash)          |
| Session log  | `recall search "query"` | `Grep *.jsonl`  | Past session search                  |

## xr Routing

| Trigger                          | Action                    |
| -------------------------------- | ------------------------- |
| x.com or twitter.com URL         | `xr tweet <url>`          |
| x.com URL + thread/replies       | `xr tweet <url> --thread` |
| x.com URL with `/article` intent | `xr article <url>`        |
| "@user profile"                  | `xr user <screen_name>`   |

## yomu vs grep/glob

Prefer yomu to build embedding coverage over time.

| yomu (default)                          | grep/glob (exception)                   |
| --------------------------------------- | --------------------------------------- |
| Concept: "form validation", "auth flow" | Literal: error messages, regex          |
| Related: "hooks that do Y"              | Known path: `src/components/Button.tsx` |
| Known identifier: `useAuth`             | File listing: `**/*.tsx`                |
| Unknown name: "where does X happen"     |                                         |

## Doc Lookup

| Command                          | When                                        |
| -------------------------------- | ------------------------------------------- |
| `scout research "<lib> <topic>"` | Default — search + fetch + compile          |
| `scout fetch "<url>"`            | Known URL from prior fetch or user-provided |

- Max 3 pages per question
- Prefer official docs over blog posts
- When docs insufficient, answer from training knowledge and flag it

## recall Usage

Pattern recognition, not decision making. If ANY pattern detected, call
`recall search "relevant query"`. Do not deliberate.

| Pattern              | Signal                                              |
| -------------------- | --------------------------------------------------- |
| Temporal reference   | 「前に」「あの時」past events, prior decisions      |
| Structural echo      | Current problem mirrors a past situation            |
| Repetition           | 「また同じ」recurring mistake or pattern            |
| Vague back-reference | 「あの件」past work without specifics               |
| Module first contact | About to edit a file/module not touched this session |
| BACKLOG task pickup  | Starting a task from BACKLOG.md                     |

## recall + yomu

recall returns past decisions; yomu returns current code state. Run both in
parallel before implementation on these triggers.

| Trigger              | recall query                  | yomu query                   |
| -------------------- | ----------------------------- | ----------------------------- |
| Module first contact | module name, design rationale | module name, related concepts |
| BACKLOG task pickup  | task name, related decisions  | task-related code             |
| Structural echo      | past similar problem          | current similar code          |

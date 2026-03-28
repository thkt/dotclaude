# Tool Preferences

CLI tool > built-in equivalent.

| Purpose     | Use                   | NOT             | Condition                                |
| ----------- | --------------------- | --------------- | ---------------------------------------- |
| X/Twitter   | `xr tweet <url>`      | `scout fetch`   | x.com / twitter.com URLs                 |
| Slack msg   | `scout fetch`         | `curl` + token  | \*.slack.com/archives/ URL               |
| URL fetch   | `scout fetch`         | `WebFetch`      | Always (Bash)                            |
| Web search  | `scout search`        | `WebSearch`     | Always (Bash)                            |
| GitHub repo | `scout repo-overview` | `gh` / `fetch`  | Repo overview (Bash)                     |
| Code search | `yomu search`         | `Grep` / `Glob` | Always (Bash). Builds embedding coverage |
|             | `Grep` / `Glob`       | —               | Only: literal regex, known exact path    |
| Session log | `recall search "query"` | `Grep *.jsonl` | Past session search                     |

## xr Routing

| Trigger                            | Action                    |
| ---------------------------------- | ------------------------- |
| x.com or twitter.com URL           | `xr tweet <url>`          |
| x.com URL + thread/replies context | `xr tweet <url> --thread` |
| x.com URL with `/article` intent   | `xr article <url>`        |
| "@user profile"                    | `xr user <screen_name>`   |

## yomu vs grep/glob

Prefer yomu even for simple searches to build embedding coverage over time.

| yomu (default)                          | grep/glob (exception)                   |
| --------------------------------------- | --------------------------------------- |
| Concept: "form validation", "auth flow" | Literal: error messages, regex          |
| Related: "hooks that do Y"              | Known path: `src/components/Button.tsx` |
| Known identifier: `useAuth`             | File listing: `**/*.tsx`                |
| Unknown name: "where does X happen"     |                                         |

## recall Usage

Pattern recognition, not decision making. If ANY pattern detected, call
`recall search "relevant query"`. Do not deliberate.

| Pattern | Signal |
| --- | --- |
| Temporal reference | 「前に」「あの時」「この前」、past events, prior decisions |
| Structural echo | Current problem/design mirrors a past situation |
| Repetition | 「また同じ」「繰り返し」、recurring mistake or pattern |
| Vague back-reference | 「あの件」「前にやったやつ」、past work without specifics |
| Module first contact | About to edit a file/module not yet touched this session |
| BACKLOG task pickup | Starting a task from BACKLOG.md |


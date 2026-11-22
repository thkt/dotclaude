---
paths:
  - "**/package.json"
  - "**/bunfig.toml"
  - "**/bun.lock"
---

# Bun

A repository of thkt's that uses Bun keeps a `bunfig.toml` at its root. It makes the `node_modules` layout `bun install` builds and the way it picks versions match across the local machine, CI, and cloud sessions. A repository of thkt's is one whose `origin` points at `github.com/thkt/`.

On the local Mac, `~/.bunfig.toml` holds the same two keys and `globalStore = true`. The repository's `bunfig.toml` is there for CI, cloud sessions, and other machines, which do not read that file. Do not remove it because it overlaps the local setting.

## What to put in it

```toml
[install]
minimumReleaseAge = 259200
linker = "isolated"
```

Each key decides the behavior below.

| Key                 | Behavior it decides                                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimumReleaseAge` | `bun add` and a `bun install` that rewrites the lockfile do not pick a version published less than 3 days ago. An install with `--frozen-lockfile` installs the lockfile's versions as they are |
| `linker`            | Builds `node_modules` in the same layout as pnpm. Importing a package not listed in `package.json` fails in every environment                                                                   |

## Keys left out

Do not add `globalStore = true` to the repository's `bunfig.toml`. The global store speeds up only a `bun install` whose packages are already in the cache. CI in thkt's repositories does not carry bun's cache over between runs, so the key does not speed it up. On the local Mac, `~/.bunfig.toml` holds this key.

## Repositories that use textlint

A repository that uses textlint adds `globalStore = false` to its `bunfig.toml`. Under the `globalStore = true` in `~/.bunfig.toml`, textlint looks for its rules from its own location in the global store, loads none of them, and fails. The repository's `globalStore = false` takes precedence over the value in `~/.bunfig.toml`. The speed given up is about 0.2 seconds per `bun install` on roughly 400 packages.

Passing `--rules-base-directory "$PWD/node_modules"` to textlint also lets it load the rules. That option is not chosen, because every textlint invocation would need it.

## Handling by situation

| Situation                                     | Handling                                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| thkt's repository has no `bunfig.toml`        | Create it with the content above                                                                                             |
| thkt's repository has a `bunfig.toml`         | Add only the missing keys, and leave the existing keys and values unchanged                                                  |
| A repository not owned by thkt (work or team) | Do not add the file; propose adding it to thkt                                                                               |
| An import fails under isolated                | Add the dependency to that `package.json`. Only when you cannot, set `linker = "hoisted"` and write the reason in the commit |

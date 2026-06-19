---
name: prototype
description: Build a throwaway prototype that answers a question. A runnable terminal app for logic/state questions, or several UI variants on one route for appearance questions. User-invoked only.
when_to_use: プロトタイプ, 試作, prototype, throwaway, UI variant を試したい
allowed-tools: Read Write Edit LS Bash(ugrep:*) Bash(bfs:*) AskUserQuestion
model: opus
argument-hint: "[design question to prototype]"
---

# /prototype - Throwaway Design Prototype

A prototype is throwaway code that answers a question. The question decides the shape.

## Input

- Design question: `$ARGUMENTS`
- If `$ARGUMENTS` is empty, get the question via AskUserQuestion

## Invocation Policy

User-invoked only. The model does not start a prototype mid-implementation on its own. It runs only on an explicit request (`/prototype` invocation, or a when_to_use trigger word).

## Branch Selection

Pick the branch by the kind of question being answered. Decide from the user's prompt, the surrounding code, or by asking if the user is around.

| Question                                  | Branch | Reference           |
| ----------------------------------------- | ------ | ------------------- |
| Does this logic / state model feel right? | LOGIC  | references/logic.md |
| What should this look like?               | UI     | references/ui.md    |

The two branches produce very different artifacts. Getting it wrong wastes the whole prototype. If the question is genuinely ambiguous and the user is unreachable, default by the surrounding code (a backend module to logic, a page or component to UI). State that assumption at the top of the prototype.

## Rules for Both Branches

| Rule                       | Directive                                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Throwaway from day one     | Locate it close to where it will be used, but name it so a casual reader sees it is a prototype, not production. A throwaway UI route follows the existing routing convention and invents no new top-level structure |
| One command to run         | Register it in the existing task runner (`pnpm <name>` / `python <path>` / `bun <path>`). The user starts it without thinking                                                                                        |
| No persistence by default  | State lives in memory. Persistence is what the prototype checks, not what it depends on. If the question involves a DB, hit a scratch DB or a local file named "PROTOTYPE wipe me"                                   |
| Skip the polish            | No tests. No error handling beyond what makes it runnable. No abstractions. The point is to learn fast and delete                                                                                                    |
| Surface the state          | After every action (logic) or on every variant switch (UI), render the full relevant state                                                                                                                           |
| Delete or absorb when done | Once the question is answered, delete the prototype or fold the validated decision into the real code. Do not leave it rotting in the repo                                                                           |

## When Done

The only thing worth keeping from a prototype is the answer to its question. Record the question and answer somewhere durable (commit message, ADR, issue, or a `NOTES.md` next to the prototype). If the user is around, that capture is a quick conversation; if not, leave a placeholder and fill in the verdict on the next pass before deleting the prototype.

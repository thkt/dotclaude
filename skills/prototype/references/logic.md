# Logic Prototype

A tiny interactive terminal app that lets the user drive a state model by hand. Use it when the question is about business logic, state transitions, or data shape. The kind of thing that looks reasonable on paper but only feels wrong once pushed through real cases.

## When This Is the Right Shape

- "I'm not sure this state machine handles the edge case where X then Y."
- "Does this data model actually let me represent this case?"
- "I want to feel out what the API should look like before writing it."
- Anything where the user wants to press buttons and watch state change.

If the question is "what should this look like", wrong branch. Use ui.md.

## Process

### 1. State the Question

Before writing code, write down which state model and what question you are prototyping. One paragraph, in the prototype's README or a comment at the top of the file. A logic prototype that answers the wrong question is pure waste, so make the question explicit so it can be checked later, whether the user is watching now or returning to it AFK.

### 2. Pick the Language

Use whatever the host project uses. If the project has no obvious runtime (a docs repo), ask. Match the project's existing conventions for tooling and do not add a new package manager or runtime just for the prototype.

### 3. Isolate the Logic in a Portable Module

Put the bit that answers the question (the actual logic) behind a small, pure interface that could be lifted into the real codebase later. The TUI around it is throwaway; the logic module is not.

The right shape depends on the question.

| Shape                                                | When it fits                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| A pure reducer `(state, action) => state`            | Actions are discrete events and state is a single value          |
| A state machine (explicit states/transitions)        | "Which actions are even legal right now" is part of the question |
| A small set of pure functions over a plain data type | No implicit current state, just transformations                  |
| A class or module with a clear method surface        | The logic genuinely owns ongoing internal state                  |

Pick whichever shape best fits the question, not whichever is easiest to wire to a TUI. Keep it pure: no I/O, no terminal code, no `console.log` for control flow. The TUI imports it and calls into it; nothing flows the other direction. This is what makes the prototype useful past its own lifetime. When the question is answered, the validated reducer / machine / function set lifts into the real module and the TUI shell gets deleted.

### 4. Build the Smallest TUI That Exposes the State

Build it as a lightweight TUI. On every tick, clear the screen (`console.clear()` / `print("\033[2J\033[H")` / equivalent) and re-render the whole frame. The user always sees one stable view, not an ever-growing scrollback.

Each frame has two parts, in this order.

1. Current state, pretty-printed and diff-friendly (one field per line, or formatted JSON). Use bold (ANSI `\x1b[1m`) for field names or section headers and dim (`\x1b[2m`) for less important context (timestamps, IDs, derived values). Reset with `\x1b[0m`. No styling library unless one is already in the project.
2. Keyboard shortcuts, listed at the bottom (`[a] add user  [d] delete user  [t] tick clock  [q] quit`). Bold the key and dim the description, or vice versa, whatever reads cleanly.

Behaviour.

1. Initialise state, a single in-memory object/struct. Render the first frame on start.
2. Read one keystroke (or one line) at a time, dispatch to a handler that mutates state.
3. Re-render the full frame after every action. Replace, do not append.
4. Loop until quit.

The whole frame fits on one screen.

### 5. Make It Runnable in One Command

Add a script to the project's existing task runner (`package.json` scripts, `Makefile`, `justfile`, `pyproject.toml`). The user runs `pnpm run <prototype-name>` or equivalent and never needs to remember a path. If the host project has no task runner, put the command at the top of the prototype's README.

### 6. Hand It Over

Give the user the run command. They drive it themselves. The interesting moments are when they say "wait, that shouldn't be possible" or "huh, I assumed X would be different". Those are the bugs in the idea, which is the whole point. If they want new actions added, add them. Prototypes evolve.

### 7. Capture the Answer

When the prototype has done its job, the answer is the only thing worth keeping. If the user is around, ask what it taught them. If not, leave a `NOTES.md` next to the prototype so the answer can be filled in (by you, if you watched the session) before the prototype gets deleted.

## Anti-patterns

| Trap                                | Reason                                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Add tests                           | A prototype that needs tests is no longer a prototype                                                           |
| Wire to the real database           | Use an in-memory store unless the question is specifically about persistence                                    |
| Generalise                          | No "what if we wanted to support X later". The prototype answers one question                                   |
| Blur the logic and the TUI together | If the reducer / state machine references `console.log`, prompts, or terminal escapes, it is no longer portable |
| Ship the TUI shell into production  | The shell is for being driven by hand from a terminal. The logic module behind it is the bit worth keeping      |

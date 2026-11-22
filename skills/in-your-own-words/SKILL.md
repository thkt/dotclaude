---
name: in-your-own-words
description: Restates, in the agent's own words, the user's goal and the problem the user is trying to solve, so the user can confirm the intent before work starts. Runs only when the user types /in-your-own-words.
when_to_use: 自分の言葉で言い直して, 意図を確認して, 理解を確かめたい, in your own words, restate my intent, play back the goal
disable-model-invocation: true
---

# /in-your-own-words - Restating the user's goal before work

Restate, in your own words, the user's goal and the problem the user is trying to solve. The user reads it and confirms whether the intent came across.

## Steps

1. Write the goal in one or two sentences. Do not paraphrase the instruction; write what holds once the work is done.
2. Write the problem in one or two sentences: why that state does not hold now.
3. For each point the user did not say and you filled in, mark it as an inference and give its basis.
4. Do not start or continue the work. After the restatement, ask the user to correct what is wrong, and end the turn.

## Example

| Verdict | Restatement |
| --- | --- |
| Bad | "You want me to fix the conflict in #924." It paraphrases the instruction and states no goal or problem |
| Good | "Goal: `bun install` gets faster on this Mac. Problem: `globalStore` is off, so every worktree copies its packages. Inference: I read 'let's fix it' as being about speed, because I had just written that install does not get faster" |

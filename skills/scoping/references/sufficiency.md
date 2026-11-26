# Judging sufficiency

First identify what to decide next, then judge the needed evidence and the gaps with seven questions. Do not demand the same amount of information for starting an investigation as for starting implementation.

Do not save answers to every item in a separate form. Do not count the unconfirmed as sufficient, and do not offset a serious gap with other items.

Check how the current implementation, sources, and agreement bear on this decision. Do not use the model's confidence, the number of sources, the number of searches, or filled-in formats as evidence. When a gap or changed evidence drives the decision, stop the dependent work, and leave the affected decision and the condition to resume in the Issue or draft.

| Aspect                     | Question                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose                    | Can you explain whose what improves, the next decision, and the state reached?                                                                                                                               |
| Evidence                   | Can you confirm the source, target version, freshness, and scope of application?                                                                                                                             |
| Constraints / alternatives | Did you check the constraints, dependencies, and alternatives that drive the decision? Did you consider reusing existing parts, standard APIs, installed libraries, and examples, and what is still missing? |
| Uncertainty                | Could an unconfirmed item change the next decision? Is there evidence that it does not?                                                                                                                      |
| Consistency                | Did you resolve contradictions among requirements, facts, policy, and agreement?                                                                                                                             |
| Permission                 | Is there agreement on the target and scope, and the permission, that the next work needs?                                                                                                                    |
| Need                       | Can you show that this requirement is needed, by something that happened, a statement by the person who agrees to the Issue, or an agreed Issue?                                                            |

## Organizing evidence and direction

1. Identify the unknowns that could change the next decision, and check the sources of the request or Issue, related documents, and the current code, tests, dependency versions, and agreement. For past conclusions, confirm the conditions under which they apply this time.
2. Check the differences from existing parts, standard APIs, installed libraries, and close examples. For a home-grown implementation, show why existing features fall short and the cost of introduction and maintenance. For a logic requirement, make concrete the input and output constraints, failure conditions, asynchronous handling, and responsibility boundaries.
3. Separate facts, guesses, proposals, and agreement. Make the sources, target versions, scope of application, unconfirmed items, the minimal solution, done conditions, out-of-scope items, and verification method traceable from the Issue or draft.
4. When the implementation relies on a premise, write into the requirements that premise and what happens for an input that does not satisfy it. A premise is a property of the input or of a transformation that the implementation counts on, where a violation raises no error and returns a wrong result. "The list is already sorted", "IDs do not repeat", and "rounding does not change the total" are examples, not limited to these. When handling such an input correctly is out of scope, still write into the requirements a behavior that does not give a wrong result, and add the range in which the premise holds. Leaving the input unhandled, rejecting it, and returning it unchanged are examples of such a behavior, not limited to these. A premise written as a bare fact leaves the implementation without handling for inputs outside it, and the independent review cites the Issue's statement as its reason not to make the gap a required finding.
5. Before writing in the Issue what existing code or an existing test does today, confirm it in that file. When the scope says to extend an existing test, confirm in the file the test to extend. Use a document such as the README as a lead for where to look, and take what the file says as the evidence. Find a test that a document names by reading the test file to its last line. When the document gives no test name, search the test directory for the words that describe the behavior. Write a test you cannot find as absent. When a document and the file disagree, write what the file says in the Issue, and write the disagreement there too.
6. When `check` is the verification method for a done condition, identify in the test files, for each condition, the test that confirms it. When no existing test does, write the test to add into the scope. For a condition with no test added, judge its verification with the table in § Steps the target repo's policy imposes, as one that none of `check`, `capture`, and CI when publishing runs.
7. For a requirement that fixes existing code returning a result different from what is required, confirm the root cause in the code before agreement. Write the root cause into the Issue as which line of which file returns a different result, for which input, and why. When the place the symptom shows differs from the place of the cause, write the place of the cause. When you cannot identify the root cause, do not agree on a fix. Make the investigation of the cause the scope of that Issue. Write into that Issue's scope that the result of the investigation is written under the target repo's `docs/research/`. `check` does not confirm whether the result states the root cause as which line of which file returns a different result, for which input, and why, so do not put it in the done conditions. Write it as a handover to the person who reviews the PR with "Hand it over to a named owner" under § Steps the target repo's policy imposes.

## When there is a UI requirement

Check the implementation version, scope of application, and usage policy of the parts used this time against the design system, Storybook, existing screens, and tests. Confirm the states and operations the requirement involves, and keyboard, focus, and screen width, and separate the existing verification of a part alone from the verification added for this placement, data, and navigation.

Do not make the existence of Storybook a requirement or evidence of agreement. When existing material leaves the interaction spec unclear and it drives the decision, close that gap before agreeing on a UI proposal.

## Evidence of need

For each Issue, show at least one piece of evidence of need. Write each as one line of the form `Evidence: <kind>: <locator>`, right after the paragraph of the body that states the purpose. Write the line in the language of the Issue body: `根拠: 観測: …` in a Japanese body, and `Evidence: observed: …` in an English body. The line points to where the evidence is, and having the line does not by itself make the evidence enough. Before writing it, open the locator and confirm that it states the same matter as the requirement. When you reopen an existing Issue that has no such line, confirm then and add the line.

A failing test and the output of a run back up a claim. They show that a defect exists, not that it needs fixing.

For a requirement an AI agent brought in, when the Issue has neither of the following two, write the sentence "This has not happened in use or in a run." in the question that asks for agreement. The two are an `observed` line, and a `parent issue` line that points to an Issue with evidence lines. Quote the answer to that question as the `decision` line.

There are exactly these three kinds. In a Japanese body, write the three kinds as `観測`, `決定`, and `上位の要求`.

| Kind | What counts | What the locator gives | What does not count |
| --- | --- | --- | --- |
| `observed` | What happened during use or a run, without anyone trying to check it. Reports from people and upstream announcements count | The date it happened, and one of a PR, an Issue, a CI run, a session ID, or the announcement URL | A result an AI agent got by running something to check it, from any session. Reproductions, trial code, tests written locally to fail, and findings of an AI agent that reviewed are such results |
| `decision` | A statement in which the person who agrees to the Issue raised this requirement on their own. Or, for a requirement an AI agent brought in, the answer to a question that showed "This has not happened in use or in a run." | The date and a quote of the statement, with the session ID when there is one | For a requirement an AI agent brought in, the answer to a question that did not show that sentence. A reply that states nothing, such as "go ahead" |
| `parent issue` | An agreed Issue names this work in its scope. That Issue itself need not have evidence lines | The Issue number and the sentence that names this work | The repo goal (`.claude/OUTCOME.md`) and decision records. They can explain the purpose, but are not evidence of need |

## Steps the target repo's policy imposes

For requirements handed over to implementation, list the steps the target repo's README and development policy impose on this change. Count the steps for the Issue body, and also the checks and approvals for the documents the implementation changes, the PR body, publication, and capture. Put the verification methods that confirm the Issue's done conditions on the same list. The verifications `launch.ts` runs itself are the `check` of `.dotagents.json`, the capture, and CI when publishing, and no other. The capture is the one `capture` configures, and the CI is `ciChecks`. To judge a verification method, read `check` and `capture` in the committed `.dotagents.json`. When none of the three runs it, it is a step `launch.ts` cannot carry out, even when a document of the target repo says another run does it. The sessions `launch.ts` starts cannot ask a human, and its independent review raises a step not carried out as the policy says as a required finding. A step whose handling is undecided leaves repair and review making no progress after the implementation is done, and the run stops as `disagreement` or `not-converging`.

Show the listed steps and their verdicts to the human as a list, in the same round as the questions, and write them into the Issue or the draft. An installed CLI is not grounds for judging that a step can be carried out. Without the record, `/implement` cannot tell whether the listing has been done.

Give each step a verdict from the table. For a step `launch.ts` cannot carry out, agree with the human through AskUserQuestion on one of the three under § Handling a step `launch.ts` cannot carry out, in the same round as the other questions.

| Verdict                           | Condition                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `launch.ts` cannot carry it out   | The procedure the step points to does not exist. Open the document and section the policy names to check                       |
| `launch.ts` cannot carry it out   | A CLI it needs is missing (check with `command -v <name>`), or a permission it needs is missing                                |
| `launch.ts` cannot carry it out   | It takes a human's action                                                                                                      |
| `launch.ts` cannot carry it out   | It takes an operation a run of `launch.ts` forbids: starting a browser or a server, changing `.dotagents.json`, editing outside the worktree |
| `launch.ts` cannot carry it out   | A verification method that none of the configured `check`, `capture`, and CI when publishing runs                              |
| `launch.ts` can carry it out      | None of the above applies                                                                                                      |

### Handling a step `launch.ts` cannot carry out

For each step choose one handling from these three, and write its name into the Issue as it is written here. There is no handling in which someone inside the run does the step later. `launch.ts`, which runs the check and the capture, is inside the run too. Agreeing on that leaves the repair and the review disagreeing after the implementation, and the run stops as `disagreement` or `not-converging`. Do not add to the handling cell, or to an option you offer the human, a step that someone inside the run does in its place. Someone inside the run means `launch.ts`, the implementation session, or the review sessions. Add that step to the list as a step of its own and judge it by the same table. A step a named person does outside the run, and a change that puts the step into `check` or `capture`, are not such a step. A step added to the cell stays inside the run without having been judged.

| Handling                         | What it means                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Put it into the check or capture | Change `check` or `capture` of `.dotagents.json` so that it runs the step. Write the change into the Issue, and a human commits it before launch. `/implement` confirms the committed setting      |
| Hand it over to a named owner    | It is done outside the run of `launch.ts`. Take it out of the done conditions and write it as a handover, with who does it and when. The review treats it as a handover, and in the PR it stays an unverified item |
| Leave it out of this scope       | Remove it from the done conditions and the verification methods, and write the reason into the Issue                                                                                                |

## Questions and re-evaluation

Do not read an unanswered, withdrawn, or partial answer as agreement. Once an answer arrives, record its scope and re-evaluate whether the evidence and agreement suffice for the next decision.

At the point a direction is decided, reflect the requirements, done conditions, verification methods, agreed scope and evidence, and open items in the Issue or draft. Do not transcribe each question or create a separate canonical source.

When a gap remains, stop the dependent work and re-evaluate once it is closed. When the same investigation or question brings no new evidence, consult with what is confirmed and the decision needed.

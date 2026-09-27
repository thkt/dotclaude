# Judging sufficiency

First identify what to decide next, then judge the needed evidence and the gaps with six questions. Do not demand the same amount of information for starting an investigation as for starting implementation.

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

## Organizing evidence and direction

1. Identify the unknowns that could change the next decision, and check the sources of the request or Issue, related documents, and the current code, tests, dependency versions, and agreement. For past conclusions, confirm the conditions under which they apply this time.
2. Check the differences from existing parts, standard APIs, installed libraries, and close examples. For a home-grown implementation, show why existing features fall short and the cost of introduction and maintenance. For a logic requirement, make concrete the input and output constraints, failure conditions, asynchronous handling, and responsibility boundaries.
3. Separate facts, guesses, proposals, and agreement. Make the sources, target versions, scope of application, unconfirmed items, the minimal solution, done conditions, out-of-scope items, and verification method traceable from the Issue or draft.

## When there is a UI requirement

Check the implementation version, scope of application, and usage policy of the parts used this time against the design system, Storybook, existing screens, and tests. Confirm the states and operations the requirement involves, and keyboard, focus, and screen width, and separate the existing verification of a part alone from the verification added for this placement, data, and navigation.

Do not make the existence of Storybook a requirement or evidence of agreement. When existing material leaves the interaction spec unclear and it drives the decision, close that gap before agreeing on a UI proposal.

## Questions and re-evaluation

Do not read an unanswered, withdrawn, or partial answer as agreement. Once an answer arrives, record its scope and re-evaluate whether the evidence and agreement suffice for the next decision.

At the point a direction is decided, reflect the requirements, done conditions, verification methods, agreed scope and evidence, and open items in the Issue or draft. Do not transcribe each question or create a separate canonical source.

When a gap remains, stop the dependent work and re-evaluate once it is closed. When the same investigation or question brings no new evidence, consult with what is confirmed and the decision needed.

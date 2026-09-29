# Choosing the tests this change needs

Follow the target repo's test policy. Use the cases below only when the change has a matching failure condition that existing verification does not guard. Confirm a normal control and the targeted failure, at the smallest layer that can observe it.

## UI E2E waits and independence

Apply only when creating or updating an E2E test for a UI that renders or refetches asynchronously.

- When tests share mutable data, check that each test can prepare and clean up on its own.
- Wait for the state or response that matches the operation, not for a fixed time chosen to make the test pass. Before asserting absence, confirm a positive condition such as an element that shows the screen is ready. Do not pass on absence alone when the target is absent even before the screen is ready.
- When the same value can appear again after a refetch, do not treat the displayed value as proof of the update. Confirm the response that matches the operation.

Do not apply this when an existing test guards the same failure, when the UI is not asynchronous, or to a pause that only makes a captured video easier to read. Keep the video pause apart from the waits that decide correctness. Do not ban fixed waits across the board or restructure every E2E test.

## Rejecting external input

| Item                      | Content                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Applies when              | The change touches a boundary that accepts a value from outside, such as a model response or stored JSON                                                                                |
| Behavior to guard         | Only a response with the required shape and the target ID counts as the current evaluation. Structural validity and the semantic match of target and permission are separate guarantees |
| Control and failing input | Against a complete review response, give a missing required field, an extra field, and a different `targetId`, each on its own                                                          |
| Observation               | The normal response parses. Each bad response is rejected as a malformed shape or a target mismatch. A rejection by some other bad field is not evidence of the targeted one            |
| Smallest layer            | A function test parses the value. Choose an integration test through the real entry only when the change also alters what is stored or published after a rejection                      |
| Does not apply            | A document or display cleanup that leaves the input contract unchanged, or a change whose bad input an existing test already catches                                                    |

## Side effects and record preservation on a stop

| Item                      | Content                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Applies when              | The change alters the path after a failure, such as a stop after a failed evaluation, a repair launch, or an update of stored history                           |
| Behavior to guard         | An invalid re-evaluation does not become the current success. The last complete evaluation and the original log stay, and no later repair or publication starts |
| Control and failing input | Separate the condition where a valid re-evaluation moves on from a re-evaluation that omits the update to earlier findings                                      |
| Observation               | The latter stops as `invalid_review`, keeps the earlier `reviewHistory` and the work, and builds no next repair input. An exception alone is not enough         |
| Smallest layer            | Stored state and the later launch are at stake, so an integration test through the host entry is needed. Do not re-check a pure parse rejection here            |
| Does not apply            | A change that touches no stop path or persisted state, or one whose failure result an existing integration test already observes                                |

## A change of the target version

| Item                      | Content                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Applies when              | The change alters where the target or its evidence is re-read before or after verification, evaluation, or publication, and when an earlier success may be reused                                            |
| Behavior to guard         | When the target changes after a confirmation, the old success is not carried over to the current target. The run stops with its stored result kept                                                           |
| Control and failing input | Compare a re-check on the same target with one after a tracked file changed. Make the change a real one in the detected set                                                                                  |
| Observation               | The former reuses the success. The latter returns `target_changed_after_stop` and leaves the earlier verification state as it was. A stop from some other bad setting does not count as detecting the change |
| Smallest layer            | The contract spans the Git target and stored state, so choose an integration test. A pure comparison function cannot show that reuse is blocked                                                              |
| Does not apply            | An internal cleanup that leaves the reading of the version and the reuse conditions unchanged, or a change whose time, target, and side effect an existing test already guards                               |

## A check that finds nothing

| Item                      | Content                                                                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Applies when              | The change alters what counts as success for a test runner, lint, or evaluation, or how the checked targets are selected                                                                        |
| Behavior to guard         | Zero targets run, or nothing run, is not shown as success. The check rejects the bad input it aims at                                                                                           |
| Control and failing input | Against a run of two normal tests, give an empty test file, a skip, and an intended bad response, each on its own                                                                               |
| Observation               | Only the normal run reports success. Zero tests and a skip exit 1 with a reason. For a bad-input check, confirm it failed on the targeted rule                                                  |
| Smallest layer            | When the runner wiring changes, start the public entry against a small temporary fixture. For a single pure rule, do not start the whole process                                                |
| Does not apply            | An ordinary document change that leaves the check definition alone, or a change where a check that finds nothing is not the failure at hand. Do not inject a fault into every test on every run |

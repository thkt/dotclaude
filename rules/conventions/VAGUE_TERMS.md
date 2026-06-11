# Vague Terms

Applies to test descriptions, Issue/PR bodies, commit messages, Spec/SOW, code comments, and technical docs. Specify ambiguous software-development terms before use.

## Define Concretely

| Banned term                                 | Problem                     | Replace with                       |
| ------------------------------------------- | --------------------------- | ---------------------------------- |
| correct / normal / abnormal                 | No baseline                 | Condition and expected result      |
| usual / ordinary / standard / general       | Whose usual?                | Default value or precondition      |
| expected value / as intended / as specified | Empty reference             | Concrete value or behavior         |
| process (noun/verb)                         | What operation?             | Transform, validate, persist, etc. |
| data / information                          | What data?                  | User name, order list, etc.        |
| without issues                              | What was actually checked?  | List verified conditions           |
| appropriately / properly                    | What counts as appropriate? | Concrete operation and criteria    |
| robust / leverage / delve                   | What improves, and how?     | Concrete property or operation     |

## State Comparison Baseline

| Banned term          | Problem       | Replace with                       |
| -------------------- | ------------- | ---------------------------------- |
| large / small amount | No threshold  | Concrete number or threshold       |
| large / small (size) | No baseline   | Concrete size or comparison target |
| latest / oldest      | Scope unclear | Scope and sort key                 |
| fast / slow          | No threshold  | Measured value and threshold       |

## State Scope Explicitly

Models do not generalize an instruction from one item to another, nor infer scope you did not state. When authoring a rule, spec, or prompt, make the intended scope explicit.

| Intent               | Write                                    |
| -------------------- | ---------------------------------------- |
| List is illustrative | "such as A, B, C (not limited to these)" |
| List is exhaustive   | "exactly these: A, B, C"                 |
| Apply broadly        | "every section, not just the first"      |

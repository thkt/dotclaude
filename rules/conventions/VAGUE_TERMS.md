# Vague Terms

Ambiguous terms in software development. Specify before using.

Applies to: test descriptions, Issue/PR bodies, Spec/SOW, code comments, technical docs.

## Define Concretely

Unverifiable as-is. Specify condition and expected outcome.

| Banned term                                 | Problem                    | Replace with                       |
| ------------------------------------------- | -------------------------- | ---------------------------------- |
| correct / normal / abnormal                 | No baseline                | Condition and expected result      |
| usual / ordinary / standard / general       | Whose usual?               | Default value or precondition      |
| expected value / as intended / as specified | Empty reference            | Concrete value or behavior         |
| process (noun/verb)                         | What operation?            | Transform, validate, persist, etc. |
| data / information                          | What data?                 | User name, order list, etc.        |
| without issues                              | What was actually checked? | List verified conditions           |

## State Comparison Baseline

Meaningless without a reference point.

| Banned term          | Problem       | Replace with                       |
| -------------------- | ------------- | ---------------------------------- |
| large / small amount | No threshold  | Concrete number or threshold       |
| large / small (size) | No baseline   | Concrete size or comparison target |
| latest / oldest      | Scope unclear | Scope and sort key                 |

## State Scope Explicitly

Latest models read instructions literally. They do not generalize an instruction from one item to another, nor infer scope you did not state. When authoring a rule, spec, or prompt, make the intended scope explicit.

| Authoring intent      | Write                                      |
| --------------------- | ------------------------------------------ |
| List is illustrative  | "such as A, B, C (not limited to these)"   |
| List is exhaustive    | "exactly these: A, B, C"                   |
| Apply broadly         | "every section, not just the first"        |

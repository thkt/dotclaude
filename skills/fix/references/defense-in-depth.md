# Defense-in-Depth Validation

After fixing a bug, add validation at EVERY layer the failure could recur
through. A single check can be bypassed by different code paths, refactoring, or
mocks.

Single validation: "We fixed the bug." Multiple layers: "We made the bug
impossible."

## The Four Layers

| Layer | Purpose                           | Example                              |
| ----- | --------------------------------- | ------------------------------------ |
| 1     | Entry point: reject invalid input | Throw if required param is empty     |
| 2     | Business logic: data makes sense  | Validate domain invariants hold      |
| 3     | Environment guards: context-safe  | Refuse dangerous ops in test env     |
| 4     | Debug instrumentation: forensics  | Log with stack trace before risky op |

## When to Apply

After confirming root cause, ask: "Can this failure recur via another code
path?" If yes, add validation at each layer the failure could pass through.

## Applying the Pattern

1. Trace the data flow: where does bad value originate? Where is it used?
2. Map all checkpoints: list every point data passes through
3. Add validation at each layer: entry, business, environment, debug
4. Test each layer: try to bypass layer 1, verify layer 2 catches it

Each layer must validate independently. Different code paths bypass different
layers; only full coverage makes the bug structurally impossible.

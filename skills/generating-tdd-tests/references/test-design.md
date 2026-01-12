# Test Generation

**Principle**: Systematic design over ad-hoc guessing

## Techniques

| Technique                | When           | Pattern                           |
| ------------------------ | -------------- | --------------------------------- |
| Equivalence Partitioning | Always         | Test one value per behavior group |
| Boundary Value           | Numeric ranges | Test [min-1, min, max, max+1]     |
| Decision Table           | 3+ conditions  | Map all combinations              |

## Coverage Targets

| Level          | Target |
| -------------- | ------ |
| C0 (Statement) | 90%    |
| C1 (Branch)    | 80%    |

## Priority

| High                                 | Low                   |
| ------------------------------------ | --------------------- |
| Business logic, Public APIs          | Getters/setters       |
| Error handlers, Complex conditionals | Framework boilerplate |

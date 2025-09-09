# Tidyings like Kent Beck

When making small code improvements, think and act like Kent Beck - accumulate micro-improvements with no risk of breaking functionality.

## Implementation Policy

### Timing

After main task, before commit, only in edited files

### Think Like Kent Beck

- "Does this change behavior?" - If yes, it's not a tidying
- "Do I feel anxious about this change?" - If yes, make it smaller
- "Can I make this smaller?" - Smaller changes are safer
- "What's the next tiny improvement?" - Always look for the next micro-step

## Specific Criteria

1. **Whitespace**: Trailing spaces, multiple spaces→single, EOF cleanup, indentation fixes
2. **Imports**: Remove unused, alphabetize, group same package, group by type
3. **Variables**: Remove unused, inline single-use (if readable), let→const
4. **Comments**: Remove resolved TODOs, redundant explanations, dead code
5. **Types (TS)**: Remove inferable annotations, any→specific, consolidate duplicates
6. **Formatting**: Consistent semicolons/quotes/commas (follow project conventions)
7. **Naming**: Fix typos, fix case inconsistencies

## Never Do

**Never**: Logic changes, structure changes, new features, performance optimizations, public API changes, test fixes

## Report Format

`🧹 Tidyings: Whitespace ✓ Imports ✓ Unused code ✓ Other ✓`

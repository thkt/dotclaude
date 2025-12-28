# Context Classification - /code Command

## Purpose

Classify context references into Essential (always load) and Reference (load on demand) to improve S/N ratio and reduce cognitive load.

## Classification

### Essential (Always Load) - ~310 lines

Context that is **always needed** for implementation tasks.

| File | Lines | Purpose |
| --- | --- | --- |
| `skills/generating-tdd-tests/SKILL.md` | 258 | TDD/RGRC implementation cycle |
| `rules/core/ESSENTIAL_PRINCIPLES.md` | ~50 | Quick Decision Questions |
| **Total** | **~310** | |

**Rationale:**

- TDD/RGRC provides the "how to work" structure
- Quick Decision Questions provide "what to consider" checklist
- These are actionable and apply to every implementation task

### Reference (Load on Demand) - ~2,000+ lines

Context loaded only when specific task type requires it.

| Flag | File | Lines | When to Load |
| --- | --- | --- | --- |
| `--frontend` | `skills/applying-frontend-patterns/SKILL.md` | 362 | React/UI component work |
| `--principles` | `skills/applying-code-principles/SKILL.md` | 430 | Design decisions, refactoring |
| `--storybook` | `skills/integrating-storybook/SKILL.md` | 270 | Component Stories generation |
| (auto) | `rules/development/PROGRESSIVE_ENHANCEMENT.md` | 97 | CSS-first approach needed |
| (auto) | `rules/development/READABLE_CODE.md` | 255 | Code clarity concerns |

**Rationale:**

- Full explanations needed only for specific scenarios
- Reduces noise when doing simple implementation
- Available when deeper guidance is needed

## Usage in /code

### Default Mode (Essential only)

```bash
/code "implement user validation"
# Loads: TDD/RGRC + Quick Decision Questions (~310 lines)
```

### With Flags (Essential + Reference)

```bash
/code --frontend "implement LoginForm component"
# Loads: Essential + frontend-patterns (~670 lines)

/code --principles "refactor authentication module"
# Loads: Essential + code-principles (~740 lines)
```

## Measurement

### Before (Current State)

- /code.md: 254 lines
- Skills: 1,320 lines
- Rules: 789 lines
- Submodules: 718 lines
- **Total: 3,081 lines**

### After (Target State)

- /code.md: ~150 lines (simplified)
- Essential: ~310 lines
- Submodules: ~400 lines (trimmed)
- **Total: ~860 lines** (72% reduction)

### With Flags

- +frontend: +362 lines
- +principles: +430 lines
- +storybook: +270 lines

## Maintenance

When adding new principles or patterns:

1. Evaluate if it's needed for **every** implementation task
2. If yes → Add to Essential (keep it minimal)
3. If no → Add to Reference with appropriate flag

## Related Documents

- [ESSENTIAL_PRINCIPLES.md](../rules/core/ESSENTIAL_PRINCIPLES.md) - Quick Decision Questions
- [/code command](../commands/code.md) - Implementation command
- [code-principles SKILL](../skills/applying-code-principles/SKILL.md) - Full principles reference

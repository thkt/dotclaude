---
name: integrating-storybook
description: >
  Storybook integration with spec.md. Auto-generates Stories from Component API.
  Triggers: storybook, stories, component api, props, argTypes, variants,
  csf, csf3, autodocs, frontend component
allowed-tools: Read, Write, Glob, Grep
---

# Storybook Integration

## Purpose

Auto-generate Stories skeletons from Component API specifications in spec.md.

## Core Concepts

| Concept | Description |
| --- | --- |
| Component API | Props, Variants, States defined in spec.md |
| CSF3 | Component Story Format 3 + autodocs |
| Auto-generation | `/code` generates Stories from spec.md |

## Component API Section (in spec.md)

Added automatically when `/think` detects frontend feature.

**Location**: `### 4.x Component API: [ComponentName]` in `## 4. UI Specification`

**Contents**:

- Props Interface (TypeScript)
- Variants (size, color, state)
- States (default, hover, disabled, loading)
- Usage Examples

## Workflow

| Command | Action |
| --- | --- |
| `/think "Add Button"` | Adds Component API section to spec.md |
| `/code` | Generates `Button.stories.tsx` from spec |

## Existing Stories Integration

When Stories file exists:

| Option | Action |
| --- | --- |
| [O] Overwrite | Replace existing file |
| [S] Skip | Keep existing file |
| [M] Merge | Show diff, manual integration |
| [D] Diff only | Append new Stories only |

## Frontend Detection Keywords

Triggers Component API generation:

- component, ui, button, form, modal, dialog, card, list, table

## References

- [@./references/component-api-template.md](./references/component-api-template.md) - Props/Variants template
- [@./references/csf3-patterns.md](./references/csf3-patterns.md) - CSF3 patterns
- [Storybook Docs](https://storybook.js.org/docs/writing-stories)

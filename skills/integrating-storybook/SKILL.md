---
name: integrating-storybook
description: >
  Storybook integration with spec.md. Auto-generates Stories from Component API.
  Triggers: storybook, stories, component api, props, argTypes, variants, csf3.
allowed-tools: [Read, Write, Glob, Grep]
---

# Storybook Integration

## Core Concepts

| Concept         | Description                                |
| --------------- | ------------------------------------------ |
| Component API   | Props, Variants, States defined in spec.md |
| CSF3            | Component Story Format 3 + autodocs        |
| Auto-generation | `/code` generates Stories from spec.md     |

## Component API Location

Add to spec.md when implementing frontend components.

| Content         | Description                      |
| --------------- | -------------------------------- |
| Props Interface | TypeScript interface             |
| Variants        | Style options                    |
| States          | default, hover, active, disabled |
| Usage Examples  | TSX code                         |

## Workflow

| Command               | Action                                   |
| --------------------- | ---------------------------------------- |
| `/think "Add Button"` | Adds Component API section to spec.md    |
| `/code`               | Generates `Button.stories.tsx` from spec |

## Existing Stories Handling

| Option | Action                    |
| ------ | ------------------------- |
| [O]    | Overwrite existing file   |
| [S]    | Skip - keep existing      |
| [M]    | Merge - show diff, manual |
| [D]    | Diff only - append new    |

## References

| Topic         | File                                   |
| ------------- | -------------------------------------- |
| Component API | `references/component-api-template.md` |
| CSF3 Patterns | `references/csf3-patterns.md`          |

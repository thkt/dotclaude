# Component API Template

Spec.md `## 4. UI Specification` section template.

## Structure

| Section       | Content                                           |
| ------------- | ------------------------------------------------- |
| Description   | 1-2 sentence purpose                              |
| Props         | Table: Prop, Type, Required, Default, Description |
| Variants      | List options per variant prop                     |
| States        | Table: State, Description, Visual Change          |
| Usage         | TSX code examples                                 |
| Accessibility | Checklist                                         |

## Props Table Format

| Prop     | Type                     | Required | Default   | Description    |
| -------- | ------------------------ | -------- | --------- | -------------- |
| children | ReactNode                | ✓        | -         | Content        |
| variant  | 'primary' \| 'secondary' | -        | 'primary' | Style          |
| size     | 'sm' \| 'md' \| 'lg'     | -        | 'md'      | Size           |
| disabled | boolean                  | -        | false     | Disabled state |
| onClick  | () => void               | -        | -         | Click handler  |

## States Table Format

| State    | Description     | Visual Change      |
| -------- | --------------- | ------------------ |
| default  | Normal          | Base styling       |
| hover    | Mouse over      | Lighter background |
| active   | Pressing        | Darker background  |
| focus    | Keyboard focus  | Focus ring         |
| disabled | Non-interactive | Reduced opacity    |

## Ordering Rules

| Rule     | Order                             |
| -------- | --------------------------------- |
| Props    | Required first, then alphabetical |
| Props    | `children` always first           |
| Props    | Event handlers last               |
| Examples | Basic first, then complex         |

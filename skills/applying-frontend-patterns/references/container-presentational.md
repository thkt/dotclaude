# Container/Presentational Pattern

## Roles

| Role           | Responsibility                    | Example                        |
| -------------- | --------------------------------- | ------------------------------ |
| Container      | Data, state, logic, layout styles | `useTodos()` → passes to child |
| Presentational | Props-only, UI, decorative styles | Receives `todos` via props     |

## Styles

| Container Styles          | Presentational Styles   |
| ------------------------- | ----------------------- |
| Layout (grid, flex)       | Colors, backgrounds     |
| Spacing (margin, padding) | Borders, shadows        |
| Positioning, sizing       | Typography, transitions |

## Example

```tsx
// Container: data + layout
const TodoContainer = () => {
  const todos = useTodos();
  return (
    <div className="p-4">
      <TodoList todos={todos} />
    </div>
  );
};

// Presentational: props + decorative
const TodoList = ({ todos }) => (
  <ul className="bg-white shadow">
    {todos.map((t) => (
      <li key={t.id}>{t.title}</li>
    ))}
  </ul>
);
```

## Anti-patterns

| Bad                                    | Problem                   |
| -------------------------------------- | ------------------------- |
| Presentational with `useState`/`fetch` | Should receive via props  |
| Container with decorative styles       | Should handle layout only |

## Benefits

| Benefit     | Why                            |
| ----------- | ------------------------------ |
| Testing     | Logic and UI tested separately |
| Reusability | Same UI, different data        |
| Maintenance | Changes isolated               |
| Clarity     | Clear separation               |

## Rules

| Rule                | Guideline                    |
| ------------------- | ---------------------------- |
| Container role      | Connect data to UI           |
| Presentational role | Props-only, no data fetching |
| When uncertain      | Favor Presentational         |

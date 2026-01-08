---
paths: "**/*.{tsx,jsx}"
summary: |
  Separate logic (Container) from presentation (Presentational).
  Containers handle data/state, Presentational components receive props only.
  Maximizes reusability and testability.
decision_question: "Can this component be split into logic and UI?"
---

# Container/Presentational Pattern - Separation of Concerns

**Default approach**: Separate logic from UI for maximum reusability

## Core Philosophy

- **Container**: Logic & data fetching
- **Presentational**: UI & display only
- **Props-only**: Presentational components receive data via props
- **Reusability**: Same UI, different data sources

## Component Roles

### Container Component

- Fetches data (API, stores, hooks)
- Manages state
- Handles business logic
- Controls layout/positioning styles only

### Presentational Component

- Receives data via props
- No direct data fetching
- Handles decorative styles
- Fully reusable

## Directory Structure

```txt
src/
├── containers/
│   └── TodoContainer/
│       ├── index.tsx
│       └── index.stories.tsx
└── components/
    └── TodoList/
        ├── index.tsx
        └── index.stories.tsx
```

## Implementation Example

### Container with Hooks

```tsx
// TodoContainer/index.tsx
import { useTodos } from "@/hooks/useTodos";
import { TodoList } from "@/components/TodoList";

export const TodoContainer = () => {
  const todos = useTodos();

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {" "}
      {/* Layout only */}
      <TodoList todos={todos} />
    </div>
  );
};
```

### Presentational Component Example

```tsx
// TodoList/index.tsx
type TodoListProps = {
  todos: Todo[];
};

export const TodoList = ({ todos }: TodoListProps) => {
  return (
    <ul className="bg-white rounded-lg shadow">
      {" "}
      {/* Decorative styles */}
      {todos.map((todo) => (
        <li key={todo.id} className="p-3 border-b">
          {todo.title}
        </li>
      ))}
    </ul>
  );
};
```

## Style Responsibilities

### Container Styles

- Layout (grid, flexbox)
- Spacing (margin, padding)
- Positioning (absolute, z-index)
- Sizing (width, max-width)

### Presentational Styles

- Colors & backgrounds
- Borders & shadows
- Typography
- Hover/focus states
- Transitions

## Anti-patterns

```tsx
// Bad: Avoid: Presentational fetching data
export const TodoList = () => {
  const [todos, setTodos] = useState([]); // Bad:
  useEffect(() => {
    fetch('/api/todos')... // Bad: Should receive via props
  }, []);
};

// Bad: Avoid: Container with decorative styles
export const TodoContainer = () => {
  return (
    <div className="bg-blue-500 shadow-xl"> {/* ❌ Decorative */}
      <TodoList />
    </div>
  );
};
```

## Benefits

- **Testing**: Logic and UI tested separately
- **Reusability**: Same component, different data sources
- **Maintenance**: Changes isolated to one layer
- **Clarity**: Clear separation of concerns

## Remember

- Containers connect data to UI
- Presentational components are props-only
- Keep Presentational components pure
- When in doubt, favor Presentational

## Related Principles

- [@../rules/development/LAW_OF_DEMETER.md](../rules/development/LAW_OF_DEMETER.md) - Props-only pattern naturally follows Law of Demeter
- [@../rules/development/READABLE_CODE.md](../rules/development/READABLE_CODE.md) - Clear separation improves code understanding
- [@../rules/PRINCIPLE_RELATIONSHIPS.md](../rules/PRINCIPLE_RELATIONSHIPS.md#development-practices)

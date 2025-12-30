---
summary: |
  ロジック（Container）とプレゼンテーション（Presentational）を分離。
  ContainerはデータJavaScript/状態を処理し、PresentationalコンポーネントはpropsのみJavaScript受け取る。
  再利用性とテスト可能性を最大化。
decision_question: "このコンポーネントをロジックとUIに分割できるか？"
---

# Container/Presentationalパターン - 関心の分離

**デフォルトアプローチ**：最大の再利用性のためにロジックをUIから分離

## 核心哲学

- **Container**：ロジックとデータ取得
- **Presentational**：UIと表示のみ
- **Propsのみ**：Presentationalコンポーネントはprops経由でデータを受け取る
- **再利用性**：同じUI、異なるデータソース

## コンポーネントの役割

### Containerコンポーネント

- データを取得（API、stores、hooks）
- 状態を管理
- ビジネスロジックを処理
- レイアウト/位置スタイルのみを制御

### Presentationalコンポーネント

- props経由でデータを受け取る
- 直接のデータ取得なし
- 装飾的スタイルを処理
- 完全に再利用可能

## ディレクトリ構造

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

## 実装例

### Hooksを使用したContainer

```tsx
// TodoContainer/index.tsx
import { useTodos } from '@/hooks/useTodos';
import { TodoList } from '@/components/TodoList';

export const TodoContainer = () => {
  const todos = useTodos();

  return (
    <div className="p-4 max-w-4xl mx-auto"> {/* レイアウトのみ */}
      <TodoList todos={todos} />
    </div>
  );
};
```

### Presentationalコンポーネントの例

```tsx
// TodoList/index.tsx
type TodoListProps = {
  todos: Todo[];
};

export const TodoList = ({ todos }: TodoListProps) => {
  return (
    <ul className="bg-white rounded-lg shadow"> {/* 装飾的スタイル */}
      {todos.map(todo => (
        <li key={todo.id} className="p-3 border-b">
          {todo.title}
        </li>
      ))}
    </ul>
  );
};
```

## スタイルの責任

### Containerスタイル

- レイアウト（grid、flexbox）
- 間隔（margin、padding）
- 位置（absolute、z-index）
- サイズ（width、max-width）

### Presentationalスタイル

- 色と背景
- ボーダーと影
- タイポグラフィ
- ホバー/フォーカス状態
- トランジション

## アンチパターン

```tsx
// Bad: 避ける：Presentationalがデータを取得
export const TodoList = () => {
  const [todos, setTodos] = useState([]); // Bad:
  useEffect(() => {
    fetch('/api/todos')... // Bad: props経由で受け取るべき
  }, []);
};

// Bad: 避ける：装飾的スタイルを持つContainer
export const TodoContainer = () => {
  return (
    <div className="bg-blue-500 shadow-xl"> {/* ❌ 装飾的 */}
      <TodoList />
    </div>
  );
};
```

## 利点

- **テスト**：ロジックとUIを個別にテスト
- **再利用性**：同じコンポーネント、異なるデータソース
- **保守**：変更が1つの層に隔離される
- **明確性**：関心の明確な分離

## 覚えておくこと

- ContainerはデータをUIに接続
- PresentationalコンポーネントはpropsのみJavaScript
- Presentationalコンポーネントを純粋に保つ
- 迷ったら、Presentationalを優先

## 関連する原則

- [@./LAW_OF_DEMETER.md](./LAW_OF_DEMETER.md) - Propsのみパターンは自然にデメテルの法則に従う
- [@./READABLE_CODE.md](./READABLE_CODE.md) - 明確な分離がコード理解を改善

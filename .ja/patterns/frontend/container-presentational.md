---
paths: "**/*.{tsx,jsx}"
summary: |
  ロジック（Container）とプレゼンテーション（Presentational）を分離。
  ContainerはデータState、Presentationalはpropsのみを受け取る。
  再利用性とテスタビリティを最大化。
decision_question: "このコンポーネントはロジックとUIに分割できる？"
---

# Container/Presentationalパターン - 関心の分離

**デフォルトアプローチ**: 再利用性を最大化するためにロジックとUIを分離

## コア哲学

- **Container**: ロジック＆データ取得
- **Presentational**: UI＆表示のみ
- **propsのみ**: Presentationalコンポーネントはprops経由でデータを受け取る
- **再利用性**: 同じUI、異なるデータソース

## コンポーネントの役割

### Containerコンポーネント

- データを取得（API、ストア、フック）
- 状態を管理
- ビジネスロジックを処理
- レイアウト/配置スタイルのみ制御

### Presentationalコンポーネント

- props経由でデータを受け取る
- 直接データ取得なし
- 装飾スタイルを処理
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

### フック付きContainer

```tsx
// TodoContainer/index.tsx
import { useTodos } from "@/hooks/useTodos";
import { TodoList } from "@/components/TodoList";

export const TodoContainer = () => {
  const todos = useTodos();

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {" "}
      {/* レイアウトのみ */}
      <TodoList todos={todos} />
    </div>
  );
};
```

### Presentationalコンポーネント例

```tsx
// TodoList/index.tsx
type TodoListProps = {
  todos: Todo[];
};

export const TodoList = ({ todos }: TodoListProps) => {
  return (
    <ul className="bg-white rounded-lg shadow">
      {" "}
      {/* 装飾スタイル */}
      {todos.map((todo) => (
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
- スペーシング（margin、padding）
- 配置（absolute、z-index）
- サイジング（width、max-width）

### Presentationalスタイル

- 色＆背景
- ボーダー＆シャドウ
- タイポグラフィ
- ホバー/フォーカス状態
- トランジション

## アンチパターン

```tsx
// 悪い例: Presentationalがデータを取得
export const TodoList = () => {
  const [todos, setTodos] = useState([]); // 悪い例:
  useEffect(() => {
    fetch('/api/todos')... // 悪い例: props経由で受け取るべき
  }, []);
};

// 悪い例: Containerに装飾スタイル
export const TodoContainer = () => {
  return (
    <div className="bg-blue-500 shadow-xl"> {/* ❌ 装飾 */}
      <TodoList />
    </div>
  );
};
```

## 利点

- **テスト**: ロジックとUIを別々にテスト
- **再利用性**: 同じコンポーネント、異なるデータソース
- **メンテナンス**: 変更が1つのレイヤーに分離
- **明確さ**: 関心の明確な分離

## 覚えておく

- ContainerはデータとUIを接続
- Presentationalコンポーネントはpropsのみ
- Presentationalコンポーネントをピュアに保つ
- 迷ったらPresentationalを優先

## 関連原則

- [@../../rules/development/LAW_OF_DEMETER.md](../../rules/development/LAW_OF_DEMETER.md) - propsのみパターンはデメテルの法則に従う
- [@../../rules/development/READABLE_CODE.md](../../rules/development/READABLE_CODE.md) - 明確な分離はコード理解を改善
- [@../../rules/PRINCIPLE_RELATIONSHIPS.md](../../rules/PRINCIPLE_RELATIONSHIPS.md#development-practices)

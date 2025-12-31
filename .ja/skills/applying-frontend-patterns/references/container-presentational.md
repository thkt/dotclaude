---
summary: |
  ロジック（Container）とプレゼンテーション（Presentational）を分離。
  Containerはデータ/ステートを処理、Presentationalコンポーネントはpropsのみ受け取る。
  再利用性とテスタビリティを最大化。
decision_question: "このコンポーネントをロジックとUIに分割できるか？"
---

# Container/Presentationalパターン - 関心の分離

**デフォルトアプローチ**: 最大の再利用性のためにロジックをUIから分離

## コア哲学

- **Container**: ロジック & データ取得
- **Presentational**: UI & 表示のみ
- **Props-only**: Presentationalコンポーネントはprops経由でデータを受け取る
- **再利用性**: 同じUI、異なるデータソース

## コンポーネントの役割

### Containerコンポーネント

- データを取得（API、ストア、hooks）
- ステートを管理
- ビジネスロジックを処理
- レイアウト/配置スタイルのみを制御

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

### Presentationalコンポーネント例

```tsx
// TodoList/index.tsx
type TodoListProps = {
  todos: Todo[];
};

export const TodoList = ({ todos }: TodoListProps) => {
  return (
    <ul className="bg-white rounded-lg shadow"> {/* 装飾スタイル */}
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
- スペーシング（margin、padding）
- ポジショニング（absolute、z-index）
- サイジング（width、max-width）

### Presentationalスタイル

- 色 & 背景
- ボーダー & シャドウ
- タイポグラフィ
- ホバー/フォーカス状態
- トランジション

## アンチパターン

```tsx
// Bad: 避ける: Presentationalがデータを取得
export const TodoList = () => {
  const [todos, setTodos] = useState([]); // Bad:
  useEffect(() => {
    fetch('/api/todos')... // Bad: props経由で受け取るべき
  }, []);
};

// Bad: 避ける: Containerに装飾スタイル
export const TodoContainer = () => {
  return (
    <div className="bg-blue-500 shadow-xl"> {/* ❌ 装飾的 */}
      <TodoList />
    </div>
  );
};
```

## メリット

- **テスト**: ロジックとUIを個別にテスト
- **再利用性**: 同じコンポーネント、異なるデータソース
- **メンテナンス**: 変更が1つのレイヤーに分離
- **明確さ**: 明確な関心の分離

## 覚えておくこと

- ContainerはデータをUIに接続
- Presentationalコンポーネントはprops-only
- Presentationalコンポーネントを純粋に保つ
- 迷ったらPresentationalを優先

## 関連原則

- [@~/.claude/rules/development/LAW_OF_DEMETER.md](~/.claude/rules/development/LAW_OF_DEMETER.md) - Props-onlyパターンは自然にデメテルの法則に従う
- [@~/.claude/rules/development/READABLE_CODE.md](~/.claude/rules/development/READABLE_CODE.md) - 明確な分離がコード理解を向上

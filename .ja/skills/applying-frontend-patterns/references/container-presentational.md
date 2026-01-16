# Container/Presentationalパターン

## 役割

| 役割           | 責任                                       | 例                           |
| -------------- | ------------------------------------------ | ---------------------------- |
| Container      | データ、状態、ロジック、レイアウトスタイル | `useTodos()` → 子に渡す      |
| Presentational | Propsのみ、UI、装飾スタイル                | props経由で`todos`を受け取る |

## スタイル

| Containerスタイル       | Presentationalスタイル         |
| ----------------------- | ------------------------------ |
| レイアウト (grid, flex) | 色、背景                       |
| 間隔 (margin, padding)  | ボーダー、シャドウ             |
| 配置、サイジング        | タイポグラフィ、トランジション |

## 例

```tsx
// Container: データ + レイアウト
const TodoContainer = () => {
  const todos = useTodos();
  return (
    <div className="p-4">
      <TodoList todos={todos} />
    </div>
  );
};

// Presentational: props + 装飾
const TodoList = ({ todos }) => (
  <ul className="bg-white shadow">
    {todos.map((t) => (
      <li key={t.id}>{t.title}</li>
    ))}
  </ul>
);
```

## アンチパターン

| Bad                                | 問題                    |
| ---------------------------------- | ----------------------- |
| Presentationalで`useState`/`fetch` | props経由で受け取るべき |
| Containerに装飾スタイル            | レイアウトのみ扱うべき  |

## メリット

| メリット     | 理由                       |
| ------------ | -------------------------- |
| テスト       | ロジックとUIを別々にテスト |
| 再利用性     | 同じUI、異なるデータ       |
| メンテナンス | 変更が分離される           |
| 明確さ       | 関心の明確な分離           |

## ルール

| ルール               | ガイドライン                  |
| -------------------- | ----------------------------- |
| Containerの役割      | データとUIを接続              |
| Presentationalの役割 | propsのみ、データフェッチなし |
| 迷った場合           | Presentationalを優先          |

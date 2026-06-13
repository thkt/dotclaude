# React パフォーマンス最適化

## メモ化の判断

| Hook          | 利用場面                              | オーバーヘッド   |
| ------------- | ------------------------------------- | ---------------- |
| `React.memo`  | 重いコンポーネント、同じ props が頻繁 | 浅い比較         |
| `useMemo`     | 重い計算                              | 依存関係チェック |
| `useCallback` | メモ化された子に渡す関数              | 依存関係チェック |

## メモ化すべき条件

| 基準               | メモ化する                     | しない                      |
| ------------------ | ------------------------------ | --------------------------- |
| 計算コスト         | 重い sort/filter               | `count * 2`                 |
| 再レンダリング頻度 | 同じ props で頻繁              | まれ                        |
| 子コンポーネント   | メモ化された子が関数を受け取る | 子なし / メモ化されていない |

## パターン

### React.memo

```tsx
const ExpensiveList = React.memo(({ data }: { data: Data[] }) => {
  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});
```

### useMemo

```tsx
const sortedItems = useMemo(() => items.sort((a, b) => b.price - a.price), [items]);
```

### useCallback

```tsx
const handleClick = useCallback(() => {
  console.log("Clicked");
}, []);
```

## リスト仮想化

| リストサイズ  | 解決策                     |
| ------------- | -------------------------- |
| <100 アイテム | 通常レンダリング           |
| 100-1000      | 仮想化を検討               |
| >1000         | react-window/react-virtual |

## state 最適化

| 問題                                    | 解決策                        |
| --------------------------------------- | ----------------------------- |
| グローバル state が全体を再レンダリング | ドメイン単位で state を分割   |
| オブジェクト state の部分更新           | プリミティブに分離            |
| Context が consumer を再レンダリング    | 更新頻度ごとに context を分割 |

## 共通の落とし穴

| 落とし穴                      | 修正                         |
| ----------------------------- | ---------------------------- |
| 空の deps で state にアクセス | state を依存関係に追加       |
| 過剰なメモ化                  | まず計測                     |
| 依存関係の漏れ                | exhaustive-deps ルールを使用 |

## プロファイリング

1. React DevTools → Profiler タブ
2. 記録 → 操作実行 → 停止
3. flame graph で不要な再レンダリングを確認

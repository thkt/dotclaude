# 制御フローと複雑さ

## ネストルール

| テクニック   | Before (Bad)                           | After (Good)                          |
| ------------ | -------------------------------------- | ------------------------------------- |
| ガード句     | `if (a) { if (b) { if (c) { ... } } }` | `if (!a) return; if (!b) return; ...` |
| 早期リターン | 最深レベルに結果のあるネストif-else    | 連続的なif-return                     |
| ロジック抽出 | `if (a && b && !c && d === 'X') { }`   | `if (canAccessContent(user)) { }`     |

## コード例

### ガード句

```typescript
// Bad (4レベル)
function process(order) {
  if (order) {
    if (order.isValid) {
      if (order.user) {
        if (order.user.hasPermission) {
          /*...*/
        }
      }
    }
  }
}

// Good (1レベル)
function process(order) {
  if (!order) return;
  if (!order.isValid) return;
  if (!order.user?.hasPermission) return;
  // 注文を処理
}
```

### 条件分岐よりデータ構造

```typescript
// Bad (7分岐)
function getStatus(code) {
  if (code === "A") return "Active";
  if (code === "P") return "Pending";
  // ... 5 more
}

// Good (ルックアップ)
const STATUS_MAP = { A: "Active", P: "Pending" /*...*/ };
const getStatus = (code) => STATUS_MAP[code] || "Unknown";
```

## チェックリスト

| チェック   | 制限 | 超過時のアクション       |
| ---------- | ---- | ------------------------ |
| パラメータ | ≤ 5  | パラメータオブジェクト化 |
| ネスト     | ≤ 3  | ガード句を使用           |
| 分岐       | ≤ 5  | データ構造/マップを使用  |
| 長さ       | ≤ 15 | 小さな関数に分割         |
| 条件       | -    | 名前付き関数に抽出       |
| フロー     | -    | 巧妙なトリックなし       |

# 制御フローと複雑さ

## ネストルール

| テクニック   | Before (Bad)                           | After (Good)                          |
| ------------ | -------------------------------------- | ------------------------------------- |
| ガード句     | `if (a) { if (b) { if (c) { ... } } }` | `if (!a) return; if (!b) return; ...` |
| 早期リターン | 最深レベルに結果のあるネストif-else    | 連続的なif-return                     |
| ロジック抽出 | `if (a && b && !c && d === 'X') { }`   | `if (canAccessContent(user)) { }`     |

## ミラーの法則の制限

| 対象           | 理想 | 最大 | 超過時のアクション       |
| -------------- | ---- | ---- | ------------------------ |
| 関数パラメータ | 3    | 5    | パラメータオブジェクト化 |
| ネストの深さ   | 2    | 3    | ガード句を使用           |
| 条件分岐       | 3    | 5    | データ構造/マップを使用  |
| 関数の行数     | 5-15 | 20   | 小さな関数に分割         |

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

| チェック   | 合格基準                 |
| ---------- | ------------------------ |
| パラメータ | 関数あたり ≤ 5           |
| ネスト     | 深さ ≤ 3レベル           |
| 分岐       | 関数あたり ≤ 5           |
| 長さ       | ≤ 15行                   |
| 複雑な条件 | 名前付き関数に抽出       |
| 制御フロー | 明確、巧妙なトリックなし |

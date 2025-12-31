# 品質ゲートとチェック

このモジュールは実装中の品質検証を処理します。

## 動的品質チェック

### 自動検出

```bash
!`cat package.json 2>/dev/null || echo "(no package.json found)"`
```

### 並列実行

品質チェックを同時に実行:

```typescript
// 順次ではなく並列で実行
const qualityChecks = [
  Bash({ command: "npm run lint" }),
  Bash({ command: "npm run type-check" }),
  Bash({ command: "npm test -- --findRelatedTests" }),
  Bash({ command: "npm run format:check" })
];
```

## 品質チェック結果

### リント (信頼度: 0.95)

```bash
npm run lint | tail -5
```

- ステータス: PASS
- 問題: 0エラー、2警告
- 時間: 1.2秒

### 型チェック (信頼度: 0.98)

```bash
npm run type-check | tail -5
```

- ステータス: PASS - 全型有効
- チェック済みファイル: 47
- 時間: 3.4秒

### テスト (信頼度: 0.92)

```bash
npm test -- --passWithNoTests | grep -E "Tests:|Snapshots:"
```

- ステータス: PASS - 45/45 合格
- カバレッジ: 82%
- 時間: 8.7秒

### フォーマットチェック (信頼度: 0.90)

```bash
npm run format:check | tail -3
```

- ステータス: WARN - 3ファイルにフォーマットが必要
- 自動修正可能: はい
- 時間: 0.8秒

## 品質スコア計算

```text
総合品質スコア: (L*0.3 + T*0.3 + Test*0.3 + F*0.1) = 0.93
信頼度レベル: HIGH - コミット準備完了
```

## 品質チェック進捗表示

```markdown
品質チェック実行中:
├─ テスト      [████████████] PASS 45/45 合格
├─ カバレッジ   [████████░░░░] WARN 78% (目標: 80%)
├─ リント      [████████████] PASS 0エラー、2警告
├─ 型チェック  [████████████] PASS 全型有効
└─ フォーマット [████████████] PASS フォーマット済み

品質スコア: 92% | 信頼度: HIGH
```

## リスク軽減

### 一般的な実装リスク

| リスク | 確率 | 影響 | 軽減策 | 信頼度 |
| --- | --- | --- | --- | --- |
| 既存テストの破壊 | 中 | 高 | 前後で全スイート実行 | 0.95 |
| パフォーマンス退行 | 低 | 高 | クリティカルパスのプロファイル | 0.88 |
| セキュリティ脆弱性 | 低 | 致命的 | セキュリティスキャン + レビュー | 0.92 |
| 一貫性のないパターン | 中 | 中 | 既存例に従う | 0.90 |
| エッジケースの欠落 | 高 | 中 | 包括的なテストケース | 0.85 |

## 高度な品質機能

### リアルタイムテスト監視

```bash
npm test -- --watch --coverage
```

### コード複雑度分析

```bash
npx complexity-report src/ | grep -E "Complexity|Maintainability"
```

### パフォーマンスプロファイリング

```bash
npm run profile
```

### セキュリティスキャン

```bash
npm audit --production | grep -E "found|Severity"
```

## 品質ゲート失敗

```markdown
## 品質ゲート失敗
### 問題: カバレッジが80%を下回った

現在: 78% (mainから-2%)
未カバー行: src/auth/validator.ts:45-52

アクション:
1. [TODO] 未カバー行のテストを追加
2. [PENDING] またはテスト不可の理由をドキュメント化
3. [PENDING] または閾値を調整（非推奨）

解決せずに続行しますか？ (y/N)
```

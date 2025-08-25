---
name: test
description: 包括的なテストと検証でコード品質を保証
priority: high
suitable_for:
  scale: [small, medium, large]
  type: [test]
  understanding: "≥ 70%"
  urgency: [low, medium]
aliases: []
timeout: 120
allowed-tools: Bash(npm test:*), Bash(npm run), Bash(npm run:*), Bash(yarn test:*), Bash(yarn run), Bash(yarn run:*), Bash(pnpm test:*), Bash(pnpm run), Bash(pnpm run:*), Bash(bun test:*), Bash(bun run), Bash(bun run:*), Bash(npx:*), Bash(jest:*), Bash(vitest:*), Bash(ls:*), Bash(cat:*), Bash(find:*), Read, Glob, Grep, LS, Task
context:
  files_changed: "dynamic"
  lines_changed: "dynamic"
  test_coverage: "measured"
  test_results: "analyzed"
---

# /test - 高度なテストと検証

## 目的

動的発見、階層分析、カバレッジメトリクスを備えた包括的なテストによりコード品質を保証します。

## 動的テスト発見

### 利用可能なテストスクリプト

```bash
!`npm run || yarn run || pnpm run || bun run`
```

### パッケージマネージャー検出

```bash
!`find . -maxdepth 1 -name "*.lock*" -o -name "package*.json" | head -5`
```

### テストフレームワーク検出

```bash
!`cat package.json`
```

### テストファイル数

```bash
!`find . -name "*test*" -o -name "*spec*"`
```

## 階層的テストプロセス

### フェーズ1: 環境分析

Taskエージェントを使用して：

1. テストインフラとフレームワークを検出
2. テストファイルパターンと場所を特定
3. 利用可能なテストコマンドとスクリプトを発見
4. カバレッジ設定を確認

### フェーズ2: 並列テスト実行

可能な場合はテストスイートを同時実行：

- **ユニットテスト**: コンポーネントロジックの最速フィードバック
- **統合テスト**: APIとサービスの相互作用
- **E2Eテスト**: 重要なユーザーパス（設定されている場合）
- **品質チェック**: リント、型チェック、フォーマット

### フェーズ3: 結果分析とメトリクス

信頼度スコアリングで結果を分析：

1. **失敗分析**: 根本原因の特定
2. **カバレッジメトリクス**: ライン、ブランチ、関数カバレッジ
3. **パフォーマンスデータ**: テスト実行時間
4. **不安定テスト検出**: 断続的な失敗

## テスト実行戦略

### クイックテスト（1-2分）

変更されたファイルのみに焦点：

```bash
!`npm run test || yarn test || pnpm test || bun test || echo "テストスクリプトが見つかりません"`
```

コマンド: `/test --quick`

### 標準テスト（3-5分）

メインテストスイートを実行：

```bash
!`npm run test || yarn test || pnpm test || bun test || echo "テストスクリプトが見つかりません"`
```

コマンド: `/test` (デフォルト)

### 包括的テスト（5-10分）

カバレッジ付きフルテストスイート：

```bash
!`npm test -- --coverage --verbose 2>&1 || yarn test --coverage --verbose 2>&1 || pnpm test --coverage --verbose 2>&1 || bun test --coverage 2>&1 || echo "カバレッジテストは利用できません"`
```

コマンド: `/test --full`

### ウォッチモード

開発イテレーション用：

```bash
!`npm test -- --watch || yarn test --watch || pnpm test --watch || bun test --watch`
```

コマンド: `/test --watch`

## カバレッジメトリクス

### 現在のカバレッジ

```bash
!`cat coverage/coverage-summary.json | grep -E "lines|statements|functions|branches" || echo "カバレッジデータがありません"`
```

### カバレッジトレンド

カバレッジの変化を追跡：

- mainブランチとの比較
- カバレッジ軌跡の監視
- 未カバーの重要パスの特定

### カバレッジ閾値

```json
{
  "lines": 80,
  "functions": 80,
  "branches": 75,
  "statements": 80
}
```

## テスト結果分析

### 失敗の分類

```markdown
## テスト結果サマリー
- 総テスト数: [数]
- ✅ 成功: [数] ([パーセンテージ]%)
- ❌ 失敗: [数]
- ⏭️ スキップ: [数]
- ⏱️ 所要時間: [時間]

## 失敗テスト分析
### カテゴリ: [ユニット|統合|E2E]
#### テスト: [テスト名]
- **ファイル**: path/to/test.js:42
- **失敗タイプ**: [アサーション|タイムアウト|エラー]
- **根本原因**: [分析]
- **信頼度**: 0.95
- **修正提案**: [具体的な解決策]

## カバレッジレポート
- 📊 ラインカバレッジ: [パーセンテージ]% (mainから ↑/↓)
- 🌿 ブランチカバレッジ: [パーセンテージ]%
- 🔧 関数カバレッジ: [パーセンテージ]%
- 📝 ステートメントカバレッジ: [パーセンテージ]%

## 未カバーの重要パス
[重要な未テストコードのリスト]

## パフォーマンスメトリクス
- 最も遅いテスト: [上位5つと時間]
- 不安定なテスト: [断続的な失敗]
- テスト効率: [毎秒のテスト数]
```

## 品質チェック統合

### リント

```bash
!`npm run lint || yarn run lint || pnpm run lint || bun run lint || echo "リンターが設定されていません"`
```

### 型チェック

```bash
!`npm run type-check || yarn run type-check || pnpm run type-check || bun run type-check || npx tsc --noEmit || echo "型チェックは利用できません"`
```

### フォーマットチェック

```bash
!`npm run format:check || yarn run format:check || pnpm run format:check || bun run format:check || echo "フォーマッターが設定されていません"`
```

## UI変更のブラウザテスト

UIコンポーネントが変更された場合：

1. Playwright MCPツールでビジュアルテスト
2. レスポンシブデザインのブレークポイントを検証
3. アクセシビリティコンプライアンスをチェック
4. クロスブラウザ互換性をテスト

## TodoWrite統合

自動タスク追跡：

```markdown
# テスト: [ターゲット説明]
1. ⏳ テストインフラを発見（1分）
2. ⏳ ユニットテストを実行（並列）
3. ⏳ 統合テストを実行（存在する場合）
4. ⏳ 失敗と根本原因を分析
5. ⏳ カバレッジレポートを生成
6. ⏳ 品質チェックを実行（リント、型チェック）
7. ⏳ 結果と推奨事項をまとめる
```

## 高度な機能

### テスト影響分析

変更に基づいて実行するテストを決定：

```bash
!`npm run test || yarn test || pnpm test || bun test || echo "テストがありません"`
```

### ミューテーションテスト

重要なコードパス用（設定されている場合）：

```bash
!`npm run test:mutation || yarn run test:mutation || pnpm run test:mutation || bun run test:mutation || echo "ミューテーションテストが設定されていません"`
```

### パフォーマンス回帰テスト

テストスイートのパフォーマンスを経時的に追跡：

- 遅いテストを特定
- メモリ使用量を監視
- パフォーマンス回帰を検出

### テスト信頼性スコアリング

- 不安定なテストの頻度を追跡
- テスト信頼度スコアを計算
- テストメンテナンスを優先順位付け

## 失敗回復戦略

### 即座のアクション

1. **失敗を分離**: 単一テストを分離して実行
2. **デバッグモード**: 詳細出力で実行
3. **依存関係チェック**: テスト環境を検証
4. **変更をレビュー**: 最後の成功状態と比較

### 根本原因分析

- スタックトレース分析
- アサーション失敗パターン
- 環境依存関係
- タイミング/競合状態

## CI/CD統合

### Pre-commitフック

```bash
npm test -- --bail --findRelatedTests
```

### PR検証

```yaml
- name: テストスイート
  run: npm test -- --coverage --ci
```

### デプロイメントゲート

```bash
npm test -- --coverage --threshold 80
```

## 使用例

### 基本テスト

```bash
/test
# カバレッジ付き標準テストスイートを実行
```

### クイックフィードバック

```bash
/test --quick
# 変更されたファイルのみをテスト
```

### PR前検証

```bash
/test --full
# PR前の包括的テスト
```

### 特定のテストスイート

```bash
/test "認証テスト"
# パターンに一致するテストを実行
```

### カバレッジ目標付き

```bash
/test --coverage 90
# 90%のカバレッジ閾値を確保
```

## ベストプラクティス

1. **テストファースト**: コミット前にテストを実行
2. **即座に修正**: テスト負債を蓄積しない
3. **トレンド監視**: 時間経過でカバレッジを追跡
4. **スイート最適化**: 冗長なテストを削除
5. **失敗を文書化**: 失敗パターンログを保持
6. **並列化**: 独立したテストを同時実行

## 除外ルール

### 自動スキップパターン

1. **生成ファイル**: dist/, build/, coverage/
2. **依存関係**: node_modules/, vendor/
3. **ドキュメント**: *.mdファイル（docsテストが存在しない限り）
4. **設定ファイル**: 設定を特別にテストしない限り
5. **モックデータ**: テストフィクスチャとスタブ

### コンテキスト認識スキップ

- 不要な時はCIでE2Eをスキップ
- ウォッチモードで遅いテストをスキップ
- クイックモードで統合テストをスキップ

## 次のステップ

- **失敗したテスト** → 特定のテストコンテキストで `/fix`
- **低カバレッジ** → 重要パスのテストを追加
- **パフォーマンス問題** → 遅いテストを最適化
- **不安定なテスト** → 調査して安定化
- **すべて成功** → PR/デプロイメント準備完了

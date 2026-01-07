---
description: SOW受け入れ基準に対して実装を検証
allowed-tools: Read, Glob, Grep
model: inherit
dependencies: [sow-spec-reviewer]
---

# /validate - SOW基準チェッカー

## 目的

完了した作業に対する手動検証のためにSOW受け入れ基準を表示。

**簡素化**: 手動チェックリストレビューツール。

## 機能

### 受け入れ基準の表示

1. Globを使用して最新のSOWを検索:

   ```text
   Globパターン: ~/.claude/workspace/planning/**/sow.md
   ```

2. 最新ファイルにReadツールを使用

3. 「Acceptance Criteria」セクションを抽出して表示

### 手動レビュープロセス

1. SOW基準を表示
2. 各項目を手動でレビュー
3. 実装と照合
4. 発見を記録

## 出力フォーマット

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 SOW検証チェックリスト

機能: ユーザー認証
作成: 2025-01-14

## 受け入れ基準:

□ AC-01: メールでのユーザー登録
→ 確認: 登録フォームが存在する？
→ 確認: メールバリデーションが実装されている？

□ AC-02: パスワード要件の強制
→ 確認: 最小8文字？
→ 確認: 特殊文字が必要？

□ AC-03: OAuth統合
→ 確認: Google OAuthが動作する？
→ 確認: GitHub OAuthが動作する？

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

手動レビューが必要:

- 各機能をテスト
- 基準と照合
- ギャップを記録
```

## 使用例

### 最新のSOWを検証

```bash
/validate
```

最新のSOWから受け入れ基準を表示。

### 特定のSOWを検証

```bash
/validate "feature-name"
```

特定機能の基準を表示。

## 手動検証プロセス

### ステップ1: 基準をレビュー

```markdown
- 各受け入れ基準を読む
- 要件を理解
- 曖昧さを記録
```

### ステップ2: 実装をテスト

```markdown
- アプリケーションを実行
- 各機能をテスト
- 動作を記録
```

### ステップ3: 結果を比較

```markdown
- 動作と基準を照合
- ギャップを特定
- 必要な改善を記録
```

## ワークフローとの統合

```markdown
1. 実装を完了
2. /validateで基準を確認
3. 各項目を手動テスト
4. 結果でドキュメントを更新
```

## 簡素化されたアプローチ

- **自動化なし**: 人間の判断が必要
- **明確なチェックリスト**: 追従しやすい
- **手動プロセス**: 徹底的な検証

## 関連コマンド

- `/think` - 基準付きのSOWを作成
- `/sow` - 完全なSOWドキュメントを表示
- `/test` - 自動テストを実行

## IDR更新 & SOW AC照合

検証完了後、IDRを検証結果で更新し、SOW受け入れ基準と照合します。

### IDR要件チェック

IDRを更新する前に、必要かどうかを確認:

1. **spec.md** の `idr_required` フィールドを確認（セクション11）
2. **`idr_required: false`** → IDR更新をスキップ（ただしACステータスは表示）
3. **`idr_required: true` またはspecなし** → IDRを更新

### IDR検出

詳細ロジック: [@../../references/commands/shared/idr-generation.md](../../references/commands/shared/idr-generation.md)

既存のIDRを検索:

1. `~/.claude/workspace/planning/**/idr.md`（SOW関連）
2. `~/.claude/workspace/idr/**/idr.md`（スタンドアロン）

### SOW AC ↔ IDR照合

1. **SOW受け入れ基準セクションを読み込み**
2. **IDR実装記録を読み込み**
3. **各ACについて**:
   - IDRに実装エビデンスが存在するか確認
   - PASS/FAILステータスを判定
4. **検証レポートを生成**
5. **IDRの/validateセクションに追加**

### IDRセクション追加

IDRに`/validate`セクションを追加:

```markdown
## /validate - [YYYY-MM-DD HH:MM]

### SOW受け入れ基準検証

| AC ID  | Description | Status | Evidence   |
| ------ | ----------- | ------ | ---------- |
| AC-001 | [概要]      | PASS   | [検証内容] |
| AC-002 | [概要]      | FAIL   | [検証内容] |

### 特定されたギャップ

- [SOWとのギャップ]

### サインオフ

- Validator: AI
- Confidence: [C: 0.XX]
```

### SOW更新

SOWのImplementation Recordsセクションを検証ステータスで更新します。

## 適用した原則

### オッカムの剃刀

- シンプルなチェックリスト表示
- 複雑な検証ロジックなし
- 人間の判断を尊重

### 単一責任

- 基準の表示のみ
- 検証は手動で実施

### プログレッシブエンハンスメント

- 手動プロセスから開始
- 必要に応じて後から自動化

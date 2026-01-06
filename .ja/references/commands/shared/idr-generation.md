# IDR生成ロジック

IDR（Implementation Decision Record）の共通生成・更新ロジック。

## IDR検出

### SOW関連IDR検出

```markdown
1. 最新のSOWを検索:
   Globパターン: ~/.claude/workspace/planning/\*\*/sow.md
   ソート: 更新日時（新しい順）

2. SOWが見つかった場合:
   - IDRパス: [SOWディレクトリ]/idr.md
   - idr.mdの存在確認

3. 戻り値: { sowPath, idrPath, exists }
```

### スタンドアロンIDR検出

```markdown
1. SOWが見つからない場合:
   - 機能名の入力を促すか、コンテキストから推測
   - IDRパス: ~/.claude/workspace/idr/[feature-name]/idr.md

2. ディレクトリが存在しない場合は作成

3. 戻り値: { sowPath: null, idrPath, exists }
```

## IDR生成 (/code)

### 新規IDR作成

```markdown
1. 現在のタイムスタンプを取得: YYYY-MM-DD HH:MM

2. メタデータセクション生成:
   - 機能名（SOWまたはコンテキストから）
   - SOWリンク（存在する場合）
   - 作成日時/更新日時

3. /codeセクション生成:
   - Changed Files: git diffまたはツール結果から抽出
   - Implementation Decisions: 実装中に行った主要な判断
   - Attention Points: 落とし穴、エッジケース、レビュー時の注意点
   - Applied Principles: TDD、オッカムの剃刀、SOLIDなど
   - 信頼度スコア

4. idr.mdにテンプレートを使用して書き込み:
   [@../../../../templates/idr/implementation.md](~/.claude/templates/idr/implementation.md)
```

### 変更ファイル検出

```bash
# gitリポジトリの場合
git diff --name-status HEAD

# 出力の解析:
# A = Added (Created)
# M = Modified
# D = Deleted
```

## IDR更新 (/audit, /polish, /validate)

### セクション追加ロジック

```markdown
1. 既存のidr.mdを読み込み

2. タイムスタンプ付きの新規セクションを生成:

   ## /[command] - [YYYY-MM-DD HH:MM]

3. ファイル末尾にセクションを追加

4. メタデータの「Last Updated」を更新
```

### /auditセクション

```markdown
## /audit - [timestamp]

### レビュー概要

[エージェントレビュー結果の概要]

### 問題点と対応

[発見された問題と対応内容]

### 適用した推奨事項

[適用した推奨事項]
```

### /polishセクション

```markdown
## /polish - [timestamp]

### 削除内容

[削除した項目: コメント、コード、ヘルパー]

### 簡素化内容

[簡素化した内容]
```

### /validateセクション

```markdown
## /validate - [timestamp]

### SOW受け入れ基準検証

[SOWからのAC検証結果]

### 特定されたギャップ

[SOWと実装のギャップ]

### サインオフ

[検証の信頼度]
```

## SOW統合

### IDR → SOWリンク

IDRメタデータ内:

```markdown
| SOW | ./sow.md |
```

### SOW → IDRリンク

SOWのImplementation Recordsセクションを更新:

```markdown
## Implementation Records

IDR: `./idr.md`
Status: [x] In Progress

| Phase     | Date       | Confidence |
| --------- | ---------- | ---------- |
| /code     | 2026-01-06 | [C: 0.90]  |
| /audit    | 2026-01-06 | [C: 0.85]  |
| /polish   | -          | -          |
| /validate | -          | -          |
```

## 検証ロジック (/validate)

### SOW AC ↔ IDR照合

```markdown
1. SOW受け入れ基準セクションを読み込み
2. IDR実装記録を読み込み
3. 各ACについて:
   - IDRに実装エビデンスが存在するか確認
   - PASS/FAILステータスを判定
4. 検証レポートを生成
5. IDRの/validateセクションに追加
```

## エラーハンドリング

| シナリオ          | 対応                                            |
| ----------------- | ----------------------------------------------- |
| SOWが見つからない | workspace/idr/にスタンドアロンIDRを作成         |
| IDRが見つからない | 新規IDRを作成（/code用）または スキップ（他用） |
| SOW更新失敗       | 警告をログ、SOWリンクなしで続行                 |
| Gitが利用不可     | 変更ファイル検出をスキップ、手動入力を使用      |

## 関連ファイル

- テンプレート: `~/.claude/templates/idr/implementation.md`
- SOWテンプレート: `~/.claude/templates/sow/workflow-improvement.md`
- ワークスペース: `~/.claude/workspace/planning/` または `~/.claude/workspace/idr/`

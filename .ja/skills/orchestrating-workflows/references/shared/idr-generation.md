# IDR (Implementation Decision Record) 生成

実装コマンド用の共通IDR生成・更新ロジック。

## IDR概要

IDRは開発ライフサイクル全体を通じて実装決定を追跡。

| コマンド    | IDRアクション      |
| ----------- | ------------------ |
| `/code`     | 決定付きで作成     |
| `/audit`    | レビュー結果を追記 |
| `/polish`   | 簡素化を追記       |
| `/validate` | SOW ACと照合       |

**場所**: `~/.claude/workspace/planning/[feature]/idr.md`

## IDR検出

### SOW関連検出

```text
1. 検索: ~/.claude/workspace/planning/**/sow.md
   ソート: 変更時刻順（最新から）

2. SOW見つかった場合:
   IDRパス: [SOWディレクトリ]/idr.md

3. 戻り値: { sowPath, idrPath, exists }
```

### スタンドアロン検出

```text
1. SOWなしの場合:
   機能名をプロンプトまたはコンテキストから推論
   IDRパス: ~/.claude/workspace/idr/[feature-name]/idr.md

2. ディレクトリがなければ作成
```

## IDR生成 (/code)

### 新規IDR構造

```markdown
# IDR: [機能名]

| メタデータ | 値               |
| ---------- | ---------------- |
| 作成       | YYYY-MM-DD HH:MM |
| 更新       | YYYY-MM-DD HH:MM |
| SOW        | ./sow.md         |

## /code - [タイムスタンプ]

### 変更ファイル

| 状態 | ファイル        |
| ---- | --------------- |
| 作成 | src/new-file.ts |
| 変更 | src/existing.ts |

### 実装決定

[実装中に行った主要な選択]

### 注意点

[落とし穴、エッジケース、レビューノート]

### 適用した原則

- TDD/RGRCサイクル
- オッカムの剃刀
- [その他の原則]

### 信頼度

[C: 0.XX] - [理由]
```

### 変更ファイル検出

```bash
# gitから
git diff --name-status HEAD

# パース:
# A = Added (作成)
# M = Modified (変更)
# D = Deleted (削除)
```

## IDR更新 (/audit, /polish, /validate)

### セクション追加ロジック

```text
1. 既存のidr.mdを読み込み
2. タイムスタンプ付き新セクションを生成
3. ファイル末尾に追記
4. メタデータの「更新」を更新
```

### /audit セクション

```markdown
## /audit - [タイムスタンプ]

### レビューサマリー

[エージェントレビュー結果]

### 問題と対応

[発見した問題と対応]

### 適用した推奨事項

[適用した推奨事項]
```

### /polish セクション

```markdown
## /polish - [タイムスタンプ]

### 削除

[削除項目: コメント、コード、ヘルパー]

### 簡素化

[行った簡素化]
```

### /validate セクション

```markdown
## /validate - [タイムスタンプ]

### SOW受け入れ基準検証

[AC検証結果]

### 特定されたギャップ

[SOWと実装のギャップ]

### サインオフ

[検証信頼度]
```

## SOW統合

### 双方向リンク

**IDR → SOW** (IDRメタデータ内):

```markdown
| SOW | ./sow.md |
```

**SOW → IDR** (SOW Implementation Records内):

```markdown
## Implementation Records

IDR: `./idr.md`
Status: [x] In Progress

| フェーズ | 日付       | 信頼度    |
| -------- | ---------- | --------- |
| /code    | 2026-01-06 | [C: 0.90] |
| /audit   | 2026-01-06 | [C: 0.85] |
```

## 検証ロジック (/validate)

### SOW AC ↔ IDR 照合

```text
1. SOW受け入れ基準セクションを読み込み
2. IDR実装記録を読み込み
3. 各ACについて:
   - 実装エビデンスが存在するか確認
   - PASS/FAILステータスを判定
4. 検証レポートを生成
5. IDRの /validate セクションに追記
```

## エラーハンドリング

| シナリオ          | アクション                                |
| ----------------- | ----------------------------------------- |
| SOWが見つからない | workspace/idr/ にスタンドアロンIDRを作成  |
| IDRが見つからない | 作成（/code用）またはスキップ（その他用） |
| SOW更新に失敗     | 警告をログ、SOWリンクなしで続行           |
| Gitが利用不可     | 変更ファイルをスキップ、手動入力を使用    |

## 関連ファイル

- テンプレート: `~/.claude/templates/idr/implementation.md`
- SOWテンプレート: `~/.claude/templates/sow/workflow-improvement.md`
- ワークスペース: `~/.claude/workspace/planning/`

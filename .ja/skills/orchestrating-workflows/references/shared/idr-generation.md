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

テンプレート: [@../../../../templates/idr/template.md](../../../../templates/idr/template.md)

作成セクション: 変更ファイル、主要な判断、備考、レビュアー向け注意点

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
## /audit - YYYY-MM-DD HH:MM

### サマリー

| 重要度   | 件数 | 解決済み |
| -------- | ---- | -------- |
| Critical | 0    | 0        |
| High     | 0    | 0        |

### 課題

| #   | 課題   | 重要度 | 場所        | 対応      |
| --- | ------ | ------ | ----------- | --------- |
| 1   | [課題] | High   | [file:line] | 修正/延期 |

### 備考

[発見事項、観察されたパターン、将来への推奨事項]
```

### /polish セクション

```markdown
## /polish - YYYY-MM-DD HH:MM

### 削除

| 項目   | タイプ          | 理由   |
| ------ | --------------- | ------ |
| [項目] | コメント/コード | [理由] |

### 簡素化

[行った簡素化の説明]
```

### /validate セクション

```markdown
## /validate - YYYY-MM-DD HH:MM

### 受け入れ基準

| AC     | ステータス | 根拠       |
| ------ | ---------- | ---------- |
| AC-001 | PASS/FAIL  | [検証内容] |

### ギャップ

[SOWと実装のギャップ]

### サインオフ

[最終メモ、残る懸念、完了確認]
```

## SOW統合

### 双方向リンク

**IDR → SOW** (IDRメタデータ内):

```markdown
SOW: ./sow.md
```

**SOW → IDR** (SOW Implementation Records内):

```markdown
## Implementation Records

IDR: `./idr.md`
Status: [x] In Progress
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

- テンプレート: `~/.claude/templates/idr/template.md`
- SOWテンプレート: `~/.claude/templates/sow/template.md`
- ワークスペース: `~/.claude/workspace/planning/`

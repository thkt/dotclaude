---
description: ADRからプロジェクトルールを生成しCLAUDE.mdに統合
allowed-tools: Read, Write, Edit, Bash(ls:*), Grep, Glob
model: inherit
argument-hint: "[ADR番号]"
dependencies: [creating-adrs]
---

# /rulify - ADRからルール生成

## 目的

ADR（Architecture Decision Record）をAI実行可能なルール形式に変換。
プロジェクトの`.claude/CLAUDE.md`に自動統合。

## 使用方法

```bash
/rulify <ADR-number>
```

例: `/rulify 1`、`/rulify 0001`、`/rulify 12`

## 実行フロー

### 1. ADRファイルを検索

```bash
# ゼロパディングして検索
ADR_NUM=$(printf "%04d" $1)
ADR_FILE=$(ls adr/${ADR_NUM}-*.md 2>/dev/null | head -1)
```

### 2. ADR内容を解析

ADRから抽出:

- **タイトル** → ルール名（UPPER_SNAKE_CASE）
- **決定結果** → コア指示
- **根拠** → 要件
- **結果** → メリットと注意点

### 3. 優先度を決定

| 条件                    | 優先度 |
| ----------------------- | ------ |
| セキュリティ/認証関連   | P0     |
| 言語/フレームワーク設定 | P1     |
| 開発プロセス            | P2     |
| 推奨事項                | P3     |

### 4. ルールファイルを生成

**出力先**: `docs/rules/[RULE_NAME].md`

**テンプレート参照**:
[@../../templates/rules/from-adr.md]

**重要**:

- ✅ コピー: セクション構造、フォーマットパターン
- ❌ コピーしない: 参照からの例示コンテンツ
- ADRに基づいて新鮮なコンテンツを生成

### 5. CLAUDE.mdに統合

`.claude/CLAUDE.md`に追加:

```markdown
## プロジェクトルール

ADRから生成:

- **[ルール名]**: [@docs/rules/[RULE_NAME].md](docs/rules/[RULE_NAME].md) (ADR-[number])
```

### 6. 完了メッセージ

```text
✅ ルール生成完了

📄 ADR: adr/[number]-[title].md
📋 ルール: docs/rules/[RULE_NAME].md
🔗 統合済み: .claude/CLAUDE.md
```

## エラーハンドリング

| エラー            | メッセージ                              | 解決策             |
| ----------------- | --------------------------------------- | ------------------ |
| ADRが見つからない | `❌ ADR-XXXX が見つかりません`          | `adr/`を確認       |
| 無効な番号        | `❌ 無効なADR番号`                      | 数値を使用         |
| ルールが存在      | `⚠️ ルールは既に存在します`             | 上書きを確認       |
| CLAUDE.mdがない   | `⚠️ .claude/CLAUDE.md が見つかりません` | 新規ファイルを作成 |

## 例

```bash
# ADRを作成してからルールに変換
/adr "TypeScript strictモードを採用"
/rulify 0001

# 結果:
# docs/rules/TYPESCRIPT_STRICT_MODE.md 作成
# .claude/CLAUDE.md に参照を更新
```

## ベストプラクティス

1. **即座に変換** - ADR作成直後に実行
2. **優先度を確認** - 生成されたルールの適切なP-レベルを確認
3. **チーム合意** - 変換前にチームでレビュー
4. **Gitコミット** - ルールファイルをバージョン管理に含める

```bash
git add docs/rules/*.md .claude/CLAUDE.md
git commit -m "docs: ADR-XXXXからルールを追加"
```

## 関連コマンド

- `/adr [title]` - ADRを作成
- `/audit` - ルール適用をレビュー

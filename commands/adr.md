---
name: adr
description: Create Architecture Decision Records (ADR) in MADR format with Skills integration
priority: medium
suitable_for:
  scale: [small, medium, large]
  type: [documentation, decision-making]
  understanding: "any"
  urgency: [low, medium]
aliases: [decision, architecture-decision]
timeout: 60
context:
  files_changed: "docs"
  lines_changed: "100+"
  new_features: true
  breaking_changes: false
---

# /adr - Architecture Decision Record Creator

## Purpose

High-quality Architecture Decision Record creation command with integrated ADR Creator Skill.

Automates the following through structured process:

- Pre-creation validation (duplicate check, naming conventions)
- Template selection
- Reference collection
- Post-completion validation
- Automatic index update

## Usage

```bash
/adr "Decision title"
```

**Examples:**

```bash
/adr "Adopt TypeScript strict mode"
/adr "Use Auth.js for authentication"
/adr "Introduce Turborepo for monorepo"
```

## Execution Flow

This command uses Skills from `~/.claude/skills/adr-creator/`.

### Phase 1: Pre-Check (Pre-creation Validation)

**Automatic execution**: ADR Creator Skill's pre-check script

Execution content:

- 既存ADRとの重複チェック（類似度70%以上で警告）
- 命名規則の検証（5-64文字、禁止文字チェック）
- ディレクトリ構造の検証と自動作成
- ADR番号の自動採番（0001-9999）
- 日付・バージョン整合性確認

```bash
SKILL_DIR="$HOME/.claude/skills/adr-creator"
TITLE="$1"  # ユーザーが入力したタイトル

# Skillが存在するか確認
if [ ! -d "$SKILL_DIR" ]; then
  echo "⚠️  ADR Creator Skillが見つかりません"
  echo "通常モードで続行します..."
  # 従来の処理にフォールバック
  USE_SKILL=false
else
  USE_SKILL=true
fi

if [ "$USE_SKILL" = true ] && [ -x "$SKILL_DIR/scripts/pre-check.sh" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 Phase 1: Pre-Check（作成前検証）"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Pre-check実行
  CHECK_OUTPUT=$("$SKILL_DIR/scripts/pre-check.sh" "$TITLE" 2>&1)
  CHECK_EXIT=$?

  if [ $CHECK_EXIT -eq 0 ]; then
    # 成功: 結果を表示
    echo "$CHECK_OUTPUT" | head -n -10  # JSON以外の部分

    # JSON部分を抽出
    JSON_LINE=$(echo "$CHECK_OUTPUT" | grep -A 10 '^\{')

    # 情報を抽出
    NUMBER=$(echo "$JSON_LINE" | grep '"number"' | cut -d'"' -f4)
    FILENAME=$(echo "$JSON_LINE" | grep '"filename"' | cut -d'"' -f4)
    SLUG=$(echo "$JSON_LINE" | grep '"slug"' | cut -d'"' -f4)
    DATE=$(echo "$JSON_LINE" | grep '"date"' | cut -d'"' -f4)

    echo ""
  else
    # 失敗: エラーメッセージを表示して終了
    echo "$CHECK_OUTPUT"
    echo ""
    echo "❌ Pre-Checkで問題が検出されました"
    echo "上記の問題を解決してから再試行してください"
    exit 1
  fi
else
  # Skillがない場合は従来の方法
  echo "ℹ️  Pre-Checkスクリプトが見つかりません - 通常モードで続行"

  # 従来の採番ロジック
  ADR_DIR="docs/adr"
  mkdir -p "$ADR_DIR"

  LAST_NUM=$(ls "$ADR_DIR" 2>/dev/null | grep -E '^[0-9]{4}-' | sort -r | head -1 | cut -d'-' -f1)
  if [ -z "$LAST_NUM" ]; then
    NUMBER="0001"
  else
    NUMBER=$(printf "%04d" $((10#$LAST_NUM + 1)))
  fi

  SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g')
  FILENAME="${NUMBER}-${SLUG}.md"
  DATE=$(date +%Y-%m-%d)
fi
```

**出力例**:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Phase 1: Pre-Check（作成前検証）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 1. タイトル検証
✅ タイトル長: 28文字
✅ 使用文字: OK

📁 2. ディレクトリ検証
✅ ディレクトリ存在: docs/adr
✅ 書き込み権限: OK

🔢 3. ADR番号採番
✅ 次の番号: 0023
✅ ファイル名: 0023-adopt-zustand.md

🔍 4. 重複チェック
⚠️  類似ADR検出 (類似度: 0.75): 0015-react-state-management.md
   既存: React State Management Strategy

💡 関連性を確認してください

✅ 作成可能です
```

### Phase 2: Template Selection

**対話形式**: ユーザーにテンプレート選択を促す

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Phase 2: テンプレート選択"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "この決定はどの分類に該当しますか？"
echo ""
echo "1. 技術選定（ライブラリ、フレームワーク、言語）"
echo "2. アーキテクチャパターン（構造、設計方針）"
echo "3. プロセス変更（ワークフロー、ルール）"
echo "4. スキップ（シンプルなADR）"
echo ""

# Claude Codeが対話形式で選択を受け取る
# ここでは read コマンドは使わず、Claude Codeが処理
# TEMPLATE_CHOICE には 1-4 の値が入る想定

if [ "$USE_SKILL" = true ]; then
  case $TEMPLATE_CHOICE in
    1)
      TEMPLATE_FILE="$SKILL_DIR/templates/technology-selection.md"
      TEMPLATE_NAME="技術選定用"
      ;;
    2)
      TEMPLATE_FILE="$SKILL_DIR/templates/architecture-pattern.md"
      TEMPLATE_NAME="アーキテクチャパターン用"
      ;;
    3)
      # 未実装（将来追加予定）
      TEMPLATE_FILE=""
      TEMPLATE_NAME="プロセス変更用（未実装）"
      ;;
    *)
      TEMPLATE_FILE=""
      TEMPLATE_NAME="デフォルト"
      ;;
  esac

  if [ -n "$TEMPLATE_FILE" ] && [ -f "$TEMPLATE_FILE" ]; then
    echo "✅ テンプレート: $TEMPLATE_NAME"
    echo ""
    USE_TEMPLATE=true
  else
    echo "ℹ️  デフォルトテンプレート（対話形式）を使用"
    echo ""
    USE_TEMPLATE=false
  fi
else
  USE_TEMPLATE=false
fi
```

**テンプレート内容**:

テンプレートには以下のプレースホルダーが含まれます:

- `{{TITLE}}` - ADRタイトル
- `{{NUMBER}}` - ADR番号
- `{{DATE}}` - 作成日
- `{{STATUS}}` - ステータス（proposed/accepted/deprecated/superseded）
- `{{DECIDERS}}` - 決定者
- `{{CONTEXT}}` - 背景と問題
- その他、テンプレート固有のプレースホルダー

### Phase 3: Information Collection

**Claude Codeが対話形式で情報を収集**

テンプレートを使用する場合:

1. テンプレートの必須フィールドを特定
2. ユーザーに順次質問
3. 回答を収集
4. プレースホルダーを置換

テンプレートを使用しない場合:

従来の対話形式:

```text
📋 ADR情報を入力してください

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 必須情報

### Context and Problem（背景と問題）
問題の背景を説明してください:
> [ユーザー入力]

### Considered Options（検討したオプション）
検討したオプションを入力してください（最低2つ、空行で終了）:

Option 1:
> [ユーザー入力]

Option 2:
> [ユーザー入力]

Option 3:
> [空行で終了]

### Chosen Option（選択したオプション）
どのオプションを選択しましたか？(1-2):
> [ユーザー入力]

### Decision Rationale（選択理由）
なぜこのオプションを選択しましたか？:
> [ユーザー入力]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## オプション情報（スキップ可）

### Decision Drivers（決定要因）
決定に影響した要因を入力（Enterでスキップ）:
> [ユーザー入力 or Enter]

### Positive Consequences（期待される良い結果）
> [ユーザー入力 or Enter]

### Negative Consequences（予想されるトレードオフ）
> [ユーザー入力 or Enter]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Phase 3.5: Reference Collection (Optional)

**自動実行**: GitHub Issues/PRの検索

```bash
if [ "$USE_SKILL" = true ] && [ -x "$SKILL_DIR/scripts/collect-references.sh" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 Phase 3.5: 参照元収集（オプション）"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # タイトルからキーワード抽出（最初の3単語）
  KEYWORDS=$(echo "$TITLE" | tr ' ' '\n' | head -3 | tr '\n' ' ')

  # 参照元収集実行
  REFERENCES=$("$SKILL_DIR/scripts/collect-references.sh" "$KEYWORDS" 2>&1)

  echo "$REFERENCES"
  echo ""
else
  REFERENCES=""
fi
```

### Phase 4: ADR Generation

**MADR形式で生成**

```bash
# プレースホルダー置換（テンプレート使用時）
if [ "$USE_TEMPLATE" = true ]; then
  ADR_CONTENT=$(cat "$TEMPLATE_FILE" | \
    sed "s|{{TITLE}}|$TITLE|g" | \
    sed "s|{{NUMBER}}|$NUMBER|g" | \
    sed "s|{{DATE}}|$DATE|g" | \
    sed "s|{{STATUS}}|proposed|g" | \
    # ... その他の置換
  )
else
  # 従来の対話形式で収集した情報から生成
  ADR_CONTENT="# $TITLE

- Status: proposed
- Deciders: [プロジェクトチーム]
- Date: $DATE

## Context and Problem Statement

$CONTEXT

## Decision Drivers

$DECISION_DRIVERS

## Considered Options

$CONSIDERED_OPTIONS

## Decision Outcome

Chosen option: \"$CHOSEN_OPTION\", because $RATIONALE.

### Consequences

#### Positive Consequences

$POSITIVE_CONSEQUENCES

#### Negative Consequences

$NEGATIVE_CONSEQUENCES

## More Information

$MORE_INFO

## References

$REFERENCES

---

*Created: $DATE*
*Author: Claude Code*
*ADR Number: $NUMBER*
"
fi

# MADR見出しを日本語に翻訳
# テンプレートは英語で保存し、出力時に日本語化
ADR_CONTENT=$(echo "$ADR_CONTENT" | \
  sed 's/## Context and Problem Statement/## 背景と課題/g' | \
  sed 's/## Decision Drivers/## 決定要因/g' | \
  sed 's/## Considered Options/## 検討したオプション/g' | \
  sed 's/## Decision Outcome/## 決定内容/g' | \
  sed 's/### Consequences/### 影響/g' | \
  sed 's/#### Positive Consequences/#### 期待される良い影響/g' | \
  sed 's/#### Negative Consequences/#### 予想されるトレードオフ/g' | \
  sed 's/## Consequences/## 影響/g' | \
  sed 's/## Confirmation/## 確認方法/g' | \
  sed 's/## More Information/## 補足情報/g' | \
  sed 's/## References/## 参照/g' | \
  sed 's/## Pros and Cons of the Options/## 各オプションの長所と短所/g' | \
  sed 's/### Implementation Plan/### 実装計画/g' | \
  sed 's/### Validation Criteria/### 検証基準/g' | \
  sed 's/### Migration Strategy/### 移行戦略/g' \
)

# ファイル保存
echo "$ADR_CONTENT" > "docs/adr/$FILENAME"

echo "✅ ADR保存完了: docs/adr/$FILENAME"
echo ""
```

### Phase 5: Validation Execution

**自動実行**: validate-adrスクリプト

```bash
if [ "$USE_SKILL" = true ] && [ -x "$SKILL_DIR/scripts/validate-adr.sh" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Phase 5: ADR検証"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # 検証実行
  "$SKILL_DIR/scripts/validate-adr.sh" "docs/adr/$FILENAME"
  VALIDATION_EXIT=$?

  echo ""

  if [ $VALIDATION_EXIT -eq 0 ]; then
    echo "✅ 検証合格 - ADRは品質基準を満たしています"
  else
    echo "⚠️  警告あり - 改善を推奨しますが、ADRは作成されています"
  fi

  echo ""
fi
```

**検証項目**:

- 必須セクション（Context, Options, Outcome）
- MADR形式準拠
- メタデータ完全性
- コンテンツ品質（オプション数、参照元数）

### Phase 6: Index Update

**自動実行**: update-indexスクリプト

```bash
if [ "$USE_SKILL" = true ] && [ -x "$SKILL_DIR/scripts/update-index.sh" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📚 Phase 6: 索引更新"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # 索引更新実行
  "$SKILL_DIR/scripts/update-index.sh" "docs/adr"

  echo ""
fi
```

**自動生成される内容**:

- docs/adr/README.md（ADR一覧表）
- ステータス別分類（Proposed/Accepted/Deprecated/Superseded）
- 最終更新日時

### Phase 7: Completion Message

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ADR作成完了"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 ファイル: docs/adr/$FILENAME"
echo "📊 番号: $NUMBER"
echo "📅 作成日: $DATE"
if [ "$USE_TEMPLATE" = true ]; then
  echo "📋 テンプレート: $TEMPLATE_NAME"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "次のステップ:"
echo "1. /adr:rule $NUMBER - AIが従うルールとして登録"
echo "2. チェックリスト完了:"
echo "   - 影響範囲分析: $SKILL_DIR/checklists/impact-analysis.md"
echo "   - テスト更新計画: $SKILL_DIR/checklists/test-coverage.md"
echo "   - ロールバック計画: $SKILL_DIR/checklists/rollback-plan.md"
echo ""
echo "チェックリストは任意ですが、重要な決定の場合は完了を推奨します。"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

## Error Handling

### Skillが見つからない場合

```bash
if [ ! -d "$SKILL_DIR" ]; then
  echo "⚠️  ADR Creator Skillが見つかりません"
  echo ""
  echo "Skillのインストール方法:"
  echo "  ~/.claude/skills/adr-creator/ ディレクトリが必要です"
  echo ""
  echo "通常モード（Skillなし）で続行しますか？ (Y/n)"

  # Yの場合は従来の対話形式で続行
  # nの場合は終了
fi
```

### スクリプト実行エラー

```bash
# Pre-Check失敗時
if [ $CHECK_EXIT -ne 0 ]; then
  echo "❌ Pre-Checkで問題が検出されました"
  echo ""
  echo "対処方法:"
  echo "1. タイトルを変更する"
  echo "2. 類似ADRを確認して統合を検討する"
  echo "3. 強制的に続行する（非推奨）"

  exit 1
fi
```

### 権限エラー

```bash
# ディレクトリ作成失敗
if [ ! -w "docs/adr" ]; then
  echo "❌ 書き込み権限がありません: docs/adr"
  echo ""
  echo "対処方法:"
  echo "  chmod +w docs/adr"

  exit 1
fi
```

## Configuration

### 環境変数

```bash
# Skillディレクトリのカスタマイズ
SKILL_DIR="${ADR_SKILL_DIR:-$HOME/.claude/skills/adr-creator}"

# ADRディレクトリのカスタマイズ
ADR_DIR="${ADR_DIRECTORY:-docs/adr}"

# 重複判定閾値（0.0-1.0）
DUPLICATE_THRESHOLD="${ADR_DUPLICATE_THRESHOLD:-0.7}"

# 自動検証の有効化/無効化
AUTO_VALIDATE="${ADR_AUTO_VALIDATE:-true}"

# 自動索引更新の有効化/無効化
AUTO_INDEX="${ADR_AUTO_INDEX:-true}"

# 参照元収集の有効化/無効化
AUTO_COLLECT_REFS="${ADR_AUTO_COLLECT_REFS:-true}"
```

### プロジェクト固有設定

`.claude/config/adr.conf` に設定を記述可能:

```bash
# ADR作成設定
ADR_DIRECTORY="architecture/decisions"
DUPLICATE_THRESHOLD=0.8
AUTO_VALIDATE=true
AUTO_INDEX=true
AUTO_COLLECT_REFS=false  # GitHub CLI未設定の場合
DEFAULT_TEMPLATE="technology-selection"  # 1, 2, 3, or none
```

## Best Practices

### 1. タイトルの付け方

```text
✅ Good:
- "Adopt Zustand for State Management"
- "Migrate to PostgreSQL for User Data"
- "Enable TypeScript Strict Mode"

❌ Bad:
- "State Management"  # 抽象的すぎる
- "Fix bug"  # ADRの対象外
- "Discussion about database"  # 決定ではない
```

### 2. テンプレートの選択

- **技術選定**: ライブラリ、フレームワーク、言語の選択
- **アーキテクチャパターン**: システム構造、設計方針の決定
- **プロセス変更**: 開発フロー、ルールの変更
- **デフォルト**: 小規模な決定、シンプルなADR

### 3. チェックリストの活用

重要な決定（影響範囲が大きい、リスクが高い）の場合:

1. **影響範囲分析** - 必須
2. **テスト更新計画** - 推奨
3. **ロールバック計画** - 高リスクの場合必須

### 4. ステータスの更新

```bash
# 決定が承認されたら
sed -i 's/Status: proposed/Status: accepted/' docs/adr/0023-*.md

# 非推奨になったら
sed -i 's/Status: accepted/Status: deprecated/' docs/adr/0008-*.md

# 別のADRに置き換えられたら
sed -i 's/Status: deprecated/Status: superseded/' docs/adr/0003-*.md

# 索引を更新
~/.claude/skills/adr-creator/scripts/update-index.sh docs/adr/
```

## Related Commands

- `/adr:rule <number>` - ADRからプロジェクトルールを生成
- `/research` - ADR作成前の技術調査
- `/think` - 重大な決定の前の計画策定

## References

- [MADR Official Site](https://adr.github.io/madr/)
- [Architecture Decision Records](https://adr.github.io/)
- [ADR Creator Skill Documentation](~/.claude/skills/adr-creator/SKILL.md)
- [Integration Guide](~/.claude/skills/adr-creator/INTEGRATION.md)

## Tips

1. **早期記録**: 決定直後に作成（記憶が新しいうちに）
2. **チームレビュー**: 重要な決定はチームで確認
3. **簡潔に**: 長すぎるADRは読まれない（1ページ目標）
4. **リンク活用**: 関連ADRや外部リソースへのリンクを含める
5. **定期レビュー**: 四半期ごとにステータスを見直す

## FAQ

**Q: ADRとドキュメントの違いは？**
A: ADRは「決定」を記録します。ドキュメントは「現状」を説明します。

**Q: すべての技術選択をADRにすべき？**
A: いいえ。チーム全体に影響する重要な決定のみです。

**Q: 過去の決定を変更したい場合は？**
A: 既存ADRを編集せず、新しいADRを作成して古いADRをsupersededにします。

**Q: Skillsがない環境では？**
A: 自動的に従来モード（対話形式）にフォールバックします。

**Q: Pre-Checkで類似ADRが検出されたら？**
A: 既存ADRを確認し、統合または関連付けを検討してください。無視して続行も可能です。

---
name: adr
description: MADR形式でArchitecture Decision Record（ADR）を作成
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

# /adr - Architecture Decision Record作成

## 目的

MADR（Markdown Architecture Decision Records）形式でアーキテクチャ決定を記録します。コンテキスト、検討した代替案、決定の根拠を文書化し、チーム全体で知識を共有します。

## 使用方法

```bash
/adr "決定タイトル"
```

**例：**

```bash
/adr "TypeScript strict modeを採用"
/adr "認証にAuth.jsを使用"
/adr "モノレポにTurborepoを導入"
```

## 実行フロー

### 1. プロジェクト構造の確認

```bash
# プロジェクトルートの確認
pwd

# docs/adr/ディレクトリの存在確認
ls -la docs/adr/ 2>/dev/null || echo "docs/adr/ not found"
```

### 2. ADRの自動採番

```bash
# 最新のADR番号を取得
LAST_NUM=$(ls docs/adr/ 2>/dev/null | grep -E '^[0-9]{4}-' | sort -r | head -1 | cut -d'-' -f1)

# 次の番号を計算（デフォルトは0001）
if [ -z "$LAST_NUM" ]; then
  NEXT_NUM="0001"
else
  NEXT_NUM=$(printf "%04d" $((10#$LAST_NUM + 1)))
fi
```

### 3. 対話形式での情報収集

ユーザーに以下の情報を入力してもらいます：

**必須フィールド：**

- タイトル（コマンド引数または対話形式入力）
- コンテキストと問題の記述
- 検討したオプション（最低2つ）
- 選択したオプション
- 決定の根拠

**任意フィールド：**

- 決定を導いた要因
- ポジティブな結果
- ネガティブな結果
- 確認方法
- 追加情報

**対話形式の例：**

```text
📋 ADR作成中: TypeScript strict modeを採用

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ADR番号: 0001

## 必須情報

### コンテキストと問題
この決定が必要なコンテキストと問題を説明してください：
> [ユーザー入力]

### 検討したオプション
検討したオプションを入力してください（最低2つ、空行で終了）：

オプション 1:
> [ユーザー入力]

オプション 2:
> [ユーザー入力]

オプション 3:
> [空行で終了]

### 選択したオプション
どのオプションを選びましたか？ (1-2):
> [ユーザー入力]

### 決定の根拠
なぜこのオプションを選んだか説明してください：
> [ユーザー入力]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 任意情報（y/yes でスキップ）

### 決定を導いた要因
決定に影響を与えた要因を入力してください：
> [ユーザー入力またはEnter]

### ポジティブな結果
期待されるポジティブな結果を入力してください：
> [ユーザー入力またはEnter]

### ネガティブな結果
期待されるトレードオフを入力してください：
> [ユーザー入力またはEnter]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. タイトルからスラッグ生成

```bash
# タイトルをスラッグに変換
# シンプルな実装：小文字化 + スペースをハイフンに + 特殊文字削除
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g')

# ファイル名形式：NNNN-slug.md
FILENAME="${NEXT_NUM}-${SLUG}.md"
```

### 5. MADR形式ファイルの生成

```markdown
# [タイトル]

- Status: proposed
- Deciders: [プロジェクトチーム]
- Date: [YYYY-MM-DD]

## Context and Problem Statement

[ユーザー入力]

## Decision Drivers

[ユーザー入力または省略]

## Considered Options

[オプションリスト]

## Decision Outcome

Chosen option: [選択したオプション]

Rationale: [決定の根拠]

## Consequences

### Positive Consequences

[ユーザー入力または省略]

### Negative Consequences

[ユーザー入力または省略]

## Confirmation

[ユーザー入力または省略]

## More Information

[ユーザー入力または省略]

---

*Created: [YYYY-MM-DD]*
*Author: Claude Code*
```

### 6. 保存と確認

```bash
# ディレクトリが存在しない場合は作成
mkdir -p docs/adr

# Writeツールを使用してファイルを保存

# 成功メッセージを表示
echo "✅ ADR作成完了: docs/adr/${FILENAME}"
```

### 7. 次のステップの提案

完了メッセージと次のアクション提案を表示：

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ADR作成完了

📄 ファイル: docs/adr/0001-typescript-strict-mode.md
📊 番号: 0001
📅 作成日: 2025-10-01

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

次のステップ：
このADRからプロジェクトルールを生成：
  /adr:rule 0001

これにより決定がAI実行可能なルール形式に変換され、
`.claude/CLAUDE.md`に自動的に追加されます。
```

## エラーハンドリング

### 1. プロジェクトルートにいない

```text
❌ エラー: プロジェクトルートから実行してください

現在のディレクトリ: /Users/user/
推奨: プロジェクトディレクトリに移動

例：
cd /path/to/your/project
/adr "決定タイトル"
```

### 2. docs/adr/ディレクトリの作成失敗

```text
❌ エラー: docs/adr/ディレクトリを作成できません

権限を確認：
chmod +w docs/
```

### 3. 必須フィールドの欠落

```text
❌ エラー: [フィールド名]は必須です

ADR作成には以下が必要です：
- タイトル
- コンテキストと問題の記述
- 検討したオプション（最低2つ）
- 選択したオプション
- 決定の根拠
```

## MADR形式の説明

### セクション構造

| セクション | 必須 | 説明 |
|---------|------|------|
| タイトル | ✅ | 決定の簡潔な説明 |
| Status | ✅ | proposed/accepted/deprecated/superseded |
| Deciders | ✅ | 決定を行った人 |
| Date | ✅ | 決定日 |
| Context and Problem | ✅ | なぜ決定が必要か |
| Decision Drivers | ❌ | 決定に影響を与えた要因 |
| Considered Options | ✅ | 検討した代替案 |
| Decision Outcome | ✅ | 選択したオプションと根拠 |
| Consequences | ❌ | 期待される影響（ポジティブ/ネガティブ） |
| Confirmation | ❌ | 実装の検証方法 |
| More Information | ❌ | 追加のコンテキスト |

### ステータスライフサイクル

```text
proposed → accepted → (deprecated) → superseded
```

- **proposed**: レビュー待ち
- **accepted**: 採用、実装中または実装済み
- **deprecated**: より良い代替案が見つかった
- **superseded**: 別のADRに置き換えられた

## 使用例

### 例1: 技術選定

```bash
/adr "状態管理にZustandを採用"
```

**生成されるADR:**

```markdown
# 状態管理にZustandを採用

- Status: proposed
- Deciders: フロントエンドチーム
- Date: 2025-10-01

## Context and Problem Statement

Reactアプリケーションの状態管理が複雑化している。
コンポーネント間でのデータ共有が煩雑。
シンプルで型安全な状態管理ソリューションが必要。

## Considered Options

- Zustand: シンプルなAPIで軽量
- Redux Toolkit: 標準的だが学習コストが高い
- Jotai: Atomic設計だが既存コードとの統合が難しい

## Decision Outcome

Chosen option: Zustand

Rationale:
- 学習コストが低い
- TypeScriptサポートが優れている
- 既存のReact Hooksパターンとの相性が良い
- バンドルサイズが小さい（1KB）

## Consequences

### Positive Consequences

- 開発速度の向上
- コードの可読性向上
- バンドルサイズの削減

### Negative Consequences

- チームの学習期間（約1週間）
- Reduxエキスパートが適応に時間が必要
```

### 例2: アーキテクチャ決定

```bash
/adr "モノレポにTurborepoを導入"
```

### 例3: 開発プロセス

```bash
/adr "コミットメッセージにConventional Commitsを採用"
```

## ベストプラクティス

### 1. タイトルは具体的に

```text
❌ 悪い例: "データベース選定"
✅ 良い例: "ユーザーデータ永続化にPostgreSQLを採用"
```

### 2. 代替案を明確に文書化

少なくとも2つの代替案を記録し、なぜ他を選ばなかったかを説明します。

### 3. 根拠を測定可能に

```text
❌ 悪い例: "速いから"
✅ 良い例: "ベンチマークで30%高速、学習コストも低い"
```

### 4. トレードオフを記録

すべての決定にはコストがあります。ポジティブな結果だけでなく、ネガティブな結果も文書化します。

### 5. 定期的にレビュー

ADRは生きた文書です。ステータスを定期的に更新し、古い決定を非推奨にします。

## 関連コマンド

- `/adr:rule <番号>` - ADRからルールを生成
- `/research` - 技術調査後にADRを作成
- `/think` - 重要な決定前に計画

## 参考資料

- [MADR公式サイト](https://adr.github.io/madr/)
- [Architecture Decision Records](https://adr.github.io/)

## ヒント

1. **早期記録**: 決定直後に文書化（記憶が新しいうちに）
2. **チームレビュー**: 重要な決定はチームでレビュー
3. **簡潔に保つ**: 長いADRは読まれない（1ページを目安に）
4. **リンクを活用**: 関連ADRや外部リソースへのリンクを含める

## FAQ

**Q: いつADRを作成すべきですか？**
A: 重要なアーキテクチャ決定、技術選定、設計方針の変更時。

**Q: 小さな決定もADRにすべきですか？**
A: いいえ。チーム全体に影響する決定のみで十分です。

**Q: 過去の決定を変更したい場合は？**
A: 既存のADRを非推奨にし、新しいADRを作成します。

**Q: 誰がADRを作成すべきですか？**
A: 決定に関わった人、または実装する人。

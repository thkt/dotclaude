---
description: >
  Generate project-specific skill from ADR for context-aware implementation guidance. Creates skill with references, examples, and validation.
  Saves to .claude/skills/, enables automatic discovery. Provides implementation guidance based on architecture decisions.
  Use when ADR needs to guide implementation with comprehensive context and examples.
  ADRからプロジェクト固有のスキルを生成し、コンテキストに応じた実装ガイダンスを提供。
allowed-tools: Read, Write, Edit, Bash(ls:*), Bash(mkdir:*), Bash(cat:*), Grep, Glob
model: inherit
argument-hint: "[ADR number]"
---

# /adr:skill - ADRからスキル生成

## 目的

Architecture Decision Record (ADR) を実行可能なスキル形式に変換します。`/adr:rule` が制約を強制するのに対し、スキルはキーワードでトリガーされるコンテキスト検出型の実装パターンを提供します。

**主な違い:**

| 観点 | /adr:rule | /adr:skill |
| --- | --- | --- |
| 目的 | 制約の強制 | パターンの提案 |
| 適用 | 常時有効 | キーワードでトリガー |
| 出力先 | docs/rules/ | .claude/skills/ |
| 内容 | 必須/禁止事項 | 実装方法 + チェックリスト |
| 統合 | CLAUDE.md | 自動検出 |

## 使用方法

```bash
/adr:skill <ADR番号> [オプション]
```

**例:**

```bash
/adr:skill 0001              # プロジェクト固有スキル
/adr:skill 0001 --global     # グローバルスキル(~/.claude/skills/)
/adr:skill 12 --name api-fetching  # 名前を明示指定
```

**オプション:**

- `--global` - `~/.claude/skills/` に作成(全プロジェクトで利用可能)
- `--name <名前>` - 自動生成名を上書き
- `--preview` - 保存せずに生成内容をプレビュー

## 実行フロー

### 1. ADRファイル読み取り

```bash
# ADR番号をゼロパディング
ADR_NUM=$(printf "%04d" $1)

# プロジェクト内のADRファイル検索
ADR_FILE=$(ls docs/adr/${ADR_NUM}-*.md 2>/dev/null | head -1)

if [ -z "$ADR_FILE" ]; then
  echo "❌ エラー: ADR-${ADR_NUM} が docs/adr/ に見つかりません"
  exit 1
fi
```

### 2. ADR内容解析

スキル生成のための主要セクション抽出:

- **タイトル**: スキル名と説明の基礎
- **背景**: 「なぜ」セクションの根拠
- **決定**: 核となる実装パターン
- **結果**: ヒントと注意事項
- **技術用語**: トリガーキーワード用

**抽出例:**

```markdown
# 入力: docs/adr/0001-use-react-query.md

タイトル: "APIデータ取得にReact Queryを使用"
決定: "サーバー状態管理の標準ライブラリとしてReact Queryを採用"
背景: "一貫したキャッシング・同期戦略が必要"

↓ スキル用に抽出

name: adr-0001-use-react-query
triggers: ["React Query", "API", "データ取得", "fetch", "server state"]
pattern: React Query 実装パターン
```

### 3. スキル名生成

```bash
# タイトルをkebab-caseに変換
# "Use React Query for API" → "adr-0001-use-react-query"

SKILL_NAME=$(echo "adr-${ADR_NUM}-${TITLE}" | \
  tr '[:upper:]' '[:lower:]' | \
  sed 's/ /-/g' | \
  sed 's/[^a-z0-9-]//g' | \
  sed 's/--*/-/g')

# デフォルトパス(プロジェクト固有)
SKILL_DIR=".claude/skills/${SKILL_NAME}"
```

### 4. トリガーキーワード抽出

ADRから技術用語を自動識別:

**抽出ロジック:**

```javascript
// タイトルと決定セクションから
const titleWords = extractTechnicalTerms(title);
const decisionWords = extractTechnicalTerms(decision);

// 日英バイリンガル対応のため日本語訳を追加
const triggers = [
  ...titleWords,
  ...decisionWords,
  ...getJapaneseTranslations(titleWords)
];

// 出力例:
// ["React Query", "API", "fetch", "データ取得", "server state", "caching"]
```

**手動レビュー:**

抽出キーワードを表示し、確認を促す:

```text
📝 抽出されたトリガーキーワード:

英語: React Query, API, fetch, server state, caching
日本語: データ取得, サーバー状態, キャッシュ

キーワードを追加/削除しますか? (Enterで確定、または編集)
> [追加キーワード]
```

### 5. 許可ツール判定

ADR内容から必要なツールを推論:

```javascript
const tools = ['Read', 'Grep', 'Glob'];  // 基本ツール

// 内容分析に基づいて追加
if (hasCodeExamples) tools.push('Write', 'Edit');
if (hasSecurityContent) tools.push('Task');
if (hasBrowserContent) tools.push('mcp__claude-in-chrome__*');
if (hasWebAPIs) tools.push('mcp__mdn__*');
```

### 6. スキルファイル構造生成

````markdown
---
name: adr-NNNN-{kebab-case-title}
description: >
  {ADR決定の要約}
  Triggers on keywords: {抽出されたキーワード}
  実装時に自動起動。
  ADR-{番号}からのプロジェクト固有パターンを提供。
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# {ADRタイトル} - プロジェクトパターン

## 🎯 背景と決定

[ADRのContextとDecisionから引用]

## ✅ 実装パターン

[ADR Decisionを実行可能なパターンに変換]

### 推奨アプローチ

```{言語}
// ADRから導出されたパターン
```

### 重要ポイント

- [ADR Decisionからのポイント1]
- [根拠からのポイント2]
- [結果からのポイント3]

## 📋 実装チェックリスト

実装前に確認:

- [ ] [ADRからの要件1]
- [ ] [要件2]
- [ ] [考慮事項3]

実装後:

- [ ] [検証1]
- [ ] [検証2]

## 💡 使用例

### シナリオ1: {一般的なユースケース}

```{言語}
// 実装例
```

### シナリオ2: {エッジケース}

```{言語}
// エッジケース対応
```

## ⚠️ 重要な考慮事項

[ADR Consequencesのネガティブ面から導出]

### 避けるべきこと

- ❌ [アンチパターン1]
- ❌ [アンチパターン2]

### 使用すべきでない場合

[このパターンを適用すべきでないシナリオ]

## 🔗 参照

- **ソースADR**: [ADR-{番号}: {タイトル}](../../docs/adr/{NNNN}-{title}.md)
- **作成日**: {YYYY-MM-DD}
- **関連スキル**: [該当する場合]

---

*このスキルはADR-{番号}から自動生成されました。実装ガイダンスを改善するため自由に編集してください。*
````

### 7. バイリンガル版作成

日本語版を同時に作成:

```bash
# 英語版
SKILL_FILE="${SKILL_DIR}/SKILL.md"

# 日本語版(同時作成)
JA_SKILL_DIR="~/.claude/ja/skills/${SKILL_NAME}"
JA_SKILL_FILE="${JA_SKILL_DIR}/SKILL.md"

# YAMLフロントマターは英語のまま
# 本文を日本語に翻訳
```

### 8. 重複スキル検出

類似トリガーキーワードを持つ既存スキルをチェック:

```bash
# 既存スキルでキーワード重複を検索
for existing in .claude/skills/*/SKILL.md; do
  # 既存スキルからトリガー抽出
  # 新規スキルトリガーと比較
  # 類似度スコア算出
done

# 50%以上重複時に警告
if [ $OVERLAP -gt 50 ]; then
  echo "⚠️  警告: 類似スキルが存在します:"
  echo "  - 既存: ${EXISTING_SKILL}"
  echo "  - 重複率: ${OVERLAP}%"
  echo ""
  echo "続行しますか? (Y/n)"
fi
```

### 9. 完了メッセージ

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ スキル生成完了

📄 ソースADR: docs/adr/0001-use-react-query.md
🎯 スキル: .claude/skills/adr-0001-use-react-query/SKILL.md
🌐 日本語版: ~/.claude/ja/skills/adr-0001-use-react-query/SKILL.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 生成されたスキル

**名前:** adr-0001-use-react-query
**トリガー:** React Query, API, fetch, データ取得
**目的:** React Query実装パターンの提供

### 自動起動条件

以下の場合に自動的にトリガーされます:
- APIデータ取得の実装時
- "React Query"や"API"の言及時
- サーバー状態管理の作業時

### プレビュー

このスキルは以下を提供します:
✓ 実装チェックリスト
✓ コード例
✓ 避けるべき一般的な落とし穴
✓ プロジェクト固有のパターン

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

スキルの使用準備が整いました。"APIデータ取得"と言及してトリガーしてみてください！
```

## スキル vs ルール 判断ガイド

`/adr:skill` と `/adr:rule` の使い分け:

### `/adr:rule` を使う場合

- ✅ 絶対的制約("MUST" / "MUST NOT")
- ✅ セキュリティ要件
- ✅ コンテキストに関わらず常に強制
- ✅ シンプルな実行/禁止指示

**例:**

- "パスワードを平文で保存してはならない"
- "必ずパラメータ化クエリを使用"
- "TypeScript strict modeを有効にする必要がある"

### `/adr:skill` を使う場合

- ✅ 実装パターン("HOW TO")
- ✅ コンテキスト依存のガイダンス
- ✅ 詳細な例が必要
- ✅ 複数シナリオのカバーが必要

**例:**

- "Auth.jsを使った認証の実装方法"
- "APIデータ取得のReact Queryパターン"
- "モノレポパッケージ依存関係のガイドライン"

### 両方を共存させる

多くの場合、両方が必要:

```bash
# 制約: React Queryを使用する必要がある
/adr:rule 0001  # 使用を強制

# パターン: 正しい使用方法
/adr:skill 0001  # 実装ガイダンスを提供
```

## エラー処理

### 1. ADRが見つからない

```text
❌ エラー: ADR-0001 が見つかりません

検索場所: docs/adr/
利用可能なADR:
- 0002-authentication-strategy.md
- 0003-monorepo-structure.md

正しい番号を使用してください:
/adr:skill 0002
```

### 2. スキルが既に存在

```text
⚠️  スキルは既に存在します: .claude/skills/adr-0001-use-react-query/

選択肢:
1. 上書き (y)
2. 別名で作成 (n + 名前を指定)
3. キャンセル (c)

選択 (y/n/c): n
新しいスキル名: api-react-query-pattern
```

### 3. トリガーキーワードが見つからない

```text
⚠️  警告: トリガーキーワードを自動抽出できませんでした

手動でキーワードを入力してください:
キーワード入力(カンマ区切り):
> API, データ取得, React Query, キャッシュ

✓ キーワードが追加されました
```

### 4. 重複検出

```text
⚠️  警告: 類似スキルが検出されました

既存スキル: progressive-enhancement (重複率: 65%)
- 共有トリガー: "optimization", "performance"

推奨事項:
1. 既存スキルにマージ
2. 異なるトリガーキーワードを使用
3. このまま進める

選択 (1/2/3): 2
```

## 使用例

### 例1: APIデータ取得パターン

```bash
# ADR作成
/adr "APIデータ取得にReact Queryを使用"

# スキル生成
/adr:skill 0001
```

**生成先:** `.claude/skills/adr-0001-use-react-query/SKILL.md`

**トリガー条件:**

- "API", "fetch", "React Query"
- "データ取得", "サーバー状態"

**提供内容:**

- React Queryセットアップパターン
- クエリキー命名規則
- エラー処理例
- キャッシング戦略

### 例2: 認証パターン

```bash
/adr "認証にAuth.jsを実装"
/adr:skill 0002 --global  # 全プロジェクトで利用可能
```

### 例3: モノレポガイドライン

```bash
/adr "Turborepo モノレポ構造"
/adr:skill 0003
```

## ベストプラクティス

### 1. 保存前にレビュー

常に `--preview` を最初に使用:

```bash
/adr:skill 0001 --preview
# 生成内容をレビュー
# 必要に応じてトリガーを調整
# その後--previewなしで保存
```

### 2. トリガーキーワードの精緻化

汎用的すぎるキーワードはノイズに:

```bash
# ❌ 汎用的すぎる
triggers: ["code", "implement", "コード"]

# ✅ パターンに特化
triggers: ["React Query", "API caching", "server state", "useQuery"]
```

### 3. 具体的な例を追加

具体的であるほど有用:

````markdown
## ✅ 良い例

```typescript
// プロジェクト固有: ユーザーデータ取得
const { data, isLoading } = useQuery({
  queryKey: ['user', userId],  // ADRの命名規則
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000,  // ADRで定めた5分
});
```
````

### 4. スキルを最新に保つ

ADR変更時にスキルを再生成:

```bash
# ADR更新
vim docs/adr/0001-use-react-query.md

# スキル再生成
/adr:skill 0001  # 上書き確認
```

## ワークフローとの統合

### ADR → 実装の完全ワークフロー

```bash
# 1. 決定を文書化
/adr "APIにReact Queryを使用"

# 2. 強制ルール作成(必要な場合)
/adr:rule 0001  # "React Queryを使用すること"

# 3. 実装スキル作成
/adr:skill 0001  # "React Queryの使用方法"

# 4. 機能実装
# → "API"言及でスキルが自動トリガー
# → プロジェクト固有ガイダンスを提供
```

### プロジェクトオンボーディング

新規チームメンバーは生成されたスキルから学習:

```bash
# 全ADRからスキル生成
for adr in docs/adr/*.md; do
  num=$(basename "$adr" | grep -o '^[0-9]*')
  /adr:skill "$num"
done

# 結果: 完全なプロジェクトパターンライブラリ
```

## 関連コマンド

- `/adr [タイトル]` - ADR作成
- `/adr:rule <番号>` - 強制ルール生成
- `/research` - ADR用の技術調査
- `/audit` - スキル有効性レビュー

## ヒント

1. **具体的なトリガー**: 技術用語を使用、汎用的な単語は避ける
2. **実際の例**: 汎用サンプルでなく実際のプロジェクトコードを含める
3. **チェックリスト重視**: 実行可能で具体的なチェックリストにする
4. **定期更新**: ADRの進化に合わせて再生成
5. **チームレビュー**: トリガーキーワードとパターンのフィードバックを得る

## FAQ

**Q: 生成されたスキルを手動編集できますか?**
A: はい！スキルはテンプレートです。生成後に洗練させてください。

**Q: スキルが正しくトリガーされるかテストする方法は?**
A: 会話でトリガーキーワードを言及し、起動を観察してください。

**Q: すべてのADRをスキルにすべきですか?**
A: いいえ。実装パターンを持つADRのみがスキルから利益を得ます。

**Q: 複数のADRを1つのスキルにマージできますか?**
A: 現在はできません。必要なら手動で複合スキルを作成してください。

**Q: トリガーが既存スキルと重複したら?**
A: ツールが警告します。キーワードを精緻化するか手動でマージしてください。

**Q: プライベートプロジェクトでスキルは機能しますか?**
A: はい、プロジェクト固有スキル(`.claude/skills/`)はプライベートです。

## 高度な使用

### カスタムスキルテンプレート

プロジェクト用のカスタムテンプレート作成:

```bash
# テンプレート作成
cat > .claude/templates/skill-template.md << 'EOF'
# カスタムプロジェクトスキルテンプレート
# /adr:skillコマンドで使用
EOF

# テンプレート使用
/adr:skill 0001 --template .claude/templates/skill-template.md
```

### 一括生成

全ADRからスキル生成:

```bash
find docs/adr -name '*.md' | while read adr; do
  num=$(basename "$adr" | grep -o '^[0-9]*')
  /adr:skill "$num" --auto-confirm
done
```

### スキル分析

スキル使用状況追跡:

```bash
# 最も多くトリガーされるスキルをチェック
grep "Skill triggered" ~/.claude/logs/*.log | \
  awk -F: '{print $2}' | \
  sort | uniq -c | sort -rn
```

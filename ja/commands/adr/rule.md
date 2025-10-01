---
name: rule
description: ADRからプロジェクトルールを自動生成し、CLAUDE.mdに統合
priority: medium
suitable_for:
  scale: [small, medium, large]
  type: [documentation, automation]
  understanding: "high"
  urgency: [low, medium]
aliases: [to-rule, generate-rule]
timeout: 60
context:
  files_changed: "docs, .claude"
  lines_changed: "50+"
  new_features: false
  breaking_changes: false
---

# /adr:rule - ADRからルール生成

## 目的

指定されたADR（Architecture Decision Record）を分析し、AI実行可能なルール形式に自動変換します。生成されたルールはプロジェクトの`.claude/CLAUDE.md`に自動的に追加され、以降のAI操作に反映されます。

## 使用方法

```bash
/adr:rule <ADR番号>
```

**例：**

```bash
/adr:rule 0001
/adr:rule 12
/adr:rule 0003
```

## 実行フロー

### 1. ADRファイルの読み込み

```bash
# ADR番号をゼロ埋め
ADR_NUM=$(printf "%04d" $1)

# ADRファイルを検索
ADR_FILE=$(ls docs/adr/${ADR_NUM}-*.md 2>/dev/null | head -1)

# ファイルの存在確認
if [ -z "$ADR_FILE" ]; then
  echo "❌ エラー: ADR-${ADR_NUM}が見つかりません"
  exit 1
fi
```

### 2. ADRコンテンツの解析

Readツールを使用してADRファイルを読み込み、以下のセクションを抽出：

- **タイトル**: ルール名の基礎
- **Decision Outcome**: ルールの中核
- **Rationale**: なぜこのルールが必要か
- **Consequences (Positive/Negative)**: ルール適用時の考慮事項

**解析例：**

```markdown
# 入力ADR (0001-typescript-strict-mode.md)
Title: TypeScript strict modeを採用
Decision: TypeScript strict modeを有効化
Rationale: 型安全性の向上、早期バグ検出

↓ 分析

Rule Name: TYPESCRIPT_STRICT_MODE
Priority: P2 (開発ルール)
Application: TypeScriptコードを書く時
Instructions: 常にstrict modeで書く、anyを避ける
```

### 3. ルールファイル名の生成

```bash
# タイトルをUPPER_SNAKE_CASEに変換
# 例: "TypeScript strict modeを採用" → "TYPESCRIPT_STRICT_MODE"

RULE_NAME=$(echo "$TITLE" | \
  tr '[:lower:]' '[:upper:]' | \
  sed 's/ /_/g' | \
  sed 's/[^A-Z0-9_]//g' | \
  sed 's/__*/_/g')

RULE_FILE="docs/rules/${RULE_NAME}.md"
```

### 4. ルールファイルの生成

````markdown
# [ルール名]

Priority: P2
Source: ADR-[番号]
Created: [YYYY-MM-DD]

## 適用条件

[このルールをいつ適用するか - ADR "Decision Outcome"から派生]

## 実行指示

[AIへの具体的な指示 - ADR "Decision Outcome"と"Rationale"から生成]

### 要件

- [必須事項1]
- [必須事項2]

### 禁止事項

- [禁止事項1]
- [禁止事項2]

## 例

### ✅ 良い例

```[言語]
[ADRの決定に従ったコード例]
```

### ❌ 悪い例

```[言語]
[避けるべきパターン]
```

## 背景

[ADR "Context and Problem Statement"から引用]

## 期待される利点

[ADR "Positive Consequences"から引用]

## 注意事項

[ADR "Negative Consequences"から引用]

## 参照

- ADR: [相対パス]
- Created: [YYYY-MM-DD]
- Last Updated: [YYYY-MM-DD]

---

*このルールはADR-[番号]から自動生成されました*
````

### 5. CLAUDE.mdとの統合

プロジェクトの`.claude/CLAUDE.md`に参照を自動追加：

```bash
# .claude/CLAUDE.mdの存在確認
if [ ! -f ".claude/CLAUDE.md" ]; then
  # 存在しない場合は作成
  mkdir -p .claude
  cat > .claude/CLAUDE.md << 'EOF'
# CLAUDE.md

## Project Rules

プロジェクト固有のルール。

EOF
fi

# 既存の参照をチェック（重複回避）
if ! grep -q "docs/rules/${RULE_NAME}.md" .claude/CLAUDE.md; then
  # "## Project Rules"セクションの後に追加
  # または新しいセクションを作成
fi
```

**追加フォーマット：**

```markdown
## Project Rules

ADRから生成：

- **[ルール名]**: [@docs/rules/[RULE_NAME].md] (ADR-[番号])
```

### 6. 完了メッセージ

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ルール生成完了

📄 ADR: docs/adr/0001-typescript-strict-mode.md
📋 ルール: docs/rules/TYPESCRIPT_STRICT_MODE.md
🔗 統合: .claude/CLAUDE.md (更新済み)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 生成されたルール

**ルール名:** TYPESCRIPT_STRICT_MODE
**優先度:** P2
**適用:** TypeScriptコードを書く時

### 実行指示

- 常にTypeScript strict modeを有効化
- anyの使用を避け、適切な型定義を使用
- 型安全な実装を優先

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

このルールは次回のAI実行から自動的に適用されます。
```

## ルール生成ロジック

### 自動優先度判定

ADRコンテンツから優先度を自動判定：

| 条件 | 優先度 | 例 |
|------|--------|-----|
| セキュリティ関連 | P0 | 認証、認可 |
| 言語/フレームワーク設定 | P1 | TypeScript strict、Linter設定 |
| 開発プロセス | P2 | コミット規約、コードレビュー |
| 推奨事項 | P3 | パフォーマンス最適化 |

**判定ロジック：**

```javascript
if (title.includes('security') || title.includes('auth')) {
  priority = 'P0';
} else if (title.includes('TypeScript') || title.includes('config')) {
  priority = 'P1';
} else if (title.includes('process') || title.includes('convention')) {
  priority = 'P2';
} else {
  priority = 'P3';
}
```

### 実行指示の生成

ADR "Decision Outcome"と"Rationale"から具体的な実行指示を抽出：

**変換例：**

| ADRの内容 | 生成される実行指示 |
|-----------|-------------------|
| "TypeScript strict modeを有効化" | "常にstrict modeでコードを書く" |
| "認証にAuth.jsを使用" | "認証にはAuth.jsライブラリを使用、カスタム実装を避ける" |
| "モノレポ構造" | "パッケージ間の依存関係を明確化、共通コードはsharedパッケージに配置" |

### 要件と禁止事項の抽出

ADR "Rationale"と"Consequences"から派生：

**要件（Must do）：**

- 決定内容のポジティブな部分
- 実装すべき具体的なアクション

**禁止事項（Must NOT）：**

- 避けるべきアンチパターン
- ネガティブな結果につながるアクション

### コード例の生成

ADRの技術的内容に基づいて良い例と悪い例を自動生成：

````markdown
// TypeScript strict modeの例

### ✅ 良い例

```typescript
// 明確な型定義
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  // 実装
}
```

### ❌ 悪い例

```typescript
// anyを使用
function getUser(id: any): any {
  // 実装
}
```
````

## エラーハンドリング

### 1. ADRが見つからない

```text
❌ エラー: ADR-0001が見つかりません

docs/adr/ディレクトリを確認：
ls docs/adr/

利用可能なADR：
- 0002-use-react-query.md
- 0003-monorepo-structure.md

正しい番号を指定：
/adr:rule 0002
```

### 2. 無効な番号形式

```text
❌ エラー: 無効なADR番号 "abc"

ADR番号は数値でなければなりません：

正しい例：
/adr:rule 1
/adr:rule 0001
/adr:rule 12

誤った例：
/adr:rule abc
/adr:rule one
```

### 3. docs/rules/ディレクトリの作成失敗

```text
❌ エラー: docs/rules/ディレクトリを作成できません

権限を確認：
ls -la docs/

または手動で作成：
mkdir -p docs/rules
chmod +w docs/rules
```

### 4. CLAUDE.mdが見つからない

```text
⚠️  警告: .claude/CLAUDE.mdが見つかりません

新しいファイルを作成しますか？ (Y/n)
> Y

✅ .claude/CLAUDE.mdを作成しました
✅ ルール参照を追加しました
```

### 5. ルールファイルが既に存在

```text
⚠️  警告: docs/rules/TYPESCRIPT_STRICT_MODE.mdが既に存在します

上書きしますか？ (y/N)
> n

❌ キャンセルしました

既存のルールを確認：
cat docs/rules/TYPESCRIPT_STRICT_MODE.md
```

## CLAUDE.md統合パターン

### 新規プロジェクト用

```markdown
# CLAUDE.md

## Project Rules

プロジェクト固有のルール。

### アーキテクチャ決定

ADRから生成：

- **TYPESCRIPT_STRICT_MODE**: [@docs/rules/TYPESCRIPT_STRICT_MODE.md] (ADR-0001)
```

### 既存CLAUDE.md用

```markdown
# CLAUDE.md

## 既存セクション
[既存の内容]

## Project Rules

[既存のルール]

### アーキテクチャ決定

ADRから生成：

- **TYPESCRIPT_STRICT_MODE**: [@docs/rules/TYPESCRIPT_STRICT_MODE.md] (ADR-0001)
- **REACT_QUERY_USAGE**: [@docs/rules/REACT_QUERY_USAGE.md] (ADR-0002)
```

**重複チェック：**

```bash
# 同じルールが既に追加されているかチェック
if grep -q "docs/rules/${RULE_NAME}.md" .claude/CLAUDE.md; then
  echo "⚠️  このルールは既に追加されています"
  exit 0
fi
```

## 使用例

### 例1: TypeScript設定をルールに変換

```bash
# ステップ1: ADRを作成
/adr "TypeScript strict modeを採用"

# ステップ2: ルールを生成
/adr:rule 0001
```

**生成されるルール（`docs/rules/TYPESCRIPT_STRICT_MODE.md`）：**

````markdown
# TYPESCRIPT_STRICT_MODE

Priority: P1
Source: ADR-0001
Created: 2025-10-01

## 適用条件

TypeScriptコードを書く時、すべてのファイルに適用

## 実行指示

### 要件

- `tsconfig.json`で`strict: true`を設定
- `any`型の使用を避け、適切な型定義を使用
- 型推論を活用し、明示的な型注釈は必要な箇所のみ
- `null`と`undefined`を明確に区別

### 禁止事項

- `any`型の安易な使用
- `@ts-ignore`コメントの多用
- 型アサーション（`as`）の過度な使用

## 例

### ✅ 良い例

```typescript
interface User {
  id: number;
  name: string;
  email: string | null;
}

function getUser(id: number): User | undefined {
  // 実装
}
```

### ❌ 悪い例

```typescript
function getUser(id: any): any {
  // @ts-ignore
  return data;
}
```

## 背景

型安全性の向上と早期バグ検出を目指す。
Redditコードベースが複雑化しており、型による保護が必要。

## 期待される利点

- コンパイル時エラー検出
- IDE補完の向上
- リファクタリングの安全性向上

## 注意事項

- 既存コードの移行に時間がかかる（段階的に適用）
- 初心者の学習コストが高い

## 参照

- ADR: docs/adr/0001-typescript-strict-mode.md
- Created: 2025-10-01
- Last Updated: 2025-10-01

---

*このルールはADR-0001から自動生成されました*
````

### 例2: 認証ルールの変換

```bash
/adr "認証にAuth.jsを使用"
/adr:rule 0002
```

### 例3: アーキテクチャルールの変換

```bash
/adr "モノレポにTurborepoを導入"
/adr:rule 0003
```

## ベストプラクティス

### 1. ADR作成直後にルール生成

```bash
# 決定をルールに変換することを忘れずに
/adr "新しい決定"
/adr:rule [番号]  # 忘れずに実行
```

### 2. 定期的なルールレビュー

```bash
# 定期的にルールをチェック
ls -la docs/rules/

# 古いルールをレビュー
cat docs/rules/*.md
```

### 3. チームでの共有

```bash
# ルールファイルをgit管理に含める
git add docs/rules/*.md .claude/CLAUDE.md
git commit -m "docs: アーキテクチャ決定ルールを追加"
```

### 4. ルールの更新

ADRが更新されたら、ルールを再生成：

```bash
# ADRを更新
vim docs/adr/0001-typescript-strict-mode.md

# ルールを再生成
/adr:rule 0001  # 上書き確認
```

## 関連コマンド

- `/adr [タイトル]` - ADRを作成
- `/research` - 技術調査
- `/review` - ルール適用のレビュー

## ヒント

1. **即座に変換**: ADR作成直後に実行すると決定が忘れられない
2. **優先度確認**: 生成後、ルールファイルで適切な優先度か確認
3. **CLAUDE.md確認**: 統合後、AI動作をテストして反映を確認
4. **チーム合意**: ルールに変換する前にチームでレビュー

## FAQ

**Q: ルール生成は完全自動ですか？**
A: はい、ADRからルールを自動生成し、CLAUDE.mdに統合します。

**Q: 生成されたルールは編集できますか？**
A: はい、`docs/rules/`のファイルを直接編集できます。

**Q: ルールを削除したい場合は？**
A: ルールファイルを削除し、CLAUDE.mdから参照を手動で削除してください。

**Q: 複数のADRから1つのルールを作成できますか？**
A: 現在は1:1対応です。複数のADRを組み合わせたい場合は、手動でルールを作成してください。

**Q: AIがルールを認識しない場合は？**
A: `.claude/CLAUDE.md`の参照パスが正しいか確認してください。相対パスが重要です。

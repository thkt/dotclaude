# スキルフォーマットガイド - 公式仕様

<https://code.claude.com/docs/en/skills> に基づくClaude Codeスキルの公式フォーマットガイド

## クイックリファレンス

### 必須フィールド

```yaml
---
name: skill-name  # 小文字、ハイフン、最大64文字
description: >
  トリガーキーワードを含む簡潔な要約。
  最大1024文字。
allowed-tools:  # オプションだが推奨
  - Read
  - Write
---
```

## 公式仕様

### YAMLフロントマター

#### `name` (必須)

- **フォーマット**: 小文字、数字、ハイフンのみ
- **最大長**: 64文字
- **例**:
  - [Good] `creating-adrs`
  - [Good] `optimizing-performance`
  - [Bad] `ADR Creator` (スペース、大文字)
  - [Bad] `adr_creator` (アンダースコアは非推奨)

---

## 命名規則 (Anthropic公式Best Practices準拠)

### 推奨: 動名詞形式 (Gerund Form)

スキル名は動名詞形式を使用してアクティビティを明確に記述:

**推奨例**:

- `processing-pdfs`
- `analyzing-spreadsheets`
- `managing-databases`
- `testing-code`
- `writing-documentation`

**現在のスキル例**:

| 動名詞形式 | 意味 |
| --- | --- |
| `creating-adrs` | ADRを作成する |
| `optimizing-performance` | パフォーマンスを最適化する |
| `reviewing-security` | セキュリティをレビューする |
| `generating-tdd-tests` | TDDテストを生成する |

### 許容: 名詞句

代替的な命名も許容:

- `pdf-processing`
- `spreadsheet-analysis`
- `database-management`

### 避けるべき

- 曖昧な名前: `helper`, `utils`, `tools`
- 過度に一般的: `documents`, `data`, `files`
- 予約語: `anthropic-helper`, `claude-tools`

### 名前フィールド要件

- 最大64文字
- 小文字、数字、ハイフンのみ
- XMLタグ禁止
- 予約語禁止 ("anthropic", "claude")

---

## 説明の要件 (Anthropic公式Best Practices準拠)

### フォーマットルール

1. **三人称のみ**
   - [Good] Good: "Processes Excel files and generates reports"
   - [Good] Good: "Extracts text from PDF documents"
   - [Bad] Avoid: "I can help you process Excel files"
   - [Bad] Avoid: "You can use this to process files"

2. **文字数制限**: 最大1024文字

3. **コンテンツ要件**:
   - **What**: スキルが何をするか
   - **When**: いつ使用するか (トリガー/コンテキスト)

4. **禁止コンテンツ**:
   - XMLタグ
   - 予約語: "anthropic", "claude"

### 例

```yaml
description: |
  Extracts text and tables from PDF files, fills forms, and merges documents.
  Use when working with PDF files or when the user mentions PDFs, forms,
  or document extraction.
```

### 説明内のトリガーキーワード

トリガーキーワードを明示的に含める:

```yaml
description: >
  Comprehensive TDD guide with RGRC cycle and test design techniques.
  Use when implementing TDD (テスト駆動開発), discussing Red-Green-Refactor,
  Baby Steps, test generation (テスト生成), or unit testing (ユニットテスト).
  Provides systematic test case generation and SOW integration.
```

---

#### `description` (必須)

- **目的**: Claudeがスキルを使用するタイミングを発見するために重要
- **最大長**: 1024文字
- **コンテンツ**: 以下を含む:
  1. 機能の簡潔な要約
  2. トリガーキーワードを明示的にリスト
  3. 主要な機能またはユースケース
- **フォーマット**: 複数行YAML文字列には `>` を使用
- **例**:

  ```yaml
  description: >
    Brief one-line summary of functionality.
    Triggers on keywords: "keyword1", "keyword2", "キーワード".
    Provides specific capabilities and use cases.
  ```

#### `allowed-tools` (オプション、推奨)

- **目的**: Claudeを指定されたツールに制限
- **フォーマット**: YAML配列
- **一般的なツール**:
  - `Read`, `Write`, `Edit`
  - `Grep`, `Glob`
  - `Bash`, `Task`
  - `mcp__*` (MCPサーバーツール)
- **ベストプラクティス**: 常に明示的に指定
- **例**:

  ```yaml
  allowed-tools:
    - Read
    - Write
    - Grep
    - Glob
    - Task
  ```

### 非公式フィールド

**重要**: 公式仕様にないフィールドは期待通りに機能しない可能性。

**これらのフィールドは使用しないこと**:

- `version`, `author`
- `triggers`, `sections`, `patterns`
- `context_size`, `full_size`
- `tokens`, `metadata`

**理由**: これらは公式仕様の一部ではなく、Claude Codeに無視される。

### 説明内のトリガーキーワード

`triggers` フィールドは非公式なので、すべてのトリガーキーワードを `description` に直接含める:

```yaml
description: >
  Main functionality description.
  Triggers on keywords: "keyword1", "keyword2", "キーワード1", "キーワード2",
  "pattern matching", "specific term", "technical jargon".
  Additional context and use cases.
```

**ヒント**:

- 該当する場合は英語と日本語の両方のキーワードを含める
- 最も重要な10-20のキーワードをリスト
- 一般的なユーザーフレーズを含める
- 技術用語と略語を追加

## ディレクトリ構造

### 単一ファイルスキル

```text
skill-name/
└── SKILL.md (必須)
```

**使用時**: スキルの要件が最小限の場合

### マルチファイルスキル (推奨)

```text
skill-name/
├── SKILL.md (必須)
├── sections/ (オプション)
│   ├── section1.md
│   └── section2.md
├── templates/ (オプション)
│   └── template.md
└── scripts/ (オプション)
    └── script.sh
```

**使用時**: スキルに補足ドキュメントやユーティリティスクリプトが必要な場合

**プログレッシブ開示**: Claudeは必要な場合にのみ補足ファイルを読み、コンテキストを効率的に管理。

## バイリンガルスキル (EN/JP)

### 構造

```text
~/.claude/
├── skills/
│   └── skill-name/
│       └── SKILL.md (英語)
└── ja/
    └── skills/
        └── skill-name/
            └── SKILL.md (日本語)
```

### 同期

- **同じ構造**: ENとJPは一致する必要がある
- **同じコンテンツ**: 翻訳されているが構造的に同一
- **同じYAML**: `name` と `allowed-tools` は同一
- **description**: 翻訳されているが同じトリガーキーワード

## ベストプラクティス

### 1. フォーカスを狭く保つ

- [Good] 1つのスキル = 1つの機能
- [Bad] 多目的な「スイスアーミーナイフ」スキルを避ける

**例**:

- [Good] `readability-review` - コード可読性のみ
- [Bad] `code-review` - 広すぎる (可読性 + セキュリティ + パフォーマンス)

### 2. 具体的な説明を書く

- [Good] 機能とトリガー用語を含める
- [Bad] 「ドキュメントを支援」のような曖昧な用語

**例**:

```yaml
# Bad: 曖昧
description: >
  Helps improve code quality.

# Good: 具体的
description: >
  Code readability review based on "The Art of Readable Code".
  Triggers on keywords: "readability", "可読性", "naming", "命名",
  "complexity", "複雑", "Miller's Law", "ミラーの法則".
  Detects readability issues and suggests improvements.
```

### 3. チームメートでテスト

- スキルが適切にアクティベートされることを検証
- トリガーキーワードが期待通りに動作することを確認
- 説明の明確さを確保

### 4. バージョンを記録

- スキル本文にバージョン履歴を追加 (YAMLではなく)
- コメントで変更を追跡
- 動作が変わったら `description` を更新

**例**:

```markdown
# スキル名

## バージョン履歴

- **2.0.0** (2025-01-15): セクションベース構造に移行
- **1.1.0** (2024-12-10): 高度なトリガーキーワードを追加
- **1.0.0** (2024-11-01): 初期リリース
```

### 5. コンテキスト効率 (公式skill-creatorより)

**原則**: "コンテキストウィンドウは公共財"

- [Good] SKILL.mdを簡潔に保つ (< 500行を推奨)
- [Good] 詳細コンテンツを `references/` または `sections/` に移動
- [Good] Claudeが既に知っていることを説明しない
- [Bad] 一般的なプログラミング知識を繰り返さない

**プログレッシブローディング**:

| ステージ | コンテンツ | ロードタイミング |
| --- | --- | --- |
| 1. メタデータ | name + description | 常に (発見用) |
| 2. SKILL.md | コア指示 | スキルアクティベート時 |
| 3. References | 詳細ガイド | 明示的参照時 |

### 6. 柔軟性レベル (公式skill-creatorより)

指示の具体性をエラーリスクに合わせる:

| レベル | フォーマット | 使用時 |
| --- | --- | --- |
| **高い柔軟性** | テキスト指示 | 複数のアプローチが有効 |
| **中程度** | 擬似コード/パラメータ | ある程度の構造が必要 |
| **低い柔軟性** | 具体的なスクリプト | エラーがコストになる |

**例**:

```markdown
# 高い柔軟性 (創造的タスク)
"ユーザーデータを魅力的に表示するコンポーネントを生成"

# 低い柔軟性 (エラーが起きやすいタスク)
"実行: scripts/generate-adr.sh --format=madr --number=auto"
```

### 7. アンチパターン: 避けるべきファイル

**これらのファイルをスキルディレクトリに含めないこと**:

- [Bad] `README.md` - すべてのドキュメントにSKILL.mdを使用
- [Bad] `INSTALLATION_GUIDE.md` - AIエージェントには不要
- [Bad] `QUICK_REFERENCE.md` - SKILL.mdにマージ
- [Bad] `CHANGELOG.md` - インラインバージョン履歴を使用

**理由**: スキルはAI実行に必要な情報のみを含むべき。
人間向けドキュメントは別の場所に。

## 一般的なパターン

### パターン1: セクションベーススキル

**ユースケース**: 複数の専門領域を持つ大規模スキル

```yaml
---
name: performance-optimization
description: >
  Frontend performance optimization with React, Web Vitals, bundle optimization.
  Triggers on keywords: "パフォーマンス", "performance", "遅い", "slow",
  "最適化", "optimization", "LCP", "FID", "CLS", "bundle size".
  Includes sections on Web Vitals, React optimization, and bundle strategies.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# Performance Optimization

## セクションベースコンテンツ

このスキルは3つの専門セクションに編成:

### セクション1: Web Vitals
**ファイル**: [`sections/web-vitals.md`](./sections/web-vitals.md)
**フォーカス**: LCP、FID、CLS最適化

### セクション2: React最適化
**ファイル**: [`sections/react-optimization.md`](./sections/react-optimization.md)
**フォーカス**: 再レンダリング削減、メモ化

### セクション3: バンドル最適化
**ファイル**: [`sections/bundle-optimization.md`](./sections/bundle-optimization.md)
**フォーカス**: コード分割、ツリーシェイキング
```

### パターン2: テンプレートベーススキル

**ユースケース**: テンプレートからファイルを生成するスキル

```yaml
---
name: adr-creator
description: >
  Architecture Decision Record creator with MADR format templates.
  Triggers on keywords: "ADR", "Architecture Decision", "決定記録",
  "技術選定", "create ADR", "document decision".
  6-phase process: validation, template selection, reference collection.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---

# ADR Creator

## 利用可能なテンプレート

- `templates/technology-selection.md`
- `templates/architecture-pattern.md`
- `templates/default.md`
```

### パターン3: ワークフロー自動化スキル

**ユースケース**: プロジェクト固有の自動化

```yaml
---
name: esa-daily-report
description: >
  Automatic daily report creator for esa.io with Google Calendar integration.
  Triggers on keywords: "日報", "daily report", "振り返り", "reflection",
  "今日の記録", "today's summary", "esa".
  Streamlines daily reporting by auto-fetching calendar events.
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---

# esa日報作成

## 設定

スキル本文または外部設定ファイルにデフォルト設定。
```

## 検証チェックリスト

スキルをコミットする前に:

### YAMLフロントマター

- [ ] `name` は小文字とハイフンのみ
- [ ] `name` は64文字以下
- [ ] `description` は1024文字以下
- [ ] `description` にトリガーキーワードを含む
- [ ] `allowed-tools` が指定されている (推奨)
- [ ] 非公式フィールドなし (`version`, `triggers` 等)

### コンテンツ

- [ ] スキルに明確で狭いフォーカスがある
- [ ] 指示がステップバイステップ
- [ ] 例が使い方をデモ
- [ ] 関連ファイルが正しく参照されている

### バイリンガル (該当する場合)

- [ ] 日本語版が存在
- [ ] 構造が英語版と一致
- [ ] YAMLフィールドが同期
- [ ] すべてのトリガーキーワードが翻訳済み

### テスト

- [ ] スキルが期待されるキーワードでアクティベート
- [ ] ツールが許可通りに機能
- [ ] Claude Codeでエラーなし

## 移行ガイド

### 非公式フォーマットから

非公式フィールドを持つスキルがある場合:

1. **非公式フィールドをYAMLから削除**:

   ```diff
   ---
   name: skill-name
   description: >
     ...
   - version: 1.0.0
   - triggers:
   -   keywords: [...]
   allowed-tools:
     - Read
   ---
   ```

2. **トリガーキーワードを `description` に移動**:

   ```yaml
   description: >
     Main functionality.
     Triggers on keywords: "keyword1", "keyword2", "キーワード".
   ```

3. **セクションを本文でドキュメント化** (セクションベース構造を使用している場合):

   ```markdown
   ## セクションベースコンテンツ

   - セクション1: [sections/section1.md](./sections/section1.md) - 説明
   - セクション2: [sections/section2.md](./sections/section2.md) - 説明
   ```

4. **ディレクトリ構造を維持**:
   - `sections/`, `templates/` 等は引き続き有効
   - YAMLフロントマターのみ更新が必要

## 関連ドキュメント

- [公式スキルガイド](https://code.claude.com/docs/en/skills)
- [スキル vs スラッシュコマンド](https://code.claude.com/docs/en/slash-commands#skills-vs-slash-commands)
- [プラグイン (プラグインスキル)](https://code.claude.com/docs/en/plugins)

---

**最終更新**: 2025-11-12
**基準**: Claude Code公式ドキュメント (<https://code.claude.com/docs/en/skills>)

# スキルフォーマットガイド - 公式仕様

Claude Code Skillsの公式フォーマットガイド（<https://code.claude.com/docs/en/skills> 基準）

## クイックリファレンス

### 必須フィールド

```yaml
---
name: skill-name  # 小文字、ハイフン、最大64文字
description: >
  トリガーキーワードを含む簡潔な概要。
  最大1024文字。
allowed-tools:  # オプションだが推奨
  - Read
  - Write
---
```

## 公式仕様

### YAML Front Matter

#### `name` （必須）

- **形式**: 小文字、数字、ハイフンのみ
- **最大長**: 64文字
- **例**:
  - ✅ `adr-creator`
  - ✅ `pre-task-check`
  - ❌ `ADR Creator` （スペース、大文字）
  - ❌ `adr_creator` （アンダースコアは非推奨）

#### `description` （必須）

- **目的**: Claudeがいつスキルを使用すべきかを発見するために重要
- **最大長**: 1024文字
- **内容**: 以下を含むべき：
  1. 簡潔な機能概要
  2. トリガーキーワードの明示的なリスト
  3. 主要な機能またはユースケース
- **形式**: 複数行のYAML文字列には `>` を使用
- **例**:

  ```yaml
  description: >
    機能の簡潔な1行要約。
    トリガーキーワード: "keyword1", "keyword2", "キーワード"。
    具体的な機能とユースケースを提供。
  ```

#### `allowed-tools` （オプション、推奨）

- **目的**: Claudeを指定されたツールに制限
- **形式**: YAML配列
- **一般的なツール**:
  - `Read`, `Write`, `Edit`
  - `Grep`, `Glob`
  - `Bash`, `Task`
  - `mcp__*` （MCPサーバーツール）
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

**重要**: 公式仕様にないフィールドは期待通りに機能しない可能性があります。

❌ **これらのフィールドは使用しない**:

- `version`, `author`
- `triggers`, `sections`, `patterns`
- `context_size`, `full_size`
- `tokens`, `metadata`

**理由**: これらは公式仕様の一部ではなく、Claude Codeに無視されます。

### descriptionでのトリガーキーワード

`triggers`フィールドは非公式なので、すべてのトリガーキーワードを`description`に直接含めます：

```yaml
description: >
  主な機能の説明。
  トリガーキーワード: "keyword1", "keyword2", "キーワード1", "キーワード2",
  "pattern matching", "specific term", "technical jargon"。
  追加のコンテキストとユースケース。
```

**ヒント**:

- 英語と日本語のキーワードを含める
- 最も重要な10-20個のキーワードをリスト
- 一般的なユーザーフレーズを含める
- 技術用語や頭字語を追加

## ディレクトリ構造

### 単一ファイルスキル

```text
skill-name/
└── SKILL.md （必須）
```

**使用タイミング**: スキルの要件が最小限の場合

### マルチファイルスキル（推奨）

```text
skill-name/
├── SKILL.md （必須）
├── sections/ （オプション）
│   ├── section1.md
│   └── section2.md
├── templates/ （オプション）
│   └── template.md
└── scripts/ （オプション）
    └── script.sh
```

**使用タイミング**: 補足ドキュメントやユーティリティスクリプトが必要な場合

**プログレッシブディスクロージャ**: Claudeは必要な時だけ補足ファイルを読み取り、コンテキストを効率的に管理します。

## バイリンガルスキル（英語/日本語）

### 構造

```text
~/.claude/
├── skills/
│   └── skill-name/
│       └── SKILL.md （英語）
└── ja/
    └── skills/
        └── skill-name/
            └── SKILL.md （日本語）
```

### 同期

- **同じ構造**: 英語と日本語は一致する必要あり
- **同じ内容**: 翻訳されているが、構造的に同一
- **同じYAML**: `name`と`allowed-tools`は同一
- **description**: 翻訳されているが、同じトリガーキーワード

## ベストプラクティス

### 1. 焦点を絞る

- ✅ 1スキル = 1つの機能
- ❌ 多目的な「スイスアーミーナイフ」スキルを避ける

**例**:

- ✅ `readability-review` - コード可読性のみ
- ❌ `code-review` - 広すぎる（可読性 + セキュリティ + パフォーマンス）

### 2. 具体的な説明を書く

- ✅ 機能とトリガー用語を含める
- ❌ 「ドキュメントを改善する」のような曖昧な用語

**例**:

```yaml
# ❌ 曖昧
description: >
  コード品質を改善します。

# ✅ 具体的
description: >
  「リーダブルコード」に基づくコード可読性レビュー。
  トリガーキーワード: "readability", "可読性", "naming", "命名",
  "complexity", "複雑", "Miller's Law", "ミラーの法則"。
  可読性の問題を検出し、改善を提案。
```

### 3. チームメンバーでテスト

- スキルが適切にアクティブ化されることを確認
- トリガーキーワードが期待通り動作することを確認
- 説明の明確性を確認

### 4. バージョンを記録

- スキル本文にバージョン履歴を追加（YAMLではない）
- コメントで変更を追跡
- 動作が変わったら`description`を更新

**例**:

```markdown
# スキル名

## バージョン履歴

- **2.0.0** (2025-01-15): セクションベース構造に移行
- **1.1.0** (2024-12-10): 高度なトリガーキーワードを追加
- **1.0.0** (2024-11-01): 初回リリース
```

## 一般的なパターン

### パターン1: セクションベーススキル

**ユースケース**: 複数の専門領域を持つ大規模スキル

```yaml
---
name: performance-optimization
description: >
  React、Web Vitals、バンドル最適化によるフロントエンドパフォーマンス最適化。
  トリガーキーワード: "パフォーマンス", "performance", "遅い", "slow",
  "最適化", "optimization", "LCP", "FID", "CLS", "bundle size"。
  Web Vitals、React最適化、バンドル戦略のセクションを含む。
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# Performance Optimization

## セクションベースのコンテンツ

このスキルは3つの専門セクションに分かれています：

### セクション1: Web Vitals
**ファイル**: [`sections/web-vitals.md`](./sections/web-vitals.md)
**焦点**: LCP、FID、CLS最適化

### セクション2: React最適化
**ファイル**: [`sections/react-optimization.md`](./sections/react-optimization.md)
**焦点**: 再レンダリング削減、メモ化

### セクション3: バンドル最適化
**ファイル**: [`sections/bundle-optimization.md`](./sections/bundle-optimization.md)
**焦点**: コード分割、tree shaking
```

### パターン2: テンプレートベーススキル

**ユースケース**: テンプレートからファイルを生成するスキル

```yaml
---
name: adr-creator
description: >
  MADR形式テンプレートを使用したArchitecture Decision Record作成。
  トリガーキーワード: "ADR", "Architecture Decision", "決定記録",
  "技術選定", "create ADR", "document decision"。
  6段階プロセス: 検証、テンプレート選択、参照収集。
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
  Google Calendar統合によるesa.io自動日報作成。
  トリガーキーワード: "日報", "daily report", "振り返り", "reflection",
  "今日の記録", "today's summary", "esa"。
  カレンダーイベントの自動取得により日報作成を効率化。
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---

# esa Daily Report Creator

## 設定

デフォルト設定をスキル本文または外部設定ファイルに記載。
```

## 検証チェックリスト

スキルをコミットする前に：

### YAML Front Matter

- [ ] `name`はハイフン付き小文字のみ
- [ ] `name`は64文字以下
- [ ] `description`は1024文字以下
- [ ] `description`にトリガーキーワードを含む
- [ ] `allowed-tools`を指定（推奨）
- [ ] 非公式フィールド（`version`、`triggers`等）がない

### コンテンツ

- [ ] スキルの焦点が明確で狭い
- [ ] 指示がステップバイステップ
- [ ] 使用例がある
- [ ] 関連ファイルが正しく参照されている

### バイリンガル（該当する場合）

- [ ] 日本語版が存在
- [ ] 構造が英語版と一致
- [ ] YAMLフィールドが同期されている
- [ ] すべてのトリガーキーワードが翻訳されている

### テスト

- [ ] 期待されるキーワードでスキルがアクティブ化
- [ ] ツールが許可通りに機能
- [ ] Claude Codeでエラーがない

## 移行ガイド

### 非公式フォーマットからの移行

非公式フィールドを持つスキルがある場合：

1. **非公式フィールドを削除**:

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

2. **トリガーキーワードを`description`に移動**:

   ```yaml
   description: >
     主な機能。
     トリガーキーワード: "keyword1", "keyword2", "キーワード"。
   ```

3. **本文でセクションを文書化**（セクションベース構造を使用している場合）:

   ```markdown
   ## セクションベースのコンテンツ

   - セクション1: [sections/section1.md](./sections/section1.md) - 説明
   - セクション2: [sections/section2.md](./sections/section2.md) - 説明
   ```

4. **ディレクトリ構造を維持**:
   - `sections/`、`templates/`等は有効
   - YAML front matterのみ更新が必要

## 関連ドキュメント

- [公式Skillsガイド](https://code.claude.com/docs/en/skills)
- [Skills vs Slash Commands](https://code.claude.com/docs/en/slash-commands#skills-vs-slash-commands)
- [Plugins（プラグインスキル）](https://code.claude.com/docs/en/plugins)

---

**最終更新**: 2025-11-12
**基準**: Claude Code公式ドキュメント（<https://code.claude.com/docs/en/skills）>

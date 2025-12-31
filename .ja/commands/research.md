---
description: 実装なしでプロジェクトリサーチと技術調査を実行
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task
model: inherit
argument-hint: "[リサーチトピックまたは質問]"
dependencies: [Explore]
---

# /research - プロジェクトリサーチ＆調査

## 目的

信頼度ベースの発見（✓/→/?）でコードベースを調査、実装なし。

## 動的プロジェクト探索

### 最近のアクティビティ

```bash
!`git log --oneline -10 || echo "Not a git repository"`
```

### 技術スタック

```bash
!`ls -la package.json pyproject.toml go.mod Cargo.toml 2>/dev/null | head -5 || echo "No standard project files"`
```

### 変更されたファイル

```bash
!`git diff --name-only HEAD~1 2>/dev/null | head -10 || echo "No recent changes"`
```

### テストフレームワーク

```bash
!`grep -E "jest|mocha|vitest|pytest" package.json 2>/dev/null | head -3 || echo "No test framework detected"`
```

## リサーチプロセス

### フェーズ1: スコープ発見（30秒）

- プロジェクト構造とパターン
- フレームワーク、ライブラリ、ツール
- エントリーポイントとAPI

### フェーズ2: 調査（1-3分）

- Taskエージェント経由で並行検索を実行
- 依存関係と関連性を追跡
- ドキュメントと主要ファイルを読む

### フェーズ3: 統合（1分）

- 発見を信頼度でスコアリング
- パターンと関係性を特定
- 不明点を明示的に記録

## 信頼度マーカー

すべての発見で使用:

- **[✓]** 高 (>0.8) - コード/ファイルから直接検証
- **[→]** 中 (0.5-0.8) - 証拠からの妥当な推論
- **[?]** 低 (<0.5) - 検証が必要な仮定

## Taskエージェントの使用

### ステップ1: Exploreエージェントで概要把握

まず、コードベースの概要を把握:

```typescript
Task({
  subagent_type: "Explore",
  description: "コードベース概要",
  prompt: `
    徹底度: medium (選択肢: quick | medium | very thorough)
    トピック: "${researchTopic}"

    調査内容:
    1. アーキテクチャ: 構造、エントリーポイント [✓]
    2. 技術スタック: フレームワーク、バージョン [✓]
    3. 主要コンポーネント: モジュール、API [→]
    4. パターン: 規約、プラクティス [→]
    5. 不明点: 検証が必要なもの [?]

    信頼度マーカー（✓/→/?）付きで発見を返す。
  `
})
```

### ステップ2: code-explorerエージェントで深掘り

次に、2-3個のcode-explorerエージェントを並列起動して詳細分析:

```typescript
// エージェント1: 類似機能
Task({
  subagent_type: "feature-dev:code-explorer",
  description: "類似機能を発見",
  prompt: `
    トピック: "${researchTopic}"

    このトピックに類似した機能を見つけ、その実装を包括的にトレース。

    出力:
    - file:line参照付きのエントリーポイント
    - ステップバイステップの実行フロー
    - 主要コンポーネントと責務
    - 読むべき重要ファイル5-10個のリスト
  `
})

// エージェント2: アーキテクチャマッピング
Task({
  subagent_type: "feature-dev:code-explorer",
  description: "アーキテクチャをマップ",
  prompt: `
    トピック: "${researchTopic}"

    この領域のアーキテクチャと抽象化をマップし、コードを包括的にトレース。

    出力:
    - アーキテクチャ層（プレゼンテーション → ビジネス → データ）
    - デザインパターンと決定
    - 依存関係と統合
    - 読むべき重要ファイル5-10個のリスト
  `
})

// エージェント3: 現在の実装（該当する場合）
Task({
  subagent_type: "feature-dev:code-explorer",
  description: "現在の実装を分析",
  prompt: `
    トピック: "${researchTopic}"

    関連機能の現在の実装を分析。

    出力:
    - データフローと変換
    - 状態変更と副作用
    - エラーハンドリングパターン
    - 読むべき重要ファイル5-10個のリスト
  `
})
```

### ステップ3: 統合

1. **特定されたファイルをすべて読む** - エージェント出力から深い理解を構築
2. **発見を統合** - Exploreの概要 + code-explorerの詳細を組み合わせ
3. **不明点を記録** - 検証が必要なギャップを明示的にリスト

## 出力要件

### テンプレート参照

**構造のみ**に使用:
[@~/.claude/templates/research/context.md]

**重要**:

- コピー: セクション構造、マーカー使用（✓/→/?）、フォーマット
- コピーしない: 参照の実際のコンテンツ

### 必須セクション

1. **目的** - このリサーチの理由
2. **前提条件** - 事実 [✓]、仮定 [→]、不明 [?]
3. **利用可能なデータ** - ファイル、スタック、既存実装
4. **制約** - セキュリティ、パフォーマンス、互換性
5. **主要な発見** - 信頼度付きでサマリー
6. **参照** - 詳細ドキュメントへのリンク

## 永続的なドキュメント

**常に2つのファイルを保存**:

### 1. 詳細な発見

```text
.claude/workspace/research/YYYY-MM-DD-[topic].md
```

すべての発見を含む完全なリサーチレポート。

### 2. コンテキストファイル（/think統合用）

```text
.claude/workspace/research/YYYY-MM-DD-[topic]-context.md
```

Golden Masterフォーマットに従った構造化コンテキスト。

保存後に表示:

```text
📄 リサーチ保存:
   発見: .claude/workspace/research/[date]-[topic].md
   コンテキスト: .claude/workspace/research/[date]-[topic]-context.md
```

## ベストプラクティス

1. **広く始める** - 深掘り前に概要
2. **並行検索** - 5+検索にはTaskエージェント
3. **信頼度をマーク** - すべての発見に✓/→/?
4. **証拠を引用** - file:line参照を含める
5. **不明を認める** - ギャップを明示的に[?]でリスト
6. **コンテキストを保存** - /think用にコンテキストファイルを常に生成

## 使用例

```bash
# トピックベースのリサーチ（深度は自動選択）
/research "認証システム"

# クイック概要を強制
/research --quick "API構造"

# 深い分析を強制
/research --deep "完全なアーキテクチャ"

# トピックなし（現在のプロジェクトを探索）
/research
```

## 次のステップ

リサーチ後:

- **計画が必要** → `/think`（コンテキストファイルを自動検出）
- **問題を発見** → `/fix` で対象を絞った解決策
- **構築準備完了** → `/code` で実装

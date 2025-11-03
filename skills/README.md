# Claude Agent Skills - 使い方ガイド

## 概要

このディレクトリには、Claude Codeで使用するSkillsが含まれています。Skillsは**知識ベース、ガイド、および自動化ワークフロー**を提供する機能です。

## Skillsとは？

Skillsは以下の目的で使用されます:

- **教育的コンテンツ**: ベストプラクティス、設計原則、実装パターンの体系的ガイド
- **知識ベース**: プロジェクト横断的に再利用可能な技術知識
- **プロジェクト固有の自動化**: 特定の環境やワークフローに特化した自動化

## Commands, Agents, Skillsの使い分け

### 📋 Commands
**役割**: ユーザーが直接呼び出すワークフロー

- `/review` → コードレビューのオーケストレーション
- `/adr` → ADR作成フロー
- `/code` → TDD/RGRC実装

**特徴**: 薄いラッパー、SkillsやAgentsを調整

### 🤖 Agents
**役割**: 専門的な分析・レビュー（Commandsから呼ばれる）

- `performance-reviewer` → パフォーマンス分析
- `accessibility-reviewer` → アクセシビリティ検証
- `type-safety-reviewer` → 型安全性チェック

**特徴**: 特定タスクの実行、短期的、Skillsを参照可能

### 📚 Skills
**役割**: 知識ベース・ガイド・自動化

- `performance-optimization` → 最適化知識
- `progressive-enhancement` → 設計原則
- `adr-creator` → ADR作成ガイド
- `esa-daily-report` → プロジェクト固有の自動化

**特徴**: 永続的な知識、教育的、再利用可能

## Skillsが適している場面

### ✅ Skillsを作成すべき場合

1. **教育的コンテンツ**
   - ベストプラクティスの体系的解説
   - 設計原則の詳細ガイド
   - 実装パターン集

2. **知識ベース**
   - プロジェクト横断的な技術知識
   - チームメンバーの学習リソース
   - 「なぜ」を説明するコンテンツ

3. **プロジェクト固有の自動化**
   - 環境依存のワークフロー
   - 外部API連携
   - 特定のツール統合

4. **コンテキスト自動拡張**
   - キーワードトリガーで自動的に知識を提供
   - 会話の流れで暗黙的に活性化

### ❌ Skillsに含めるべきでないもの

- **ワークフロー実行** → Commandsへ
- **専門的なレビュー** → Agentsへ
- **一時的なタスク** → 直接実行

## 現在のSkills一覧

### 知識ベース系

#### performance-optimization
**目的**: パフォーマンス最適化の体系的ガイド

- Web Vitals (LCP, FID, CLS) の詳細解説
- React最適化パターン
- バンドルサイズ最適化
- 測定ツールの使い方

**使い方**: 「パフォーマンス」「遅い」「最適化」などのキーワードで自動トリガー

**Agentとの連携**: `performance-reviewer`エージェントがこのSkillの知識を参照

#### progressive-enhancement
**目的**: CSS-firstアプローチの設計原則ガイド

- HTML → CSS → JavaScriptの優先順位
- CSS-onlyソリューション集
- プログレッシブエンハンスメントパターン

**使い方**: 「レイアウト」「スタイル」「アニメーション」などのキーワードで自動トリガー

#### adr-creator
**目的**: Architecture Decision Record作成の詳細プロセスガイド

- MADR形式のADR作成6段階プロセス
- 事前チェック、テンプレート選択、参照元収集
- 検証チェックリスト、索引更新

**使い方**: `/adr`コマンドがこのSkillを参照

### プロジェクト固有系

#### esa-daily-report
**目的**: esa.io日報作成の自動化

- Google Calendar連携
- テンプレートベースの日報生成
- WIP投稿の自動作成

**使い方**: 「日報」「daily report」などのキーワードで自動トリガー

**注意**: プロジェクト固有のため、`.gitignore`に含まれる

## Skillの作成ガイドライン

### 基本構造

```markdown
skills/
└── your-skill-name/
    ├── SKILL.md          # メイン定義ファイル
    ├── templates/        # テンプレート（必要に応じて）
    ├── scripts/          # スクリプト（必要に応じて）
    └── examples/         # 実例（必要に応じて）
```

### SKILL.mdの必須要素

```yaml
---
name: your-skill-name
description: >
  Skillの目的と機能を簡潔に記述。
  トリガーキーワードも含める。
---

# Skill Name

## 目的
このSkillが解決する問題や提供する価値

## いつ使うべきか
- 具体的な使用シーン

## 使い方
- 基本的な呼び出し方法

## 内容
- 詳細なガイド、実装例、ベストプラクティス
```

## 協調動作の例

### Performance最適化の協調動作

```text
User: "このページが遅い"
    ↓
Skill (auto-trigger): performance-optimization
    → Web Vitalsの知識を提供
    → 測定方法を提案
    ↓
User: "/review"
    ↓
Command: /review
    ↓
Agent: performance-reviewer
    → 実際のコードを分析
    → performance-optimization skillを参照
    → ボトルネックを特定
    ↓
Output: 具体的な改善提案
    （Skillの知識 + Agentの分析）
```

### Security関連の協調動作

```text
User: "セキュリティをレビューして"
    ↓
Command: /review
    ↓
/review が security-review skillを参照
    → OWASP Top 10の知識を活用
    → 脆弱性パターンを検出
    ↓
Output: セキュリティレビュー結果
    （Skillの知識ベースに基づく分析）
```

## よくある質問

### Q: SkillとAgentの違いは？

**Skill**: 永続的な知識、教育的コンテンツ、暗黙的トリガー
**Agent**: 特定タスクの実行、明示的呼び出し、短期的

### Q: いつSkillを作るべき？

以下の条件に当てはまる場合:
- プロジェクト横断的に再利用できる
- 「なぜ」を説明する教育的価値がある
- チームメンバーの学習リソースになる
- キーワードベースの自動トリガーが有用

### Q: Commandとの違いは？

**Command**: ユーザーが明示的に呼び出すワークフロー実行
**Skill**: 知識提供、Commandから参照される、または自動トリガー

### Q: 既存のSkillをカスタマイズしたい

1. Skillディレクトリ内のファイルを直接編集
2. テンプレートファイルを修正（例: `templates/default.md`）
3. SKILL.mdの設定を調整

### Q: プロジェクト固有のSkillを作りたい

1. `skills/your-project-skill/`を作成
2. `.gitignore`に追加（他プロジェクトで不要な場合）
3. SKILL.mdで環境依存の設定を明記

## 関連ドキュメント

- [COMMANDS.md](../docs/COMMANDS.md) - Commandsの詳細
- [CLAUDE.md](../CLAUDE.md) - グローバル設定とルール
- [Agent Skills公式ドキュメント](https://docs.claude.com/)

## メンテナンス

### 定期レビュー

- **月次**: Skillsの使用頻度を確認
- **四半期**: 内容の陳腐化をチェック
- **必要時**: 新しい知識やベストプラクティスを追加

### 更新時の注意

1. **SKILL.mdの変更**: 説明やトリガーキーワードの更新
2. **テンプレートの変更**: 後方互換性を考慮
3. **依存関係**: CommandsやAgentsへの影響を確認

---

**最終更新**: 2025-11-01

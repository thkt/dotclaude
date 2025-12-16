# Agents Directory

## 概要

Claude Codeで使用するAgentの定義ファイルを格納するディレクトリ。

## ディレクトリ構造

```text
agents/
├── README.md                    # このファイル
├── MODEL_SELECTION_GUIDE.md     # モデル選択ガイド
├── reviewers/                   # コードレビューエージェント
│   ├── _base-template.md        # レビュアー共通テンプレート
│   ├── accessibility.md
│   ├── design-pattern.md
│   ├── document.md
│   ├── performance.md
│   ├── readability.md
│   ├── root-cause.md
│   ├── structure.md
│   ├── subagent.md
│   ├── testability.md
│   └── type-safety.md
├── generators/                  # コード/コンテンツ生成
│   └── test.md
├── orchestrators/               # 調整・統合
│   └── audit-orchestrator.md
├── enhancers/                   # コード改善
│   └── progressive.md
└── git/                         # Git操作
    ├── branch-generator.md
    ├── commit-generator.md
    └── pr-generator.md
```

## Agent ファイル形式

すべてのAgentは YAML frontmatter + Markdown 形式:

```yaml
---
name: agent-name              # 必須: kebab-case
description: >                # 必須: 複数行説明
  English description.
  日本語説明。
tools: Read, Grep, Task       # 必須: 使用可能ツール
model: sonnet                 # 任意: haiku|sonnet|opus
skills:                       # 任意: 参照スキル
  - skill-name
---

# Agent Content

[Markdown content with instructions]
```

## 新規Agent作成手順

1. **モデル選択**: [MODEL_SELECTION_GUIDE.md](./MODEL_SELECTION_GUIDE.md) を参照
2. **テンプレート選択**: カテゴリに応じた base-template を使用
3. **YAML frontmatter 記述**: name, description, tools は必須
4. **適切なディレクトリに配置**: カテゴリに応じて
5. **動作確認**: Task tool で呼び出しテスト

## Agent Discovery

Agentは以下の方法で動的に発見される:

- **Glob**: `~/.claude/agents/**/*.md`
- **識別子**: YAML frontmatter の `name` フィールド
- **呼び出し**: `subagent_type` パラメータで指定

## カテゴリ説明

| カテゴリ | 用途 | 推奨モデル |
|----------|------|-----------|
| reviewers | コードレビュー・分析 | sonnet/haiku |
| generators | コンテンツ生成 | haiku/sonnet |
| orchestrators | 複数エージェント調整 | opus |
| enhancers | コード改善・最適化 | sonnet |
| git | Git操作自動化 | haiku |

## 関連ドキュメント

- [MODEL_SELECTION_GUIDE.md](./MODEL_SELECTION_GUIDE.md) - モデル選択基準
- [reviewers/_base-template.md](./reviewers/_base-template.md) - レビュアーテンプレート
- [Skills README](../skills/README.md) - スキルとの連携

---
name: creating-adrs
description: >
  MADR形式でのADR作成。トリガー: ADR, Architecture Decision,
  決定記録, 技術選定, アーキテクチャ決定, design decision, 技術的決定, 設計判断,
  deprecation, 非推奨化, process change, プロセス変更
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

# ADR Creator

## 目的

MADR形式のArchitecture Decision Recordを6段階プロセスで作成。

## 6段階プロセス概要

| Phase | 目的 | 主なアクション |
| --- | --- | --- |
| 1. Pre-Check | 重複防止 | 既存ADR確認、命名検証、ディレクトリ確認 |
| 2. Template | 構造選択 | 4テンプレートから決定タイプに基づき選択 |
| 3. References | 証拠収集 | プロジェクトドキュメント、Issue、PR、外部リソース |
| 4. Validate | 品質保証 | 必須セクション確認、完全性チェック |
| 5. Index | ドキュメント更新 | ADRリスト自動生成、関連ADRのクロスリンク |
| 6. Recovery | エラー処理 | パス自動修正、フォールバックテンプレート |

## テンプレート選択

| テンプレート | ユースケース | 必須セクション |
| --- | --- | --- |
| technology-selection | ライブラリ、フレームワーク選定 | オプション(3つ以上)、Pros/Cons |
| architecture-pattern | 構造、設計ポリシー | Context, Consequences |
| process-change | ワークフロー、ルール変更 | Before/After比較 |
| deprecation | 技術の廃止 | 移行計画、タイムライン |

## Phase詳細

| Phase | 主なアクション |
| --- | --- |
| 1. Pre-Check | `ls docs/adr/*.md`、重複確認、次の番号取得 |
| 2. Template | キーワードをテンプレートタイプにマッチング |
| 3. References | プロジェクトドキュメント、Issue、外部リソース収集 |
| 4. Validate | 必須セクション確認（Title, Status, Context, Decision, Consequences） |
| 5. Index | `docs/adr/README.md` 自動生成 |
| 6. Recovery | ディレクトリ不足、重複、セクション不足の処理 |

## Skill vs Rule 判断

| 観点 | /adr:rule | /adr:skill |
| --- | --- | --- |
| 目的 | 制約の強制 | パターンの提案 |
| 適用 | 常時アクティブ | キーワードでトリガー |
| 出力 | docs/rules/ | .claude/skills/ |

**rule使用**: セキュリティ要件、絶対的制約
**skill使用**: 実装パターン、コンテキスト依存ガイダンス

## ベストプラクティス

| 実践 | 推奨 | 非推奨 |
| --- | --- | --- |
| トリガー | 具体的用語: "React Query", "useQuery" | 汎用: "code", "implement" |
| 例 | プロジェクト固有コード | 汎用サンプル |
| チェックリスト | 実行可能な項目 | 曖昧なガイダンス |
| 更新 | ADR変更時に再生成 | 古いスキルを維持 |

## ディレクトリ構造

```text
docs/adr/
├── README.md          # 自動生成インデックス
├── 0001-*.md         # 連番
└── 0002-*.md

.claude/skills/
├── adr-0001-*/       # 生成されたスキル
│   └── SKILL.md
└── adr-0002-*/
    └── SKILL.md
```

## 参照

- [MADR Official](https://adr.github.io/madr/)
- [@~/.claude/commands/adr.md](~/.claude/commands/adr.md) - /adr コマンド
- [@~/.claude/commands/adr/skill.md](~/.claude/commands/adr/skill.md) - /adr:skill クイックリファレンス

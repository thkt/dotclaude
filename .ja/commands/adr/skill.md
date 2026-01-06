---
description: >
  ADRからプロジェクト固有のスキルを生成し、コンテキストに応じた実装ガイダンスを提供。
allowed-tools: Read, Write, Edit, Bash(ls:*), Bash(mkdir:*), Grep, Glob
model: inherit
argument-hint: "[ADR番号]"
---

# /adr:skill - ADRからスキル生成

## 目的

Architecture Decision Record（ADR）を自動トリガー付き実装ガイダンスを持つ実行可能なスキル形式に変換。

## 使用方法

```bash
/adr:skill <ADR-number> [options]

# 例
/adr:skill 0001              # プロジェクト固有スキル
/adr:skill 0001 --global     # グローバルスキル（~/.claude/skills/）
/adr:skill 12 --name api-fetching  # カスタム名
```

**オプション:**

| オプション | 説明 |
| --- | --- |
| `--global` | `~/.claude/skills/`に作成 |
| `--name <name>` | 自動生成名を上書き |
| `--preview` | 保存せずに表示 |

## クイックリファレンス

### スキル vs ルールの判断

| 観点 | /rulify | /adr:skill |
| --- | --- | --- |
| 目的 | 制約を強制 | パターンを提案 |
| 適用 | 常時アクティブ | キーワードでトリガー |
| 出力先 | docs/rules/ | .claude/skills/ |
| 用途 | セキュリティ、絶対的ルール | 実装パターン |

### 使用タイミング

**/adr:skillを使用:**

- 実装パターン（「HOW TO」）
- コンテキスト依存のガイダンス
- 詳細な例が必要

**/rulifyを使用:**

- 絶対的制約（「MUST NOT」）
- セキュリティ要件
- 常時強制ルール

### 両方が共存可能

```bash
/rulify 0001     # "React Queryを使用必須"
/adr:skill 0001  # "React Queryの使い方"
```

## 実行サマリー

1. **ADRを読み込み** - タイトル、コンテキスト、決定、結果を解析
2. **キーワードを抽出** - トリガーワードを自動検出（EN + JA）
3. **スキルを生成** - テンプレートでSKILL.mdを作成
4. **検証** - 重複をチェック、キーワードを確認
5. **保存** - `.claude/skills/adr-NNNN-*/`に書き込み

## 出力

```text
✅ スキル生成完了

📄 ソース: docs/adr/0001-use-react-query.md
🎯 スキル: .claude/skills/adr-0001-use-react-query/SKILL.md
🔑 トリガー: React Query, API, fetch, データ取得
```

## 詳細リファレンス

完全な実行フロー、テンプレート、エラーハンドリングについて:

[@../../../skills/creating-adrs/SKILL.md](~/.claude/skills/creating-adrs/SKILL.md)

## 関連コマンド

- `/adr [title]` - ADRを作成
- `/rulify <number>` - 強制ルールを生成
- `/research` - ADR用の技術リサーチ

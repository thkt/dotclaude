---
description: MADR形式でアーキテクチャ決定記録（ADR）を自動採番で作成
allowed-tools: Read, Write, Bash(ls:*), Bash(cat:*), Bash($HOME/.claude/skills/creating-adrs/scripts/*), Grep, Glob
model: opus
argument-hint: "[決定タイトル]"
---

# /adr - アーキテクチャ決定記録作成

MADR形式で自動採番付きADRを作成。

## 入力

- 決定タイトル: `$1`（「XをYに採用」のような具体的アクション）
- `$1`が空の場合 → AskUserQuestionで確認
- 前提条件: `adr/`ディレクトリ（なければ作成）

## Skills

| 名前          | 目的                           |
| ------------- | ------------------------------ |
| creating-adrs | テンプレート、検証、スクリプト |

## 出力

- `adr/XXXX-slug.md`（ADRファイル）
- `adr/README.md`（インデックス更新）

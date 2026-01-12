---
description: MADR形式でアーキテクチャ決定記録（ADR）を自動採番で作成
allowed-tools: Read, Write, Bash(ls:*), Bash(cat:*), Bash(~/.claude/skills/creating-adrs/scripts/*), Grep, Glob
model: opus
argument-hint: "[決定タイトル]"
dependencies: [creating-adrs, managing-documentation]
---

# /adr - アーキテクチャ決定記録作成

MADR形式で自動採番付きADRを作成。

## 入力

- 引数: 決定タイトル（必須、「XをYに採用」のような具体的アクション）
- 未指定時: AskUserQuestionで確認
- 前提条件: `adr/`ディレクトリ（なければ作成）

## 実行

`creating-adrs`スキルに委譲（テンプレート、検証、スクリプトはそちらで定義）。

## 出力

- `adr/XXXX-slug.md`（ADRファイル）
- `adr/README.md`（インデックス更新）

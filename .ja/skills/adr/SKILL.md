---
name: adr
description: MADR形式でアーキテクチャ決定記録（ADR）を自動採番で作成。ユーザーがADR作成, 技術決定, アーキテクチャ決定, decision record等に言及した場合に使用。
allowed-tools: Read, Write, Grep, Glob, LS, AskUserQuestion
model: opus
argument-hint: "[決定タイトル]"
user-invocable: true
---

# /adr - アーキテクチャ決定記録作成

MADR形式で自動採番付きADRを作成。

## 入力

- 決定タイトル: `$1`（「XをYに採用」のような具体的アクション）
- `$1`が空の場合 → AskUserQuestionで選択
- 前提条件: `adr/`ディレクトリ（なければ作成）

### タイトルプロンプト

| 質問     | 選択肢                |
| -------- | --------------------- |
| 決定種別 | 新規決定 / 既存を更新 |

「既存を更新」→ `adr/` 内の最近のADRをAskUserQuestionで一覧表示。

## Skills

| 名前          | 目的                           |
| ------------- | ------------------------------ |
| creating-adrs | テンプレート、検証、スクリプト |

## 出力

- `adr/XXXX-slug.md`（ADRファイル）
- `adr/README.md`（インデックス更新）

---
name: integrating-storybook
description: >
  spec.mdとのStorybook統合。Component APIからStoriesを自動生成。
  トリガー: storybook, stories, component api, props, argTypes, variants, csf3.
allowed-tools: [Read, Write, Glob, Grep]
---

# Storybook統合

spec.mdのComponent API仕様からStoriesスケルトンを自動生成。

## コアコンセプト

| コンセプト    | 説明                                       |
| ------------- | ------------------------------------------ |
| Component API | spec.mdで定義されたProps、Variants、States |
| CSF3          | Component Story Format 3 + autodocs        |
| 自動生成      | `/code`がspec.mdからStoriesを生成          |

## Component APIセクション（spec.md内）

場所: `## 4. UI仕様`内の`### 4.x Component API: [ComponentName]`

内容: Propsインターフェース（TypeScript）、Variants、States、使用例

## ワークフロー

| コマンド              | アクション                             |
| --------------------- | -------------------------------------- |
| `/think "Add Button"` | spec.mdにComponent APIセクションを追加 |
| `/code`               | specから`Button.stories.tsx`を生成     |

## 既存Storiesとの統合

| オプション | アクション              |
| ---------- | ----------------------- |
| [O]        | 既存ファイルを上書き    |
| [S]        | スキップ - 既存を維持   |
| [M]        | マージ - diff表示、手動 |
| [D]        | diffのみ - 新規を追加   |

## フロントエンド検出キーワード

component, ui, button, form, modal, dialog, card, list, table

## 参照

- [@./references/component-api-template.md] - Props/Variantsテンプレート
- [@./references/csf3-patterns.md] - CSF3パターン

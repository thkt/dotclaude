---
name: integrating-storybook
description: >
  spec.mdとのStorybook統合。Component APIからStoriesを自動生成。
  Storybookストーリーの作成、コンポーネントAPIの定義、または
  storybook, stories, props, argTypes, variants, CSF3 に言及した時に使用。
allowed-tools: [Read, Write, Glob, Grep]
user-invocable: false
---

# Storybook統合

## コアコンセプト

| コンセプト    | 説明                                       |
| ------------- | ------------------------------------------ |
| Component API | spec.mdで定義されたProps、Variants、States |
| CSF3          | Component Story Format 3 + autodocs        |
| 自動生成      | `/code`がspec.mdからStoriesを生成          |

## Component APIの配置場所

フロントエンドコンポーネント実装時にspec.mdへ追加。

| 内容                  | 説明                             |
| --------------------- | -------------------------------- |
| Propsインターフェース | TypeScriptインターフェース       |
| Variants              | スタイルオプション               |
| States                | default, hover, active, disabled |
| 使用例                | TSXコード                        |

## ワークフロー

| コマンド              | アクション                             |
| --------------------- | -------------------------------------- |
| `/think "Add Button"` | spec.mdにComponent APIセクションを追加 |
| `/code`               | specから`Button.stories.tsx`を生成     |

## 既存Storiesの処理

| オプション | アクション              |
| ---------- | ----------------------- |
| [O]        | 既存ファイルを上書き    |
| [S]        | スキップ - 既存を維持   |
| [M]        | マージ - diff表示、手動 |
| [D]        | diffのみ - 新規を追加   |

## 参照

| トピック      | ファイル                               |
| ------------- | -------------------------------------- |
| Component API | `references/component-api-template.md` |
| CSF3パターン  | `references/csf3-patterns.md`          |

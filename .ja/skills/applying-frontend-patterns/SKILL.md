---
name: applying-frontend-patterns
description: >
  フレームワーク非依存のフロントエンドコンポーネント設計パターン。
  React/Vue/Angularコンポーネント設計、Container/Presentationalパターン適用、または
  component patterns, フロントエンドパターン, コンポーネント設計 に言及した時に使用。
allowed-tools: [Read, Grep, Glob, Task]
user-invocable: false
---

# フロントエンドパターン

## コアパターン

| パターン                 | 使用タイミング          |
| ------------------------ | ----------------------- |
| Container/Presentational | データ取得 + 表示       |
| Custom Hooks             | 共有ビヘイビア          |
| Composition              | 柔軟なコンポーネント    |
| State Management         | Local → Shared → Global |

## Container/Presentational

| Container (ロジック) | Presentational (UI)   |
| -------------------- | --------------------- |
| データ取得           | propsでデータ受取     |
| 状態管理             | ステートレス（理想）  |
| イベント処理         | コールバックprops呼出 |
| スタイルなし         | 全スタイルはここ      |

## 状態管理

| スコープ | ツール        | 例                   |
| -------- | ------------- | -------------------- |
| Local    | useState      | フォーム入力、トグル |
| Shared   | Context       | テーマ、認証状態     |
| Global   | Zustand/Redux | アプリ全体キャッシュ |

## 使わない場合

シンプルな一回限りのコンポーネント、プロトタイプ（YAGNI）、再利用の見込みなし。

## 参照

| トピック               | ファイル                                 |
| ---------------------- | ---------------------------------------- |
| Container/Presentation | `references/container-presentational.md` |

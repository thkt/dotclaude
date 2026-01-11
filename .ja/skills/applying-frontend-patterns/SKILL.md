---
name: applying-frontend-patterns
description: >
  フレームワーク非依存のフロントエンドコンポーネント設計パターン。トリガー: React, Vue, Angular,
  コンポーネント, パターン, hooks, カスタムフック, container, presentational, 分離,
  状態管理, state management, composition, HOC, render props
allowed-tools: Read, Grep, Glob, Task
---

# フロントエンドパターン

## 目的

保守可能なフロントエンドアーキテクチャのためのコンポーネント設計パターン。パターンは普遍的で、実装はフレームワークにより異なる。

## コアパターン概要

| パターン                 | コンセプト                       | 使用タイミング                     |
| ------------------------ | -------------------------------- | ---------------------------------- |
| Container/Presentational | ロジックとUIの分離               | データ取得 + 表示                  |
| カスタムフック（React）  | 再利用可能なステートフルロジック | コンポーネント間で共有する振る舞い |
| コンポジション           | シンプルから複雑を構築           | 柔軟で再利用可能なコンポーネント   |
| 状態管理                 | アプリケーションデータの整理     | ローカル → 共有 → グローバル       |

## Container/Presentationalパターン

**主要原則**: 関心の分離

| Container（ロジック） | Presentational（UI）        |
| --------------------- | --------------------------- |
| データを取得          | propsでデータを受け取る     |
| 状態を管理            | ステートレス（理想）        |
| イベントを処理        | コールバックpropsを呼び出す |
| スタイリングなし      | すべてのスタイリングがここ  |

**適用ルール**:

1. Presentational（UIのみ、props駆動）から開始
2. ロジックが必要なときにContainerを追加
3. 再利用可能なときにカスタムフックに抽出

## Hooksガイドライン（React）

| Hook           | 用途                 | 避けるべき落とし穴 |
| -------------- | -------------------- | ------------------ |
| useEffect      | 副作用               | 依存関係の欠落     |
| useMemo        | 高コストな計算       | 早すぎる最適化     |
| useCallback    | 安定した関数参照     | 過度なメモ化       |
| カスタムフック | 再利用可能なロジック | `use`で始めない    |

**依存関係ルール**: effect内で使用するすべての値を常に含める。

## 状態管理戦略

| スコープ   | ツール（React） | 例                     |
| ---------- | --------------- | ---------------------- |
| ローカル   | useState        | フォーム入力、トグル   |
| 共有       | Context         | テーマ、認証状態       |
| グローバル | Zustand/Redux   | アプリ全体のキャッシュ |

**粒度ルール**: 大きな状態オブジェクトは別々の状態に分割。

## コンポジションパターン

| パターン     | ユースケース                             |
| ------------ | ---------------------------------------- |
| children     | ラッパーコンポーネント、カード、モーダル |
| render props | データに基づく動的レンダリング           |
| HOC          | 横断的関心事（認証、ロギング）           |

## フレームワーク比較

| パターン | React                    | Vue              | Angular    |
| -------- | ------------------------ | ---------------- | ---------- |
| 分離     | Container/Presentational | Composition API  | Smart/Dumb |
| 状態     | useState, Context        | ref, reactive    | Services   |
| 副作用   | useEffect                | watch, onMounted | ngOnInit   |
| スロット | children                 | slots            | ng-content |

## パターンを使わないとき

- シンプルな一回限りのコンポーネント
- プロトタイプ（YAGNI）
- 再利用が期待されない

**ルール**: 予測ではなく、痛みを感じたときにパターンを追加。

## 参照

### パターン

- [@./references/container-presentational.md](./references/container-presentational.md) - 詳細な分離ガイド

### 関連スキル

- `frontend-design`（公式） - ビジュアルデザイン品質（タイポグラフィ、色、アニメーション）
- `enhancing-progressively` - CSS優先プログレッシブエンハンスメント
- `integrating-storybook` - コンポーネントの可視化

### 使用コマンド

- `/code --frontend` - Reactコンポーネント実装
- `/audit` - フロントエンドパターン検証

### 参照

- `/example-skills:frontend-design` - 特徴的なUIエステティクスの公式スキル

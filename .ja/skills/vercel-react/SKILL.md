---
name: vercel-react
description: >
  Vercel
  EngineeringによるReact/Next.jsパフォーマンスルール。React/Next.jsコードの
  作成、レビュー、リファクタリング時にパフォーマンス観点で使用。トリガー:
  Reactコンポーネント、Next.jsページ、データフェッチ、バンドル最適化。
allowed-tools: [Read, Bash, Glob]
user-invocable: false
---

# Vercel Reactパフォーマンスルール

ソース: `vercel-labs/agent-skills` (react-best-practices)

## 使い方

1. 以下のインデックスから関連するルールを見つける
2. キャッシュされたルールを読む: `~/.claude/skills/vercel-react/cache/{rule}.md`
3. キャッシュにない場合:
   `bash ~/.claude/skills/vercel-react/scripts/fetch-rule.sh {rule}`
4. 一括同期: `bash ~/.claude/skills/vercel-react/scripts/sync.sh`

## 動作

- コードレビュー / 作成時: まずCRITICAL + HIGHルールを確認
- MEDIUM/LOWはユーザーが深い最適化を要求した場合のみ確認
- コードに関連するルールのみフェッチ（全58件ではない）

## 優先度インデックス

### 1. ウォーターフォール排除 — CRITICAL

| ルール                    | 説明                                  |
| ------------------------- | ------------------------------------- |
| async-defer-await         | awaitを実際に使用するブランチに移動   |
| async-parallel            | 独立した操作にPromise.all()           |
| async-dependencies        | 部分的な依存関係にbetter-all          |
| async-api-routes          | APIルートで早くPromise開始、遅くawait |
| async-suspense-boundaries | コンテンツストリーミングにSuspense    |

### 2. バンドルサイズ — CRITICAL

| ルール                   | 説明                                    |
| ------------------------ | --------------------------------------- |
| bundle-barrel-imports    | 直接インポート、barrelファイルを避ける  |
| bundle-dynamic-imports   | 重いコンポーネントにnext/dynamic        |
| bundle-defer-third-party | analytics/loggingをハイドレーション後に |
| bundle-conditional       | 機能有効時のみモジュールをロード        |
| bundle-preload           | hover/focusでプリロード、体感速度向上   |

### 3. サーバーサイド — HIGH

| ルール                   | 説明                                       |
| ------------------------ | ------------------------------------------ |
| server-auth-actions      | Server ActionsもAPIルートと同様に認証      |
| server-cache-react       | リクエスト単位の重複排除にReact.cache()    |
| server-cache-lru         | リクエスト横断のキャッシュにLRU            |
| server-dedup-props       | RSC propsでの重複シリアライゼーションを避  |
| server-hoist-static-io   | 静的I/Oをモジュールレベルに巻き上げ        |
| server-serialization     | クライアントコンポーネントへのデータを最小 |
| server-parallel-fetching | フェッチを並列化するよう再構築             |
| server-after-nonblocking | ノンブロッキング操作にafter()              |

### 4. クライアントサイドデータ — MEDIUM-HIGH

| ルール                         | 説明                                 |
| ------------------------------ | ------------------------------------ |
| client-swr-dedup               | 自動リクエスト重複排除にSWR          |
| client-event-listeners         | グローバルイベントリスナーの重複排除 |
| client-passive-event-listeners | スクロールにパッシブリスナー         |
| client-localstorage-schema     | localStorageのバージョン管理と最小化 |

### 5. 再レンダリング — MEDIUM

| ルール                             | 説明                                         |
| ---------------------------------- | -------------------------------------------- |
| rerender-defer-reads               | コールバックでのみ使用するstateを購読しない  |
| rerender-memo                      | 重い処理をメモ化コンポーネントに抽出         |
| rerender-memo-with-default-value   | デフォルトの非プリミティブpropsを巻き上げ    |
| rerender-dependencies              | effectの依存にプリミティブ値                 |
| rerender-derived-state             | 生の値ではなく派生ブーリアンを購読           |
| rerender-derived-state-no-effect   | effectではなくレンダー中にstateを派生        |
| rerender-functional-setstate       | 安定コールバックに関数型setState             |
| rerender-lazy-state-init           | 重い初期化にuseStateの関数引数               |
| rerender-simple-expression-in-memo | 単純プリミティブにmemoを避ける               |
| rerender-move-effect-to-event      | インタラクションロジックをイベントハンドラに |
| rerender-transitions               | 非緊急更新にstartTransition                  |
| rerender-use-ref-transient-values  | 頻繁な一時的値にref                          |

### 6. レンダリング — MEDIUM

| ルール                               | 説明                                         |
| ------------------------------------ | -------------------------------------------- |
| rendering-animate-svg-wrapper        | SVG要素ではなくdivラッパーをアニメーション   |
| rendering-content-visibility         | 長いリストにcontent-visibility               |
| rendering-hoist-jsx                  | 静的JSXをコンポーネント外に抽出              |
| rendering-svg-precision              | SVG座標の精度を削減                          |
| rendering-hydration-no-flicker       | クライアント専用データにインラインスクリプト |
| rendering-hydration-suppress-warning | 想定されるミスマッチを抑制                   |
| rendering-activity                   | 表示/非表示にActivityコンポーネント          |
| rendering-conditional-render         | &&ではなく三項演算子で条件レンダリング       |
| rendering-usetransition-loading      | ローディング状態にuseTransition              |

### 7. JSパフォーマンス — LOW-MEDIUM

| ルール                    | 説明                                            |
| ------------------------- | ----------------------------------------------- |
| js-batch-dom-css          | クラスやcssTextでCSS変更をグループ化            |
| js-index-maps             | 繰り返しルックアップにMapを構築                 |
| js-cache-property-access  | ループ内でオブジェクトプロパティをキャッシュ    |
| js-cache-function-results | モジュールMapに関数結果をキャッシュ             |
| js-cache-storage          | localStorage/sessionStorage読み取りをキャッシュ |
| js-combine-iterations     | filter/mapを1ループに結合                       |
| js-length-check-first     | 重い比較の前にlengthチェック                    |
| js-early-exit             | 関数から早期リターン                            |
| js-hoist-regexp           | ループ外にRegExpを巻き上げ                      |
| js-min-max-loop           | sortの代わりにループでmin/max                   |
| js-set-map-lookups        | O(1)ルックアップにSet/Map                       |
| js-tosorted-immutable     | イミュータブルにtoSorted()                      |

### 8. 上級 — LOW

| ルール                      | 説明                            |
| --------------------------- | ------------------------------- |
| advanced-event-handler-refs | イベントハンドラをrefsに格納    |
| advanced-init-once          | アプリロードごとに1回だけ初期化 |
| advanced-use-latest         | 安定コールバックrefにuseLatest  |

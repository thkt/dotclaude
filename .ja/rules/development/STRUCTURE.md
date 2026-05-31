# Code Structure

## Consistency

優先度は 1 > 2 > 3 (上が衝突時に勝つ)。

| 優先度 | 原則                 | 詳細                                                                                                                              |
| ------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1      | 既存に従う           | 構造・命名・エラーハンドリング・状態管理などの確立されたパターンに合わせる (これらに限らない)。変更はユーザー指示に基づく場合のみ |
| 2      | 既存なしならフラット | AI は構造を発明しない。分割判断はユーザーのもの。ユーザー要請があれば Strategy から選ぶ                                           |
| 3      | コロケーション       | 分割するときは、共に変わるファイルを近くに置く                                                                                    |

## Defaults

フレームワーク規約はこのデフォルトを上書きする。

| 項目             | デフォルト               |
| ---------------- | ------------------------ |
| ディレクトリ深度 | 最大 3 階層              |
| 横断的関心事     | `shared/`                |
| テスト配置       | ソースと同一ディレクトリ |

## Strategies

既存構造がない場合に What/How で選ぶ。ディレクトリ階層ごとに独立に適用する (例えばプロジェクトレベルでパイプライン、内部で feature ベース)。

| 戦略     | 判断              | 適合条件                         |
| -------- | ----------------- | -------------------------------- |
| Flat     | 小規模            | 小規模、単一目的                 |
| Pipeline | 単一概念 + 線形   | 線形データフロー (CLI, ETL)      |
| Layer    | 単一概念 + ツリー | リクエスト/レスポンス (API)      |
| Feature  | 複数概念 + ツリー | 独立した機能群 (UI, SaaS)        |
| Domain   | 複数概念 + 複雑   | 複数の境界づけられたコンテキスト |

## Testable Layering

Container/Presentational の Container 側をさらに分割する。

| レイヤー     | 責務                       | テスト            |
| ------------ | -------------------------- | ----------------- |
| Presentation | props → JSX                | props を渡す      |
| Container    | hook 呼び出し + 配線       | integration / E2E |
| Logic        | pure transform、判断、導出 | input → output    |

### 抽出基準

input と output だけでテスト可能ならば Logic に抽出する。

| 条件                               | アクション       |
| ---------------------------------- | ---------------- |
| 分岐 2 以上の transform            | Logic に抽出する |
| 同一 transform を 2 箇所以上で使用 | Logic に抽出する |
| 単純な props マッピング            | Container に保つ |

### Logic ファイルの命名

概念で命名する。`utils.ts` は使わない。

```
# React
features/order/
├── OrderDetail.tsx         # Presentation
├── useOrderDetail.ts       # Container
├── pricing.ts              # Logic (concept name)
├── pricing.test.ts
├── orderStatus.ts          # Logic (concept name)
└── orderStatus.test.ts

# Rust
src/
├── tools/mod.rs            # Orchestration
├── chunker.rs              # Logic (concept name)
└── redact.rs               # Logic (concept name)
```

## File-Internal Ordering

関数定義は呼び出し順に並べる。実装中に適用する。TIDYINGS では適用しない。

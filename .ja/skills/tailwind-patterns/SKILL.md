---
name: tailwind-patterns
description: >
  Tailwind CSS v4 の設計判断リファレンス（コードレビュー用）。 Tailwind
  のレビュー時、レイアウト戦略選定時、または Tailwind, ユーティリティファースト,
  コンテナクエリ, デザイントークン, ダークモード に言及した時に使用。
allowed-tools: [Read, Grep, Glob]
user-invocable: false
---

# Tailwind パターン

Linter では検出できない設計レベルの判断基準。

## Container Query vs Viewport

| シナリオ                 | 使用                       | 理由               |
| ------------------------ | -------------------------- | ------------------ |
| ページレベルのレイアウト | Viewport (`md:`, `lg:`)    | 画面サイズに依存   |
| 再利用コンポーネント     | Container (`@sm:`, `@md:`) | コンテキスト非依存 |
| サイドバー/パネル内      | Container                  | 親の幅が可変       |
| トップナビ/フッター      | Viewport                   | 常に全幅           |

```html
<!-- Container: 親が境界を定義 -->
<div class="@container">
 <div class="@sm:flex @md:grid @md:grid-cols-2">...</div>
</div>
```

名前付きコンテナで特定性を確保: `@container/card`

## カラートークン設計

| レイヤー  | 例                 | 目的                                      |
| --------- | ------------------ | ----------------------------------------- |
| Primitive | `--color-blue-500` | 生のカラー値                              |
| Semantic  | `--color-primary`  | 用途ベースの命名                          |
| Component | `--button-bg`      | コンポーネント固有（`:root`、`@theme`外） |

レビューチェック:

- Arbitrary カラー値（`bg-[#3b82f6]`）= デザイントークン未定義
- OKLCH を RGB/HSL より推奨（知覚的に均一）
- Component レイヤーは任意。Primitive + Semantic が最低限

```css
@theme {
 --color-primary: oklch(0.7 0.15 250);
 --color-surface: oklch(0.98 0 0);
}
```

## ダークモード戦略

v4 は CSS の `@custom-variant` で設定（`darkMode` config key は廃止）。

| 戦略                      | CSS 設定                                                                  | 使用場面                 |
| ------------------------- | ------------------------------------------------------------------------- | ------------------------ |
| OS 設定追従（デフォルト） | 設定不要                                                                  | 手動制御不要             |
| クラストグル              | `@custom-variant dark (&:where(.dark, .dark *));`                         | ユーザー制御のテーマ切替 |
| Data 属性                 | `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` | 複数テーマ               |

一貫したペアリング:

| 要素     | Light             | Dark                   |
| -------- | ----------------- | ---------------------- |
| 背景     | `bg-white`        | `dark:bg-zinc-900`     |
| テキスト | `text-zinc-900`   | `dark:text-zinc-100`   |
| ボーダー | `border-zinc-200` | `dark:border-zinc-700` |

## レイアウト選定

| パターン                                         | 使用場面                                         |
| ------------------------------------------------ | ------------------------------------------------ |
| `flex`                                           | 単一軸の配置、ナビバー、センタリング             |
| `grid`                                           | 2次元、カードグリッド、ページレイアウト          |
| `grid` + spans                                   | 非対称/Bento レイアウト                          |
| `grid-cols-[repeat(auto-fit,minmax(250px,1fr))]` | ブレークポイント不要のレスポンシブカードグリッド |

対称 N カラムより非対称/Bento を推奨。

## コンポーネント抽出

| シグナル                       | アクション            |
| ------------------------------ | --------------------- |
| 同じクラスの組み合わせ 3回以上 | コンポーネントに抽出  |
| 複雑な状態バリアント           | コンポーネントに抽出  |
| デザインシステム要素           | 抽出 + ドキュメント化 |

| 方法                        | 使用場面             |
| --------------------------- | -------------------- |
| React/Vue コンポーネント    | 動的な振る舞いが必要 |
| デザイントークン (`@theme`) | 再利用可能な値のみ   |

v4 では `@apply` に制限あり、非推奨。コンポーネント抽出を推奨。

## アンチパターン

| NG                            | OK                      | 理由                                          |
| ----------------------------- | ----------------------- | --------------------------------------------- |
| Arbitrary values の多用       | `@theme` スケールを使用 | デザインの一貫性欠如                          |
| `!important`                  | 詳細度を修正            | メンテナンス困難                              |
| `style=` とユーティリティ混在 | ユーティリティのみ      | パージが壊れる                                |
| 長いクラスリストの重複        | コンポーネント抽出      | DRY 違反                                      |
| `@apply` の使用               | コンポーネント抽出      | v4 で制限あり、ユーティリティファースト無効化 |
| 動的クラス文字列              | 静的フルクラス          | ツリーシェイキング不可                        |

```tsx
// BAD: 動的クラス文字列（パージ不可）
<div className={`text-${color}-500`} />;

// GOOD: 静的フルクラス
const colorMap = { red: "text-red-500", blue: "text-blue-500" } as const;
<div className={colorMap[color]} />;
```

## v4 CSS ファースト設定

v4 は `tailwind.config.js` の代わりに CSS の `@theme`
を使用。全トークンが CSS 変数。

```css
@theme {
 --spacing: 0.25rem; /* 基数: p-4 = 4 * 0.25rem = 1rem */
 --font-sans: "Inter", system-ui, sans-serif;
}
```

レビューポイント: v4 プロジェクトに `tailwind.config.js`
がある = 未移行の可能性。

# UI プロトタイプ

1 ルート上に全く異なる複数の UI variant を生成し、floating bottom bar で切り替える。ユーザーはブラウザで variant を行き来し、1 つ選ぶ (または各々から良い所を盗む) 、残りは捨てる。

問いが見た目でなく logic/state についてなら分岐違い。logic.md を使う。

## この形が正しいとき

- 「このページはどう見えるべきか」
- 「commit する前にこの dashboard の選択肢をいくつか見たい」
- 「settings 画面の別レイアウトを試したい」
- ユーザーが頭の中で曖昧な 3 案を 1 日かけて悩む代わりになるとき全般

## 2 つの sub-shape (sub-shape A を強く推奨)

UI prototype は app の残りに隣接しているとき判断が遥かに楽になる。本物の header、本物の sidebar、本物のデータ、本物の密度。単独の throwaway route は真空で、どの variant も孤立すると良く見えてしまう。variant を載せられる既存ページがある限り sub-shape A を既定にする。prototype に近くの居場所が本当にないときだけ sub-shape B に頼る。

### Sub-shape A: 既存ページへの調整 (推奨)

ルートが既に存在する。variant は同じルート上に `?variant=` URL search param で gate して描画する。既存の data fetching、params、auth はそのまま。描画だけが入れ替わる。これが既定。理由がない限りこれを選ぶ。まだページがないが自然に既存ページの中に収まるもの (dashboard の新セクション、settings 画面の新カード、既存フローの新ステップ) も sub-shape A。variant を host ページの中に mount する。

### Sub-shape B: 新規ページ (最終手段)

prototype 対象が既存ページに収まらない場合だけ使う (全く新しい top-level surface、どこにも埋め込めないフローなど)。project の既存 routing 規約に従い throwaway route を作る。新規 top-level 構造は作らない。prototype と明らかに分かる命名 (path/filename に `prototype` を含める) にする。同じ `?variant=` パターン。sub-shape B に決める前に確認する。埋め込める既存ページが本当にないか。空のルートは、人の入ったルートなら露出するはずの設計問題を隠す。

どちらの sub-shape でも floating bottom bar は同一。

## 手順

### 1. 問いを述べ N を選ぶ

variant は既定で 3 つ。5 を超えると「全く異なる」でなくなりノイズになる。そこで cap する。計画を prototype の場所かファイル冒頭コメントに 1 行で書く。

> 「settings ページの 3 variant、既存の `/settings` ルート上で `?variant=` 切替」

ユーザーが反論しに来ても来なくても機能する書き方にする。

### 2. 全く異なる variant を生成する

各 variant を起草する。各々を次に照らす。

- ページの目的とアクセスできるデータ
- project の component library / styling system (TailwindCSS、shadcn、MUI、plain CSS、何であれ)
- 明確な export 名 (`VariantA`、`VariantB`、`VariantC` など)

variant は構造的に異なること。レイアウト、情報階層、primary affordance が違う。色違いではない。少しずつ調整した card grid 3 つは UI prototype ではなく壁紙。2 案が似すぎたら、片方を「card grid を使わない」と明示して作り直す。

### 3. 配線する

ルート上に switcher コンポーネントを 1 つ作る。

```tsx
// 擬似コード。project の framework に合わせる
const variant = searchParams.get("variant") ?? "A";
return (
  <>
    {variant === "A" && <VariantA {...data} />}
    {variant === "B" && <VariantB {...data} />}
    {variant === "C" && <VariantC {...data} />}
    <PrototypeSwitcher variants={["A", "B", "C"]} current={variant} />
  </>
);
```

sub-shape A (既存ページ) では既存の data fetching を switcher の上に残し、variant ごとに描画される subtree だけ変える。sub-shape B (新規ページ) では `/prototype/<name>` の throwaway route が同じ switcher を mount する。

### 4. floating switcher を作る

画面下中央の小さな fixed-position bar。3 つの要素を持つ。

| 要素           | 動作                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------- |
| 左矢印         | 前の variant に巡回 (wrap する)                                                              |
| variant ラベル | 現在の variant キーと、variant が名前を export していればその名前も。例 `B — Sidebar layout` |
| 右矢印         | 次の variant に巡回 (wrap する)                                                              |

挙動。

- 矢印クリックで URL search param を更新する (framework の router を使う。Next なら `router.replace`、React Router なら `navigate`)。variant が共有可能で reload 後も安定する。
- キーボード `←` `→` でも巡回する。`<input>` / `<textarea>` / `[contenteditable]` に focus があるときは矢印キーを横取りしない。
- ページと視覚的に区別する (high-contrast pill、subtle shadow など)。評価対象の設計の一部でないと明らかになるように。
- production build では隠す。`process.env.NODE_ENV !== 'production'` 等で gate し、prototype の誤 merge で bar がユーザーに出ないようにする。

switcher は単一の共有コンポーネントに置き、両 sub-shape で再利用する。project の共有 UI の置き場所に配置する。

### 5. 引き渡す

URL (と `?variant=` キー) をユーザーに渡す。ユーザーは手が空いたとき variant を行き来する。有用なフィードバックはたいてい「B の header と C の sidebar が欲しい」。それが実際に欲しい設計。

### 6. 答えを記録し片付ける

variant が決まったら、どれをなぜ選んだか書く (commit message、ADR、issue、または AFK でユーザー未応答なら prototype 隣の `NOTES.md`)。その後。

- sub-shape A: 負けた variant と switcher を削除し、勝者を既存ページに畳み込む。
- sub-shape B: 勝った variant を本物のルートに昇格し、throwaway route と switcher を削除する。

variant コンポーネントや switcher を放置しない。すぐ腐り、次の読み手を混乱させる。

## アンチパターン

| 罠                                 | 理由                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 色やコピーだけ違う variant         | それは調整であって prototype ではない。本物の variant は構造で対立する                               |
| variant 間でコードを共有しすぎる   | 共有 `<Header>` は可。共有 `<Layout>` は目的を潰す。各 variant は layout を捨てられること            |
| variant を本物の mutation に繋ぐ   | read-only prototype で良い。mutation が要るなら stub を指す。問いは「どう見えるか」                  |
| prototype を直接 production に昇格 | variant コードは prototype 制約下 (テストなし、最小 error handling) で書かれた。畳み込む時に書き直す |

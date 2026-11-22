---
paths:
  - "**/package.json"
  - "**/bunfig.toml"
  - "**/bun.lock"
---

# Bun

thkt のリポジトリで Bun を使うものは、直下に `bunfig.toml` を置く。`bun install` が作る `node_modules` の形と版の選び方を、手元、CI、クラウドのセッションでそろえるためである。thkt のリポジトリとは、`origin` が `github.com/thkt/` を指すリポジトリを言う。

手元の Mac では、`~/.bunfig.toml` が同じ 2 つのキーと `globalStore = true` を持つ。リポジトリの `bunfig.toml` は、そのファイルを読まない CI、クラウドのセッション、別のマシンのために置く。手元の設定と重なっていても消さない。

## 置く内容

```toml
[install]
minimumReleaseAge = 259200
linker = "isolated"
```

各キーは次の動作を決める。

| キー                | 決める動作                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimumReleaseAge` | `bun add` と、lockfile を書き換える `bun install` は、公開から 3 日経っていない版を選ばない。`--frozen-lockfile` のインストールは、lockfile にある版をそのまま入れる |
| `linker`            | `node_modules` を pnpm と同じ形で作る。`package.json` に書いていないパッケージの import は、どの環境でも失敗する                                                     |

## 置かないキー

`globalStore = true` は、リポジトリの `bunfig.toml` に置かない。global store が速くするのは、パッケージの実体が既にキャッシュにある `bun install` だけである。thkt のリポジトリの CI は bun のキャッシュを持ち越さないので、置いても速くならない。手元では、`~/.bunfig.toml` がこのキーを持つ。

## textlint を使うリポジトリ

textlint を使うリポジトリは、`bunfig.toml` に `globalStore = false` を足す。`~/.bunfig.toml` の `globalStore = true` の下では、textlint は global store にある自分の場所から規則を探し、規則を 1 つも読み込めずに失敗する。リポジトリの `globalStore = false` は、`~/.bunfig.toml` の値より優先される。失う速さは、約 400 パッケージの `bun install` で 1 回あたり 0.2 秒ほどである。

textlint の呼び出しに `--rules-base-directory "$PWD/node_modules"` を付けても、規則は読み込める。ただし、呼び出しのすべてに付ける必要があるので、この方法は選ばない。

## 状況ごとの扱い

| 状況                                       | 扱い                                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| thkt のリポジトリに `bunfig.toml` が無い   | 上の内容で作る                                                                                             |
| thkt のリポジトリに `bunfig.toml` がある   | 足りないキーだけを足し、今あるキーと値は変えない                                                           |
| thkt 以外のリポジトリ (仕事やチームのもの) | ファイルを足さず、足すことを thkt に提案する                                                               |
| isolated にすると import が失敗する        | 依存をその `package.json` に書き足す。書き足せないときだけ `linker = "hoisted"` にし、理由を commit に書く |

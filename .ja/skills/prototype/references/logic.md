# Logic プロトタイプ

ユーザーが手で状態モデルを動かす、小さな対話型ターミナルアプリ。問いが business logic、状態遷移、データ形状についてのとき使う。紙の上では妥当に見えるが、実ケースを通すと初めて違和感が出る類のもの。

## この形が正しいとき

- 「X の次に Y というエッジケースをこの state machine は捌けるか自信がない」
- 「このデータモデルで実際にこのケースを表現できるか」
- 「書く前に API がどう見えるべきか手探りしたい」
- ユーザーがボタンを押して状態の変化を見たい場合全般

問いが「これはどう見えるべきか」なら分岐違い。ui.md を使う。

## 手順

### 1. 問いを書き出す

コードを書く前に、どの状態モデルの何を prototype しているかを書く。prototype の README か、ファイル冒頭のコメントに 1 段落で。誤った問いに答える logic prototype は純粋な無駄なので、後から検証できるよう問いを明示する。ユーザーが今見ていても、AFK で後から戻っても同じ。

### 2. 言語を選ぶ

host project が使うものを使う。明らかな runtime がない project (docs repo など) なら確認する。tooling は project の既存規約に合わせ、prototype のためだけに新しい package manager や runtime を足さない。

### 3. ロジックを移植可能なモジュールに隔離する

問いに答える本体 (実際の logic) を、後で本物のコードベースに持ち込める小さく pure なインターフェースの背後に置く。周りの TUI は使い捨てだが、logic モジュールは違う。

正しい形は問いによる。

| 形                                         | 適するとき                                     |
| ------------------------------------------ | ---------------------------------------------- |
| pure な reducer `(state, action) => state` | アクションが離散イベントで状態が単一値のとき   |
| state machine (明示的な状態と遷移)         | 「今どのアクションが合法か」が問いの一部のとき |
| plain データ型に対する pure 関数群         | 暗黙の current state がなく、変換だけのとき    |
| 明確な method 面を持つ class/module        | logic が継続的な内部状態を本当に持つとき       |

TUI に繋ぎやすい形ではなく、問いに最も合う形を選ぶ。pure に保つ。I/O なし、terminal コードなし、制御フロー用の `console.log` なし。TUI が import して呼ぶ。逆向きには何も流れない。これが prototype を自分の寿命を超えて有用にする。問いに答えたら、検証済みの reducer / machine / 関数群を本物のモジュールに持ち上げ、TUI shell は消す。

### 4. 状態を露出する最小の TUI を作る

軽量な TUI として作る。tick ごとに画面をクリア (`console.clear()` / `print("\033[2J\033[H")` / 同等) し、フレーム全体を再描画する。ユーザーには常に 1 つの安定したビューが見え、伸び続ける scrollback にはならない。

各フレームは 2 部構成。順序もこのとおり。

1. 現在の状態。pretty-print して diff しやすく (1 フィールド 1 行、または整形 JSON)。フィールド名やセクション見出しに bold (ANSI `\x1b[1m`)、補足情報 (timestamp、ID、derived 値) に dim (`\x1b[2m`) を使う。reset は `\x1b[0m`。project に既存でなければ styling ライブラリは不要。
2. キーボードショートカット。下部に列挙 (`[a] add user  [d] delete user  [t] tick clock  [q] quit`)。キーを bold、説明を dim、または逆。読みやすければどちらでも。

挙動。

1. 状態を初期化する。単一のメモリ上 object/struct。起動時に最初のフレームを描画する。
2. 1 度に 1 キーストローク (または 1 行) を読み、状態を変える handler に dispatch する。
3. アクションごとにフレーム全体を再描画する。append でなく replace。
4. quit までループする。

フレーム全体は 1 画面に収める。

### 5. 1 コマンドで起動可能にする

project の既存 task runner (`package.json` scripts、`Makefile`、`justfile`、`pyproject.toml`) に script を足す。ユーザーは `pnpm run <prototype-name>` 等で起動でき、パスを覚える必要がない。host project に task runner がなければ、prototype の README 冒頭にコマンドを置く。

### 6. 引き渡す

起動コマンドをユーザーに渡す。ユーザーが自分で動かす。面白い瞬間は「待って、それは起きないはず」「へえ、X はもっと違うと思ってた」と言うとき。それがアイデア自体のバグで、それこそが目的。新しいアクションの追加を求められたら足す。prototype は進化する。

### 7. 答えを記録する

prototype が役目を終えたら、問いへの答えだけが残す価値。ユーザー在席なら何を学んだか聞く。不在なら prototype 隣に `NOTES.md` を残し、答えを後で (session を見ていたなら自分で) 埋められるようにしてから削除する。

## アンチパターン

| 罠                             | 理由                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| テストを足す                   | テストが要る prototype はもう prototype ではない                                       |
| 本物の DB に繋ぐ               | 問いが永続化そのものでない限り in-memory store を使う                                  |
| 一般化する                     | 「後で X を支援したくなったら」はなし。prototype は 1 つの問いに答える                 |
| logic と TUI を混ぜる          | reducer / state machine が `console.log`、prompt、terminal escape を参照したら移植不能 |
| TUI shell を production に出す | shell は手で terminal から動かす用。残す価値があるのは背後の logic モジュール          |

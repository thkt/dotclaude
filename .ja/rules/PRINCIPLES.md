# Principles

## 優先度マトリクス

| 優先度     | 原則                                    |
| ---------- | --------------------------------------- |
| Foundation | Outcome-driven                          |
| Foundation | Backcasting                             |
| Critical   | Occam's Razor                           |
| Critical   | Progressive Enhancement                 |
| Critical   | Systems Thinking                        |
| Default    | Readable Code                           |
| Default    | Miller's Law                            |
| Default    | TDD / Baby Steps                        |
| Default    | DRY                                     |
| Default    | YAGNI Boundary                          |
| Default    | Reuse Ordering                          |
| Default    | Strong Inference                        |
| Default    | Measurement                             |
| Contextual | SOLID                                   |
| Contextual | Container / Presentational              |
| Contextual | Law of Demeter                          |
| Contextual | AI-Assisted Development (Overeagerness) |
| Contextual | TIDYINGS                                |

## トリガー

| トリガー                                       | 原則                    |
| ---------------------------------------------- | ----------------------- |
| 新規タスク or ゴール不明                       | Backcasting             |
| メソッドチェーン 2 超                          | Law of Demeter          |
| コードを縮めて難読化した                       | Readable Code           |
| 複雑優先                                       | Occam's Razor           |
| Work の前に Resilient / Fast / Flexible に着手 | Progressive Enhancement |
| 仮説が単一                                     | Strong Inference        |
| 同一前提の修正が 2 連敗                        | Strong Inference        |
| 局所の改善が全体を不変 or 悪化                 | Systems Thinking        |
| 同じ症状への修正が再発                         | Systems Thinking        |
| 連動する呼び出し箇所 2 以上                    | YAGNI Boundary          |
| 新規コード or 依存追加の直前                   | Reuse Ordering          |
| 書いた後に冗長                                 | Occam's Razor           |
| 余分なファイル or 未要求スコープ               | Overeagerness           |

## 衝突解決

- Outcome-driven が why を、Backcasting がゴールを、他の原則が到達手段を定める
- Systems Thinking が最適化する範囲 (outcome を担うシステム全体) を定め、Occam's Razor がその範囲内の最簡を選ぶ
- 迷ったら simple > clever, concrete > abstract, working > perfect, readable > DRY
- Occam's Razor は、症状の一時的な軽減を成果と見なさない。アウトカム達成に直結し、かつ出力品質を損なわない最簡アプローチだけを選ぶ

## Progressive Enhancement

Make it Work → Make it Resilient (エラー発生時) → Make it Fast (遅さを計測したら) → Make it Flexible (ユーザーが要求したら)

## Systems Thinking

部分最適の総和は全体最適にならない。各部分の義務は自身の出力の最大化でなく、システム全体の目的への貢献。変更の良し悪しは変更対象の局所でなく、outcome を担うシステム全体への影響で判断する。

- 局所の指標が改善しても、ボトルネックが別にあれば全体は変わらない。制約を特定してから最適化する
- 対症的な近道の反復は根本解決の能力を蝕む (Shifting the Burden)。修正を選ぶ前に、それが根本解決の必要を減らすのか先送りするだけかを判定する

## Readable Code

未来の自分と、文脈を共有する 1 人のチームメイトに向けて書く。縮めて読みやすくなるならそれは洗練であり、追求する。縮めた結果、自分にしか解読できないなら元に戻す。意図は名前・型・テスト名に載せて、コメントはコードが保持できない why 用の最後の手段とする。

## DRY

- 一箇所の変更が全箇所の変更を強制するなら、同じ知識とみなして DRY を適用する
- 各コピーが独立に進化しうるなら、それは単に似ているだけのコードなのでマージしない

## YAGNI Boundary

YAGNI は不要な機能と投機的なコードパスを禁ずる。同等コストで構造改善を選ぶことは禁じない。Occam's Razor > YAGNI Boundary。

- 呼び出し箇所が 2 以上、または auth や logging、error handling のようにドメインが自明なら、抽象化のゲートを開く
- 行数・間接度・import 数で測ったコストが同等なら、連動する呼び出し箇所が少ない方を選ぶ

## Reuse Ordering

問題を理解した後、コードを書く前に、上から順に検討する。上位で済むなら下位に降りない。同等の選択肢が 2 つあれば、エッジケースで正しく動く方を選ぶ。再利用で書く量を減らしても、検証 / エラー処理 / セキュリティ / アクセシビリティは省かない。

1. 不要なら作らない。投機的な必要性は飛ばす
2. コードベースの既存 helper / util / pattern を再利用する
3. 手書きする前に標準ライブラリを検討する
4. native platform を使う。picker より `<input type="date">`、JS より CSS、app コードより DB 制約
5. 既存依存を使う。数行で済むものに新規依存を足さない
6. 上で埋まらないときだけ新規実装する。動く最小限で書く

## Strong Inference

複数の対立仮説を同時に立てて消去する。同一前提の修正が 2 回失敗したら、誤りの修正 (single-loop) から前提自体の懐疑 (double-loop) に切り替える。支配的な前提を言語化してから次の仮説を立てる。

## Measurement

アウトカムにはドリフトを検出する観測可能なシグナルが必要。

- 結果指標 (何が変わったか) と過程指標 (何をしたか) を組み合わせ、メトリックゲーミングを抑制する
- 指標はアウトカムに資するものなので、数値が改善してもアウトカムが改善していなければ指標が間違っている
- 多すぎると注意が薄れるので、一目で読める程度に薄く保つ

## SOLID

早すぎるインターフェースは価値なき間接層を生むので、第二の実装が現れたときにのみ追加を検討する

## Overeagerness

AI-Assisted Development の具体化。余分なファイル、未要求の抽象、防御的コードを過剰実装しないようタスクが要求する範囲に留める。YAGNI と Occam's Razor を参照。

| 罠                         | ルール                                                                       |
| -------------------------- | ---------------------------------------------------------------------------- |
| 未要求のスコープ           | バグ修正は周辺コードを掃除しない。小機能は設定を足さない                     |
| 触れていないコードへの付加 | コメント・型は変更したコードにのみ、ロジックが非自明な箇所にのみ付ける       |
| 防御的コード               | システム境界 (ユーザー入力、外部 API) で検証。起こり得ないケースに配慮しない |
| 投機的抽象                 | 一度きりの用途や仮想の将来要件にヘルパー / 抽象を作らない                    |
| 構造の発明                 | 分割判断はユーザーが行い、ディレクトリ構造は既存に従う                       |

# Principles

## 優先度マトリクス

| 優先度     | 原則                     |
| ---------- | ------------------------ |
| Foundation | Outcome-driven           |
| Critical   | Occam's Razor            |
| Critical   | Progressive Enhancement  |
| Default    | Readable Code            |
| Default    | Miller's Law             |
| Default    | TDD/Baby Steps           |
| Default    | DRY                      |
| Default    | YAGNI                    |
| Default    | Strong Inference         |
| Default    | Measurement              |
| Contextual | SOLID                    |
| Contextual | Container/Presentational |
| Contextual | Law of Demeter           |
| Contextual | Leaky Abstraction        |
| Contextual | AI-Assisted Development  |
| Contextual | TIDYINGS                 |

## トリガー

| トリガー                         | 原則             |
| -------------------------------- | ---------------- |
| 新規タスク or ゴール不明         | Backcasting      |
| メソッドチェーン 2 超            | Law of Demeter   |
| コードを縮めて難読化した         | Readable Code    |
| 複雑優先                         | Occam's Razor    |
| 仮説が単一                       | Strong Inference |
| 連動する呼び出し箇所 2 以上      | YAGNI Boundary   |
| 書いた後に冗長                   | Occam's Razor    |
| 余分なファイル or 未要求スコープ | Overeagerness    |

## 衝突解決

- アウトカムドリブンが why を、バックキャスティングがゴールを、他の原則が到達手段を定める
- 迷ったら simple > clever, concrete > abstract, working > perfect, readable > DRY
- Occam's Razor は、症状の一時的な軽減を成果と見なさず、アウトカム達成に直結する出力品質を損なわない最簡アプローチだけを選ぶ

## プログレッシブエンハンスメント

Make it Work → Make it Resilient (エラー発生時) → Make it Fast (遅さを計測したら) → Make it Flexible (ユーザーが要求したら)

## リーダブルコード

未来の自分と、文脈を共有する 1 人のチームメイトに向けて書く。縮めて読みやすくなるならそれは洗練であり、追求する。縮めた結果、自分にしか解読できないなら元に戻す。意図は名前・型・テスト名に載せて、コメントはコードが保持できない why 用の最後の手段とする。

## DRY

| 種別       | 基準                                 | アクション   |
| ---------- | ------------------------------------ | ------------ |
| 同じ知識   | 一箇所の変更が全箇所の変更を強制する | DRY を適用   |
| 似たコード | 各コピーが独立に進化しうる           | マージしない |

## YAGNI Boundary

YAGNI は不要な機能と投機的なコードパスを禁ずる。同等コストで構造改善を選ぶことは禁じない。Occam's Razor > YAGNI Boundary。

| ステップ | 基準                                                                        |
| -------- | --------------------------------------------------------------------------- |
| ゲート   | 呼び出し箇所 2 以上 or ドメイン自明 (auth, logging, error handling)         |
| 判断軸   | 同等コスト (行数、間接度、import 数) → 連動する呼び出し箇所が少ない方を選ぶ |

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
| 投機的抽象                 | 一度きりの用途や仮想の将来要件にヘルパー/抽象を作らない                      |
| 構造の発明                 | 分割判断はユーザーが行い、ディレクトリ構造は既存に従う                       |

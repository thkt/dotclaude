# Principles

## Priority Matrix

| 優先度     | 原則                            |
| ---------- | ------------------------------- |
| Foundation | Outcome-driven (CLAUDE.md 参照) |
| Critical   | Occam's Razor                   |
| Critical   | Progressive Enhancement         |
| Default    | Readable Code                   |
| Default    | Miller's Law                    |
| Default    | TDD/Baby Steps                  |
| Default    | DRY (3+ duplications)           |
| Default    | YAGNI                           |
| Default    | Strong Inference                |
| Default    | Measurement                     |
| Contextual | SOLID                           |
| Contextual | Container/Presentational        |
| Contextual | Law of Demeter                  |
| Contextual | Leaky Abstraction               |
| Contextual | AI-Assisted Development         |
| Contextual | TIDYINGS                        |

## Triggers

| トリガー                        | 原則             |
| ------------------------------- | ---------------- |
| 新規タスクまたはゴール不明      | Backcasting      |
| メソッドチェーン 2 超           | Law of Demeter   |
| 1 分で読めない                  | Readable Code    |
| 複雑優先                        | Occam's Razor    |
| 仮説が単一                      | Strong Inference |
| 連動する呼び出し箇所 2 以上     | YAGNI Boundary   |
| 書いた後に冗長                  | Occam's Razor    |
| 余分なファイル / 未要求スコープ | Overeagerness    |

## Conflict Resolution

アウトカムドリブンが why を定める (CLAUDE.md 参照)。バックキャスティングがアウトカムに資するゴールを定める。Occam's Razor とその他の原則がそこへの到達手段を律する。

迷ったら、simple > clever, concrete > abstract, working > perfect, readable \> DRY。

Occam's Razor はアウトカムを達成するアプローチの中で最も簡潔なものを選ぶ。症状除去のためではない。簡潔さが出力品質を下げる場合は適用しない。

## Measurement

アウトカムにはドリフトを検出する観測可能なシグナルが要る。Measurement はアウトカムドリブンに資する。

- 結果指標 (何が変わったか) と過程指標 (何をしたか) を組み合わせ、メトリック ゲーミングを抑制する。
- 指標はアウトカムに資するもの。逆ではない。数値が改善してもアウトカムが改善していなければ、指標が間違っている。
- 一目で読める程度に薄く保つ。多すぎると注意が薄れる。

## YAGNI Boundary

YAGNI は不要な機能と投機的なコードパスを禁ずる。同等コストで構造改善を選ぶことは禁じない。YAGNI Boundary と Occam's Razor が衝突した場合、Occam's Razor が勝つ。

| ステップ | 基準                                                                        |
| -------- | --------------------------------------------------------------------------- |
| ゲート   | 呼び出し箇所 2 以上 OR ドメイン自明 (auth, logging, error handling)         |
| 判断軸   | 同等コスト (行数、間接度、import 数) → 連動する呼び出し箇所が少ない方を選ぶ |

## Overeagerness

AI-Assisted Development の具体化。最新モデルは過剰実装に振れ、余分なファイル、未要求の抽象、防御的コードを生む。タスクが要求する範囲に留める。YAGNI と Occam's Razor を参照。

| 罠                         | ルール                                                                       |
| -------------------------- | ---------------------------------------------------------------------------- |
| 未要求のスコープ           | バグ修正は周辺コードを掃除しない。小機能は設定を足さない                     |
| 触れていないコードへの付加 | コメント・型は変更したコードにのみ、ロジックが非自明な箇所にのみ付ける       |
| 防御的コード               | システム境界 (ユーザー入力、外部 API) で検証。起こり得ないケースには付けない |
| 投機的抽象                 | 一度きりの用途や仮想の将来要件にヘルパー・抽象を作らない                     |

## DRY

ゲートは重複 3 以上。次に検証する。同じ知識か、似た構造か。

| 種別       | 基準                                 | アクション   |
| ---------- | ------------------------------------ | ------------ |
| 同じ知識   | 一箇所の変更が全箇所の変更を強制する | DRY を適用   |
| 似たコード | 各コピーが独立に進化しうる           | マージしない |

## Progressive Enhancement

Make it Work → Make it Resilient (エラー発生時) → Make it Fast (遅さを計測したら) → Make it Flexible (ユーザーが要求したら)

## SOLID

第二の実装が現れたときにのみインターフェースを追加する。早すぎるインターフェースは価値なき間接層を生む。

## Readable Code

後日の自分と、文脈を共有する 1 人のチームメイトに向けて書く。あらゆる新参者のためではない。縮めて読みやすくなるならそれは洗練であり、追求する。縮めた結果、自分にしか解読できないならそれは圧縮であり、元に戻す。意図は名前・型・テスト名に載せる。これらは嘘をつけば CI で落ちる。コメントは最後、コードが保持できない why のために。

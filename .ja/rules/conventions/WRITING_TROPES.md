---
paths:
  - ".claude/docs/**"
  - ".claude/.ja/docs/**"
  - ".claude/docs/decisions/**"
  - ".claude/workspace/**"
  - ".claude/README.md"
  - ".claude/.ja/README.md"
---

# AI Writing Tropes

AI 生成文章の prose アンチパターン。単発なら問題ない。複数の trope が積み重なると AI slop になる。

適用先: PR 説明、Issue、ドキュメント、ブログ記事、prose 出力。

適用外: コード、コードコメント、技術的なテーブル、コミットメッセージ。

## 単語選択

| Trope             | 例                                           | 修正                       |
| ----------------- | -------------------------------------------- | -------------------------- |
| Magic adverbs     | quietly, deeply, fundamentally, remarkably   | 削るか、具体的な言葉を使う |
| AI vocabulary     | delve, leverage, robust, streamline, harness | 平易な単語を使う           |
| Grandiose nouns   | tapestry, landscape, paradigm, ecosystem     | 具体的な名詞を使う         |
| "Serves as" dodge | serves as, stands as, marks, represents      | 「is」を使う               |

## 文構造

| Trope                 | パターン                                                     | 修正                     |
| --------------------- | ------------------------------------------------------------ | ------------------------ |
| Negative Parallelism  | "It's not X, it's Y"                                         | Y を直接述べる           |
| Dramatic countdown    | "Not X. Not Y. Just Z."                                      | Z を直接述べる           |
| Self-posed Q&A        | "The X? A Y."                                                | 1 文に統合する           |
| Anaphora abuse        | "They could... They could... They could..."                  | 文頭を変える             |
| Tricolon abuse        | 3 連発の rule-of-three                                       | 1 度だけ使う             |
| Filler transitions    | "It's worth noting", "Notably", "Interestingly"              | 完全に削る               |
| Shallow -ing analysis | "highlighting its importance", "reflecting broader trends"   | 削るか具体化する         |
| False ranges          | "from innovation to cultural transformation"                 | 実スケールでのみ使う     |
| Synonym cycling       | 同概念に "important" → "essential" → "critical" を循環使用 | 1 単語を選び、それを使う |

## 段落 / 構成

| Trope                       | パターン                                              | 修正                      |
| --------------------------- | ----------------------------------------------------- | ------------------------- |
| Short punchy fragments      | 1 単語または 1 句の独立段落                           | 実段落に統合する          |
| Listicle in trench coat     | "The first... The second... The third..."             | 実リストか実 prose を使う |
| Fractal summaries           | 各階層に要約                                          | 多くて 1 度要約する       |
| Dead metaphor               | 同一比喩を 1 ピース内で 5 回以上                      | 1 度使って次へ進む        |
| Historical analogy stack    | "Apple didn't... Facebook didn't... Stripe didn't..." | 例は 1 つまで             |
| One-point dilution          | 4000 語にわたって同主張を 10 通りに言い換え           | 1 度だけ言う              |
| Signposted conclusion       | "In conclusion", "To sum up", "In summary"            | 結論を述べる              |
| "Despite its challenges..." | 問題を認めるだけで否認する                            | 問題に取り組むか省略する  |

## トーン

| Trope                   | パターン                                     | 修正                        |
| ----------------------- | -------------------------------------------- | --------------------------- |
| False suspense          | "Here's the kicker", "Here's the thing"      | 要点を述べる                |
| Patronizing analogy     | "Think of it as..."                          | 読者を信頼する              |
| Futurism invitation     | "Imagine a world where..."                   | 実際の提案を記述する        |
| False vulnerability     | パフォーマティブな自己認識                   | 具体的にするか省略する      |
| "The truth is simple"   | 明瞭さを証明せず主張する                     | 証明する                    |
| Stakes inflation        | すべてが世界史的                             | 実スコープに合わせる        |
| Teacher mode            | "Let's break this down", "Let's unpack"      | 説明する                    |
| Vague attributions      | "Experts argue", "Industry reports suggest"  | 出典を明示するか削る        |
| Invented concept labels | "supervision paradox", "acceleration trap"   | 定義するか平易な言葉を使う  |
| Excessive hedging       | "may potentially", "it's possible that"      | 断定するか 1 度だけ条件付け |
| Chatbot residue         | "Of course!", "Happy to help", "Let me know" | 完全に削る                  |

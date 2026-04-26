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

Prose anti-patterns in AI-generated writing. Single use is fine; multiple tropes stacking = AI slop.

Applies to: PR descriptions, Issues, docs, blog posts, prose output.

Does NOT apply to: code, code comments, technical tables, commit messages.

## Word Choice

| Trope             | Examples                                     | Fix                          |
| ----------------- | -------------------------------------------- | ---------------------------- |
| Magic adverbs     | quietly, deeply, fundamentally, remarkably   | Cut or use specific language |
| AI vocabulary     | delve, leverage, robust, streamline, harness | Use plain words              |
| Grandiose nouns   | tapestry, landscape, paradigm, ecosystem     | Use concrete nouns           |
| "Serves as" dodge | serves as, stands as, marks, represents      | Use "is"                     |

## Sentence Structure

| Trope                 | Pattern                                                    | Fix                       |
| --------------------- | ---------------------------------------------------------- | ------------------------- |
| Negative Parallelism  | "It's not X -- it's Y"                                     | State Y directly          |
| Dramatic countdown    | "Not X. Not Y. Just Z."                                    | State Z directly          |
| Self-posed Q&A        | "The X? A Y."                                              | Merge into one sentence   |
| Anaphora abuse        | "They could... They could... They could..."                | Vary sentence openings    |
| Tricolon abuse        | Back-to-back rule-of-three                                 | Use once, not three times |
| Filler transitions    | "It's worth noting", "Notably", "Interestingly"            | Cut entirely              |
| Shallow -ing analysis | "highlighting its importance", "reflecting broader trends" | Cut or make specific      |
| False ranges          | "from innovation to cultural transformation"               | Only use on real scales   |
| Synonym cycling       | "important" → "essential" → "critical" for same concept    | Pick one word, use it     |

## Paragraph / Composition

| Trope                       | Pattern                                               | Fix                             |
| --------------------------- | ----------------------------------------------------- | ------------------------------- |
| Short punchy fragments      | One-word or one-phrase standalone paragraphs          | Combine into real paragraphs    |
| Listicle in trench coat     | "The first... The second... The third..."             | Use actual list or actual prose |
| Fractal summaries           | Summary at every level of the document                | Summarize once at most          |
| Dead metaphor               | Same metaphor 5+ times in one piece                   | Use once, move on               |
| Historical analogy stack    | "Apple didn't... Facebook didn't... Stripe didn't..." | One example max                 |
| One-point dilution          | Same thesis restated 10 ways across 4000 words        | Say it once                     |
| Signposted conclusion       | "In conclusion", "To sum up", "In summary"            | Just conclude                   |
| "Despite its challenges..." | Acknowledge problems only to dismiss them             | Engage with the problem or skip |

## Tone

| Trope                   | Pattern                                      | Fix                          |
| ----------------------- | -------------------------------------------- | ---------------------------- |
| False suspense          | "Here's the kicker", "Here's the thing"      | State the point              |
| Patronizing analogy     | "Think of it as..."                          | Trust the reader             |
| Futurism invitation     | "Imagine a world where..."                   | Describe the actual proposal |
| False vulnerability     | Performative self-awareness                  | Be specific or skip          |
| "The truth is simple"   | Asserting clarity instead of proving it      | Prove it                     |
| Stakes inflation        | Everything is world-historical               | Match stakes to actual scope |
| Teacher mode            | "Let's break this down", "Let's unpack"      | Just explain                 |
| Vague attributions      | "Experts argue", "Industry reports suggest"  | Name the source or cut       |
| Invented concept labels | "supervision paradox", "acceleration trap"   | Define or use plain language |
| Excessive hedging       | "may potentially", "it's possible that"     | Commit or qualify once       |
| Chatbot residue         | "Of course!", "Happy to help", "Let me know" | Cut entirely                 |

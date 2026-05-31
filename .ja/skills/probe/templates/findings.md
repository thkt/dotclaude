# /probe Findings: <repo>

- Date: YYYY-MM-DD
- Target: <absolute path>
- Outcome source: .claude/OUTCOME.md
- Scope: <例: Constraint 1 を深掘り、他は浅サンプル>

## Outcome Recap

<!-- OUTCOME.md の Behavior / Non-goals / Constraints を要約再掲。観点パスのアンカー。 -->

- Behavior: ...
- Non-goals: ...
- Constraints: ...

## Issues

<!-- 観点パス中に発見した issue 候補。これが最終アウトプット。severity なし、Category と Body のみ。 -->

### Issue-1: <Conventional Commits 形式の draft title>

- Category: Inconsistency (Issue カテゴリより選択)
- Labels: security, refactor, consistency
- Body:
  - 現状: <観察された実装、file:line で根拠提示>
  - 課題: <OUTCOME / ADR との乖離>
  - 提案: <具体的な修正方針>
  - 影響: <効果と工数>

### Issue-2: <title>

- Category: ADR drift
- Labels: docs, ADR drift
- Body:
  - 現状: ...
  - 課題: ...
  - 提案: ...
  - 影響: ...

## Open Questions

<!-- 詰まり時に 1 問だけ問うた質問と回答を durable に残す。未解決マーク許容。 -->

| ID  | 質問                                                     | ユーザー回答                    |
| --- | -------------------------------------------------------- | ------------------------------- |
| Q-1 | truncation signal を envelope に乗せないのは意図的設計？ | 意図的な設計と思われる (未確認) |

## /probe Self-Reflection

<!-- skill 挙動ログ。質問数、詰まり箇所のパターン、Positive issue の有無、観点パスの破綻有無。 -->

- 観点パス: <破綻なし / 破綻箇所と原因>
- 質問数: <N> / 観点数: <M>
- 詰まり箇所のパターン: <例: ADR と実装の用語ズレで頻発>
- Positive issues: <N 件>
- 新たな学び: <この dogfood で得た知見>

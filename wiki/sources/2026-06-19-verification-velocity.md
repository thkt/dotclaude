---
title: "Article: Fragments April 29 (Martin Fowler) — verification velocity / harness / conceptual modeling"
type: source
source_url: "https://martinfowler.com/fragments/2026-04-29.html"
ingested: 2026-06-19
created: 2026-06-19
updated: 2026-06-19
tags: [verification, harness, conceptual-modeling, knowledge-management]
---

## Summary
Fowler の fragment 集。Chris Parsons の AI コーディング指南更新を起点に、AI 時代の勝負は「速く作る」でなく「速く正しさを判定する(verification velocity)」へ移ったと整理。harness engineering、関数長/命名、概念の精密な定義、legibility(AI が読める形へ everything を流し込む)を横断。

## Key Facts
- 「Verified」の意味が変化: かつて「自分が読んだ」→ 今は agent throughput により「テスト・型・自動 gate・あるいは判断が要る所では人間がチェックした」。チェックは必ず起きるが常に頭の中ではない。
- verification velocity: 5 案を生成し午後のうちに 5 案とも検証できるチームが、1 案出して 1 週間フィードバック待ちのチームに勝つ。「Build better review surfaces, not better prompts」。
- senior の役割は「diff 承認係」化しつつある。出口は AI を訓練して初回から正しい diff にし、harness を形作る人になること。その役割はレビューと違い compound する。
- Tornhill: AI は人間のように code を理解せず token パターンから推論。命名を arbitrary に置換するとモデル性能が大幅低下。現行モデルは literal feature(名前・構造・局所文脈)に強く依存。
- 関数長の答えは行数でなく「intention と implementation の分離」=より良い構造を与えること。
- 「内部データの最難問は精密で一貫した定義」。LLM との効果的なコミュニケーションには精密・一貫した定義が不可欠で、会話の中で育て時間をかけて手入れする必要がある。conceptual modeling が agentic programming の鍵スキル。
- legibility: 同僚たちは email・議事録・スライドを AI が読めるファイルに流し込んでいる。AI は非構造情報の query が得意なので、これが AI の強みに効く。

## Concepts
### verification velocity
正しさ判定の速度が競争軸。投資先は prompt でなく review surface(検証面)。

### conceptual modeling / 定義を育てる
精密で一貫した概念定義を会話の中で育て手入れし続けることが、AI 協働の中心スキルになる。

### legibility
人間の知をすべて AI が読める形(ファイル/構造)にしておくこと。AI 時代の優位は legibility への先行投資で compound する。

## Related Pages
- [[topics/verification]]
- [[topics/harness-engineering]]
- [[topics/externalized-structure]]

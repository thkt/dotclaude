---
title: "Article: Harness engineering for coding agent users (Birgitta Böckeler)"
type: source
source_url: "https://martinfowler.com/articles/harness-engineering.html"
ingested: 2026-06-19
created: 2026-06-19
updated: 2026-06-19
tags: [harness, agent, verification, claude-code]
---

## Summary
コーディングエージェント利用における harness(モデル以外の全て)を体系化した記事。Agent = Model + Harness。利用者が組む outer harness は「一発で正しくやる確率を上げる」「人間の目に届く前に self-correct する feedback loop を作る」の二目的を持ち、レビュー負荷を下げトークン浪費を減らす。

## Key Facts
- harness は bounded context で意味が変わる。inner(builder)harness はツール組込み、outer(user)harness は利用者が自分のユースケース向けに組む。
- Guides(feedforward): 行動前に steer し初回成功確率を上げる。Sensors(feedback): 行動後に観測し self-correct させる。LLM 消費向けに最適化した linter メッセージは「良性の prompt injection」。
- 実行種別: Computational(決定論的・高速・信頼できる: test/linter/type checker/構造解析)と Inferential(意味解析・AI レビュー・LLM as judge: 遅く高価で非決定論)。
- 片方だけだと「同じミスを繰り返す(feedback only)」か「ルールを書くが効果不明(feedforward only)」になる。両輪が必要。
- steering loop: 同じ問題が複数回起きたら harness を改善するのが人間の仕事。AI で harness 自体も改善できる。
- Keep quality left: コストと速度に応じて check をライフサイクルの左へ寄せる。継続的 drift/health sensor は変更ライフサイクル外で常時走らせる。
- 規制カテゴリ 3 種: Maintainability(最も harness しやすい)/ Architecture fitness(fitness functions)/ Behaviour(最難、AI 生成テストへの過信が課題)。
- Harnessability: 強い型・明確なモジュール境界・フレームワークがあるほど sensor を作りやすい。legacy は最も harness が必要な所で最も作りにくい。

## Concepts
### Agent = Model + Harness
エージェントの能力はモデル単体でなく、周囲の harness(guides + sensors)との合算で決まる。

### Feedforward / Feedback と Computational / Inferential
guides(事前制御)と sensors(事後制御)を、決定論的 computational と非決定論的 inferential の 2 軸で配置する設計フレーム。

### steering loop
再発する問題を harness 改善で潰し続ける人間の中心的役割。

## Related Pages
- [[topics/harness-engineering]]
- [[topics/externalized-structure]]
- [[entities/claude-code]]

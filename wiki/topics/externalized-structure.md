---
title: "LLM の外部に知識・処理を構造化する"
type: topic
created: 2026-06-19
updated: 2026-06-19
tags: [knowledge-management, llm-wiki, harness, attention, cross-source]
---

## Overview
4 ソースを横断して浮かび上がった共通軸。LLM の内部能力やプロンプトを磨くより、LLM の外側に構造(知識・要約・ルール・sensor)を人間/システムが用意して与える方が、持続性・指示遵守・コスト効率・正しさで勝る場面が繰り返し現れる。

## Key Patterns
- **知識の永続化**: LLM Wiki は LLM の外に Markdown のナレッジ群(Wiki 層)と運用ルール(Schema 層)を構造化し、都度検索で消える RAG と違い知識を複利で蓄積する。(→ [[sources/2026-06-19-llm-wiki]])
- **小モデルの推論補強**: 大モデルが内部で行う「読み取り・確認・振り返り」を、AWAI が会話を思考の単位に要約・構造化して外側で具現化し、Flash Lite に渡すことで小モデルでも品質を保つ。attention 劣化はプロンプトでなく prompt の構造で解く。(→ [[sources/2026-06-19-summary-embedding-flash-lite]])
- **エージェントの能力拡張**: outer harness(guides + sensors)はモデルの外に置く構造で、初回成功確率を上げ自己修正させる。Agent = Model + Harness。(→ [[sources/2026-06-19-harness-engineering]])
- **legibility への先行投資**: 人間の知をすべて AI が読める形(ファイル・構造・精密な定義)にしておくと AI の強みに効き、優位が compound する。conceptual modeling が鍵スキル。(→ [[sources/2026-06-19-verification-velocity]])

## 共通する含意
- 役割分担が一貫する: 人間/システムが「構造を設計し問いを立てる」、bookkeeping・往復・検索・self-correction は LLM/embedding/sensor に委譲する。
- 投資先は内部(prompt/モデル)でなく外部(知識/要約/harness/review surface)。後者は compound するが前者はしない。

## Sources
- [[sources/2026-06-19-llm-wiki]]
- [[sources/2026-06-19-summary-embedding-flash-lite]]
- [[sources/2026-06-19-harness-engineering]]
- [[sources/2026-06-19-verification-velocity]]

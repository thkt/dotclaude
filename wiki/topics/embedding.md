---
title: "Embedding / ベクトル検索"
type: topic
created: 2026-06-19
updated: 2026-06-19
tags: [embedding, rag, vector-search]
---

## Overview
テキストを数値ベクトルに変換し、cosine 類似度で意味的に近い情報を検索する技術。RAG の DB構築・検索の中核であり、長文脈圧縮の手段でもある。

## Key Patterns
- チャンキング・文脈保持が embedding 品質の前段を支配する。(→ rag-chaos-map § DB構築)
- 「要約 vs 要約」で抽象度を揃えて embedding すると cosine 類似度が安定する。生発言と過去要約を直接比較しない。(→ summary-embedding-flash-lite)
- 遠い過去を「思考の単位」に要約 + embed し、現発言と関連の高いものだけ retrieval することで長文脈の attention 劣化を回避できる。

## Sources
- [[sources/2026-06-19-rag-chaos-map]]
- [[sources/2026-06-19-summary-embedding-flash-lite]]

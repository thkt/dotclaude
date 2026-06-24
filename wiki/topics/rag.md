---
title: "RAG (Retrieval-Augmented Generation)"
type: topic
created: 2026-06-19
updated: 2026-06-19
tags: [rag, knowledge-management, embedding]
---

## Overview
LLM に外部資料を読み込ませ要約・回答させる手法。便利だが、質問のたびにゼロから探し直すため知識が永続蓄積しないのが構造的限界(LLM Wiki 記事の問題提起)。一方で、長文脈チャットの attention 劣化対策としても retrieval は有効に使える(Flash Lite 記事)。

## Key Patterns
- パイプライン分解で精度改善: DB構築 → クエリ生成 → 検索 → 後処理 → 生成 → 評価の 6 段階。症状から原因段階を特定して技術を当てる。(→ rag-chaos-map)
- ハイブリッド検索(キーワード + 意味類似度)、リランキング、コンテキスト圧縮が後処理の柱。
- retrieval を「過去要約の意味検索」に使い、長文脈の生履歴再投入を避けて attention 劣化を回避できる。(→ summary-embedding-flash-lite)
- LLM Wiki は RAG の「非蓄積」を補う対案。RAG = 都度検索、LLM Wiki = 永続成果物。両者は排他でなく補完。

## Sources
- [[sources/2026-06-19-llm-wiki]]
- [[sources/2026-06-19-rag-chaos-map]]
- [[sources/2026-06-19-summary-embedding-flash-lite]]

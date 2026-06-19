---
title: "LLM Wiki"
type: topic
created: 2026-06-19
updated: 2026-06-19
tags: [knowledge-management, llm-wiki]
---

## Overview
Andrej Karpathy 提唱の知識管理パターン。LLM が個人ナレッジベースを持続的に構築・管理し、知識が複利(compounding)で育つ persistent artifact。RAG が都度ゼロ検索で蓄積しないのと対比される。

## Key Patterns
- 三層構造: Raw sources(LLM読取専用) / Wiki(LLM管理 Markdown) / Schema(人間定義ルール)。
- 3 オペレーション: Ingest / Query / Lint。
- 最大価値は「繋げる力」: 複数ソース横断の概念ページを自動生成。
- Bookkeeping は LLM 委譲。1 ingest で 10〜15 ページ書き換え。
- 育て方: 完成アプリでなく手元エージェント(Claude Code)と Schema を反復改善。

## Sources
- [[sources/2026-06-19-llm-wiki]]

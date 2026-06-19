---
title: "Article: Gemini Flash Lite が 20 ターンで壊れるのを、要約を embedding することで止めた話"
type: source
source_url: "https://zenn.dev/officekamiya/articles/69de32dd33f37b"
ingested: 2026-06-19
created: 2026-06-19
updated: 2026-06-19
tags: [embedding, rag, attention, knowledge-management]
---

## Summary
Gemini Flash Lite が 20 ターン超で応答品質を崩す(defensive degradation)現象を、生履歴を再投入せず「要約を embedding して関連箇所だけ渡す」二段プロンプト構造で止めた実装記。Pro へのコスト増を回避しつつ Flash Lite のまま 25 ターン超で安定。

## Key Facts
- 症状: 長文脈で禁止語彙の復活、敬語とタメ口の混在、抽象名詞化 = system_prompt の指示が見えていない振る舞い。
- 根本原因は context window 超過(1M 中 3,000 tokens で余裕)ではなく attention の重み付け劣化。先頭の system_prompt が長文脈で相対的に薄まり、直近の AI 自己出力が模範として強く効く。
- プロンプトをいくら磨いても「磨いた prompt 自体が attention 上で目立たなくなる」ため根治しない。prompt の内容でなく構造を変える必要がある。
- 解法: 直近 N ターンは生で残し、遠い過去は「思考の単位」に要約 + embed、現発言と意味的に関連の高い過去要約だけを cosine で選んで渡す。
- 設計の核心は「要約 vs 要約」で embedding すること(生 vs 生でなく抽象度を揃える)。
- Pro が内部でやる「読み取り・確認・振り返り」を、外側で構造として具現化し小モデルに与える発想。Bartlett の Schema theory と通底。

## Concepts
### attention 重み付け劣化
長文脈で先頭ルールの attention が相対的に薄まり指示遵守が崩れる。容量制限と別問題。小モデルほど顕著。

### 要約 vs 要約の embedding (abstraction matching)
比較する両者の抽象度を揃えると cosine 類似度が安定する。生発言と過去要約を直接比較しない。

### 外部構造化による小モデル補強
大モデルが内部で行う往復処理を、外側で構造化して与えることで小モデルでも品質を出す。

## Related Pages
- [[topics/rag]]
- [[topics/embedding]]
- [[topics/externalized-structure]]

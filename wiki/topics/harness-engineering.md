---
title: "Harness Engineering"
type: topic
created: 2026-06-19
updated: 2026-06-19
tags: [harness, agent, verification]
---

## Overview
コーディングエージェントの「モデル以外の全て」を意図的に設計する営み。Agent = Model + Harness。inner(ツール組込み)と outer(利用者が組む)に分かれ、outer harness は初回成功確率の向上と人間到達前の self-correction を担う(Böckeler)。

## Key Patterns
- Guides(feedforward, 行動前 steer) + Sensors(feedback, 行動後 self-correct)の両輪。片輪だと同じミス反復 or 効果不明になる。(→ harness-engineering)
- 実行種別 2 軸: Computational(決定論・高速・信頼: test/linter/type/構造解析)と Inferential(意味判断・AI レビュー: 高価・非決定論)。computational sensor は毎変更で回せる。(→ harness-engineering)
- LLM 向けに最適化した linter メッセージ(自己修正手順入り)は「良性の prompt injection」。
- steering loop: 再発問題を harness 改善で潰すのが人間の中心的役割。harness 改善自体も AI で安価に。(→ harness-engineering)
- 規制カテゴリ: maintainability / architecture fitness / behaviour。behaviour が最難。
- verification velocity との接続: 「Build better review surfaces, not better prompts」。senior の価値は harness を形作ること、それは review と違い compound する。(→ verification-velocity)

## Sources
- [[sources/2026-06-19-harness-engineering]]
- [[sources/2026-06-19-verification-velocity]]

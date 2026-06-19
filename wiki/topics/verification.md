---
title: "Verification (AI 時代の検証)"
type: topic
created: 2026-06-19
updated: 2026-06-19
tags: [verification, harness]
---

## Overview
AI 時代の競争軸は「速く作る」でなく「速く正しさを判定する」へ移った(verification velocity)。agent throughput により「Verified」は「自分が読んだ」から「テスト・型・自動 gate・判断が要る所では人間がチェックした」へ意味が変わる。

## Key Patterns
- 5 案を生成し午後のうちに全案検証できるチームが、1 案を 1 週間待つチームに勝つ。(→ verification-velocity)
- 投資先は prompt でなく review surface(検証面)。feedback を不要にできる所は agent に realistic 環境で自己検証させ、不可な所は feedback を即時化する。
- harness の sensor が verification を担う。computational sensor は毎変更で回せ非決定論を含まない。(→ harness-engineering)

## Sources
- [[sources/2026-06-19-verification-velocity]]
- [[sources/2026-06-19-harness-engineering]]

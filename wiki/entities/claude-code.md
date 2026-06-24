---
title: "Claude Code"
type: entity
created: 2026-06-19
updated: 2026-06-19
tags: [claude-code, agent, tooling, harness]
---

## Overview
Anthropic の CLI コーディングエージェント。LLM Wiki の運用では「手元の AI エージェント」として Wiki を一緒に育てる主体、harness engineering の文脈では inner harness の優位を持つ推奨ツールに位置づけられる。

## Key Properties
- 完成アプリのインストールでなく、エージェントと Schema/テンプレートを反復改善して外部脳を育てる前提。(→ [[sources/2026-06-19-llm-wiki]])
- inner(builder)harness が充実しており、Codex CLI と並んで agentic engineering の推奨ツール。利用者は outer harness を上に組める。(→ [[sources/2026-06-19-harness-engineering]], [[sources/2026-06-19-verification-velocity]])

## Usage Notes
- wiki plugin は Claude Code の Stop hook + skills として LLM Wiki パターンを実装する。Stop hook の `claude --bare -p` は OAuth スキップで現状動かず、手動 ingest が当面の運用。

## Sources
- [[sources/2026-06-19-llm-wiki]]
- [[sources/2026-06-19-harness-engineering]]
- [[sources/2026-06-19-verification-velocity]]

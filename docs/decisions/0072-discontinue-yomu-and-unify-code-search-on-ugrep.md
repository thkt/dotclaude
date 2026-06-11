---
status: "accepted"
date: 2026-06-09
decision-makers: thkt
---

# ADR-0072: yomu 利用停止とコード検索の ugrep/bfs 統一

## Context and Problem Statement

yomu (semantic code search CLI。TS/JSX/CSS/HTML/Rust/Markdown 対応。ADR-0017 で構築、ADR-0022 で MCP から CLI 化) を dotclaude の skill/agent からコード検索インフラとして利用してきた。`yomu search` (embedding ベースの意味検索)、`yomu impact` (依存グラフによる影響分析)、explore skill (`.yomu/index.db` を SQL 探索) を提供していた。

2026-06-09、yomu の利用および強化開発 (`brief` コマンド追加等の WIP) を停止する決定がなされた。本 ADR はこの決定の技術的影響範囲と、dotclaude からの yomu 参照除去を記録する。

## Decision Drivers

> 停止の確定理由はユーザー未記載。以下は技術的観点からの推定ドライバー (要ユーザー確認)。

- コード検索を ugrep/bfs に一本化し、ツールチェーンを単純化する
- ugrep/bfs は全言語対応 (yomu は TS/JSX/CSS/HTML/Rust/Markdown に限定されていた)
- yomu インデックスの維持 (rebuild、embedding モデル、SQLite スキーマ migration) が継続的に必要だった
- 意味検索・依存グラフ検索の喪失は受容可能と判断

## Considered Options

### Option 1: yomu 完全廃止、ugrep/bfs 統一 (採用)

yomu への全参照を削除。use-cli-yomu / explore skill を削除。全言語のコード検索を ugrep/bfs に統一する。

- Good: ツールチェーン単純化、インデックス維持コスト消滅
- Good: ugrep/bfs は全言語対応で検索ルールが単純化
- Bad: 意味検索 (概念クエリ) の喪失
- Bad: explore の import/caller 依存グラフ検索の喪失

### Option 2: yomu 参照だけ外し skill は残す

- Bad: 使われない skill が discovery noise として残る
- Bad: yomu バイナリ前提の記述が陳腐化したまま残り中途半端

### Option 3: 維持

- Good: 意味検索・依存グラフ検索を保持
- Bad: 利用しないツールの維持コストが継続

## Decision Outcome

Chosen: Option 1。yomu を dotclaude の検索インフラから完全に外す。意味検索と explore の依存グラフ検索の喪失を受容し、コード検索を ugrep/bfs に全面統一する。

## Positive Consequences

- `skills/use-cli-yomu/`, `skills/explore/` とその `.ja` ミラーを削除
- agent frontmatter から `Bash(yomu:*)` / `Bash(sqlite3:*)` tool grant と `use-cli-yomu` skill 参照を除去
- ツール選択ルール (TOOLS.md) が全言語 ugrep/bfs に統一され単純化
- yomu インデックス (`.yomu/`) の維持・rebuild が不要に

## Negative Consequences

- 概念検索 ("auth flow" 等の意味的クエリ) が ugrep のパターン検索に劣化
- explore skill の caller/import 依存グラフ探索が失われる (ugrep の手動逆引きで代替)
- yomu を共通基盤とする amici (sae/yomu/recall 共通クレート構想、BACKLOG) の前提が変化。再検討が必要

## Scope

適用対象:

- `skills/use-cli-yomu/`, `skills/explore/` 削除 (+ `.ja` ミラー)
- agents (architect-feature, critic-audit/design/evidence, enhancer-evidence, reviewer 群, team-integration) の frontmatter から yomu/sqlite3 tool grant と use-cli-yomu skill 参照を除去 (+ `.ja`)
- `rules/development/TOOLS.md` の Code search を全言語 ugrep/bfs に統一
- `rules/conventions/SKILLS.md`, `SUBAGENT.md`, `workflows/MODULARIZATION.md`, `core/templates/outcome.md` の yomu 例を別 CLI に置換
- `settings.json` から `Bash(yomu *)` permission 削除
- skills 本文 (research, challenge, audit-adr-drift, audit-adr-gaps, use-cli-heptabase, use-cli-recall) の yomu 参照除去
- `docs/CLI_TOOLS.md` の yomu セクション + Mermaid 削除、`ONBOARDING.md`, `SKILLS_AGENTS.md` の yomu 言及削除
- `BACKLOG.md` の yomu を `dormant` + 利用停止注記に更新
- memory 運用指示系 3 ファイル (structural-refactoring-adr-first, adr-as-verify-trigger, inline-code-minimal-use) の yomu search 指示を recall/ugrep に置換

対象外:

- yomu 関連 ADR (0017/0018/0019/0022/0069 等) — 歴史的記録として保持。本 ADR が supersede
- yomu CLI リポジトリ本体 (`~/GitHub/cli/yomu`) — dotclaude 外。継続/アーカイブは別途判断
- `workspace/` 配下の planning/research/delta — 歴史的記録
- amici/rurico の yomu 統合記述 (BACKLOG) — 過去の事実として保持
- yomu の開発記録系 memory (rag-improvement, agent-friendly-cli, local-embedding-strategy 等) — 参考記録として保持

## Reassessment Triggers

- ugrep/bfs のパターン検索では概念検索ニーズを満たせないと判明した時
- 依存グラフ検索 (impact 分析) の喪失が具体的に作業を阻害した時
- ローカル embedding 検索の ROI が再評価された時

## Related ADRs

- [ADR-0017: Build frontend code search MCP in Rust](0017-build-frontend-code-search-mcp-in-rust.md) - yomu の起源。本 ADR が supersede
- [ADR-0018: Index-time file context storage for explorer](0018-index-time-file-context-storage-for-explorer.md) - explore 基盤。本 ADR が supersede
- [ADR-0019: Adopt SQLite reference graph for impact analysis](0019-adopt-sqlite-reference-graph-for-impact-analysis.md) - impact 分析基盤。本 ADR が supersede
- [ADR-0022: Migrate yomu from MCP to CLI](0022-migrate-yomu-from-mcp-to-cli.md) - yomu の CLI 化。本 ADR が supersede
- [ADR-0069: Adopt yomu indirect prompt injection defense](0069-adopt-yomu-indirect-prompt-injection-defense.md) - yomu の PI 防御。本 ADR が supersede
- [ADR-0056: Remove redundant CLI wrapper skills](0056-remove-redundant-cli-wrapper-skills.md) - use-cli-yomu を load-bearing として維持した決定。本 ADR が部分 supersede

---

_Created: 2026-06-09_
_Author: thkt_
_ADR Number: 0072_

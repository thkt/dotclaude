---
name: use-workflow-plan-preview
description: Internal helper for /think Step 11. Renders SOW.md + Spec.md as an integrated Astro view and returns a dev server URL.
when_to_use: Called only from /think Step 11 after reviewer-spec passes. Not user-invokable.
allowed-tools: Read Write Edit Bash
user-invocable: false
---

# use-workflow-plan-preview

`/think` の Step 11 から呼ばれる workflow ヘルパー。SOW.md + Spec.md を Astro project (`~/.claude/workspace/views/`) で render し、ブラウザで読みやすい統合 view を作る。

ユーザーが直接叩く skill ではない (`/think` 内部からのみ起動)。

## 引数 (caller `/think` から渡される)

`$1`: planning slug (例: `2026-05-08-issue-53-annotation-foundation`)

## 手順

1. `~/.claude/workspace/planning/$1/sow.md` と `spec.md` を Read で取得
2. short-slug を決定: 引数の末尾から意味のあるキーワードを抽出
   - 例: `2026-05-08-issue-53-annotation-foundation` → `issue-53` または `annotation-foundation`
3. テンプレートをコピー
   - source: `${CLAUDE_SKILL_DIR}/templates/spec.mdx`
   - dest: `~/.claude/workspace/views/src/content/<short-slug>.mdx`
4. frontmatter を埋める (sow.md から抽出)
   - `title`: H1 行
   - `subtitle`: Why → Outcome の (a) 1 文目を要約
   - `status`: `## Status` 直下 (draft / approved / done)
   - `updatedAt`: 今日の日付 YYYY-MM-DD
   - `sessionId`: `Session:` 行から
   - `issueUrl`: Reference の GitHub URL
5. 各 tab の placeholder を埋める (詳細は次節)
6. dev server を起動 or 確認: `cd ~/.claude/workspace/views && bun run dev`
   - すでに port 4321 で動いてるなら省略
7. ユーザーに `http://localhost:4321/spec/<short-slug>` を共有

## Tab → source マッピング

| Tab          | sow.md / spec.md の section                                                    |
| ------------ | ------------------------------------------------------------------------------ |
| overview     | sow.md の Why / Approach / Background                                          |
| scope        | sow.md の Scope (In/Out) / Three-Tier Boundaries                               |
| ac           | sow.md の Acceptance Criteria                                                  |
| phases       | sow.md の Implementation Plan (Phase 1/2/3)                                    |
| spec         | spec.md の Functional Requirements / Validation / Non-Functional / Assumptions |
| domain       | spec.md の Domain Model (Entities / Business Rules)                            |
| tests        | spec.md の Test Scenarios                                                      |
| risks        | sow.md の Risks + spec.md の Reassessment Triggers                             |
| traceability | spec.md の Traceability Matrix + Implementation の Phase × FR                  |

## Components 用法

| Component  | 使い方                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| TabPanel   | `<TabPanel id="overview" initial>...</TabPanel>`                                        |
| Pill       | `<span class="pill-ac">AC-1</span>` (または `<Pill variant="ac">`)                      |
| Tier       | `<span class="tier-always">必須</span>` (または `<Tier variant="always" />`)            |
| Term       | `<span class="term" data-tip="...">用語</span>`                                         |
| Card       | `<div class="card"><div class="label">X</div><p>...</p></div>`                          |
| Card grid  | `<div class="card-grid">...8 cards...</div>`                                            |
| SearchBox  | `<SearchBox id="fr-filter" placeholder="..." />`                                        |
| ChipGroup  | `<ChipGroup id="test-chips" chips={[{type, label}, ...]} initial="all" />`              |
| PhaseFlow  | `<PhaseFlow phases={[{num, title, subtitle, bullets, outcome, tone}]} caption="..." />` |
| DataFlow   | `<DataFlow boxes={[...]} edges={[...]} />`                                              |

## MDX エスケープ

| 注意箇所                    | 修正                                  |
| --------------------------- | ------------------------------------- |
| `{0..9}` (波括弧 + 範囲)    | `\{0..9\}`                            |
| `[*]` (ブラケット + アスタ) | `[&#42;]`                             |
| `{key: value}` JSON 風      | `{"{key: value}"}`                    |
| `${var}` template literal   | string 内で `{"...${var}..."}` で囲む |

## 参照実装

具体的な書き方は `~/.claude/workspace/views/src/content/spec/issue-61.mdx` を参考にする (9 tab すべて埋まったサンプル)。

## 完了基準

- `~/.claude/workspace/views/src/content/<short-slug>.mdx` が存在
- dev server で `http://localhost:4321/spec/<short-slug>` がエラーなく表示
- 各 tab に対応 content が反映されている
- placeholder が残っていない (`{/* PLACEHOLDER */}` の検索結果ゼロ)

## 制約

- sow.md / spec.md は変更しない (read-only)
- planning ディレクトリは変更しない
- views/ 配下のみ書き込み可

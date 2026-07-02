---
name: use-workflow-plan-preview
description: /think Step 11 の内部ヘルパー。SOW.md + Spec.md を統合 Astro view として render し、dev server の URL を返す。
when_to_use: Called only from /think Step 11. Not user-invokable.
allowed-tools: Read Write Edit Bash
user-invocable: false
---

# use-workflow-plan-preview

`/think` の Step 11 から呼ばれる workflow ヘルパー。SOW.md + Spec.md を Astro project (`~/.claude/workspace/views/`) で render し、ブラウザで読みやすい統合 view を作る。

ユーザーが直接呼び出す skill ではない (`/think` 内部からのみ起動)。

## 引数 (caller `/think` から渡される)

`$1` は planning slug (例 `2026-05-08-issue-53-annotation-foundation`)。

## 手順

1. `~/.claude/workspace/planning/$1/sow.md` と `spec.md` を Read で取得
2. `$1` の末尾のキーワードから short-slug を決める (例 `2026-05-08-issue-53-annotation-foundation` → `issue-53` または `annotation-foundation`)
3. ${CLAUDE_SKILL_DIR}/templates/spec.mdx を `~/.claude/workspace/views/src/content/<short-slug>.mdx` にコピー
4. frontmatter を埋める (sow.md から抽出)
   - `title`. H1 行
   - `subtitle`. Why → Outcome の (a) 1 文目を要約
   - `status`. `## Status` 直下 (draft / approved / done)
   - `updatedAt`. 今日の日付 YYYY-MM-DD
   - `sessionId`. `Session:` 行から
   - `issueUrl`. Reference の GitHub URL
5. 各 tab の placeholder を埋める (マッピングは下表)
6. dev server を `cd ~/.claude/workspace/views && bun run dev` で起動または確認
   - すでに port 4321 で動いているならスキップ
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

| Component | 使い方                                                                                  |
| --------- | --------------------------------------------------------------------------------------- |
| TabPanel  | `<TabPanel id="overview" initial>...</TabPanel>`                                        |
| Pill      | `<span class="pill-ac">AC-1</span>` (または `<Pill variant="ac">`)                      |
| Tier      | `<span class="tier-always">必須</span>` (または `<Tier variant="always" />`)            |
| Term      | `<span class="term" data-tip="...">用語</span>`                                         |
| Card      | `<div class="card"><div class="label">X</div><p>...</p></div>`                          |
| Card grid | `<div class="card-grid">...8 cards...</div>`                                            |
| SearchBox | `<SearchBox id="fr-filter" placeholder="..." />`                                        |
| ChipGroup | `<ChipGroup id="test-chips" chips={[{type, label}, ...]} initial="all" />`              |
| PhaseFlow | `<PhaseFlow phases={[{num, title, subtitle, bullets, outcome, tone}]} caption="..." />` |
| DataFlow  | `<DataFlow boxes={[...]} edges={[...]} />`                                              |

`tone` 値は component ごとに異なる。未定義値は runtime error になる。

| Component | 許可される tone                              |
| --------- | -------------------------------------------- |
| PhaseFlow | `accent` / `warn` / `pass`                   |
| DataFlow  | `info` / `warn` / `accent` / `pass` / `fail` |

## MDX エスケープ

| 注意箇所                                    | 修正                                  |
| ------------------------------------------- | ------------------------------------- |
| `{0..9}` (波括弧 + 範囲)                    | `\{0..9\}`                            |
| `[*]` (ブラケット + アスタリスク)           | `[&#42;]`                             |
| `{key: value}` JSON 風                      | `{"{key: value}"}`                    |
| `${var}` template literal                   | string 内で `{"...${var}..."}` で囲む |
| `<code>foo*</code>` (code 内のアスタリスク) | `<code>foo&#42;</code>`               |
| `<code>__name</code>` (code 内のダンダー)   | `<code>\_\_name</code>`               |

## 参照実装

${CLAUDE_SKILL_DIR}/templates/spec.mdx を canonical example として使う (9 tab すべて埋まっている)。

## 完了基準

- `~/.claude/workspace/views/src/content/<short-slug>.mdx` が存在
- dev server で `http://localhost:4321/spec/<short-slug>` がエラーなく表示
- 各 tab に sow.md / spec.md の対応 content が反映されている
- placeholder が残っていない (`{/* PLACEHOLDER */}` の検索結果ゼロ)

## 制約

- sow.md / spec.md は変更しない (read-only)
- planning ディレクトリは変更しない
- 書き込みは `~/.claude/workspace/views/` 配下のみ

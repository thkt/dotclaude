# Prompt audit: Opus 5.5 向け (2026-09-23)

`/claude-api prompt-audit` を ~/.claude の prompt surface 全体に実行した結果。ファイルは一切変更していない。各指摘の置換文 (ja/en 両方)、provenance、影響するテストは `2026-09-23-prompt-audit-opus-5-5/p*.md` の該当 ID にあり、それが提案差分を兼ねる。複数の ID が同じ行を書き換える箇所は、§ 統合時の採用文の文を優先する。

## 前提 (Step 0)

| 項目                               | 前提                                                                                   | 根拠                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 対象モデル                         | Claude Opus 5.5                                                                        | 起点の投稿、`settings.json` の `modelSettings.claude-opus-5-5`、このセッションのモデル |
| sonnet / haiku 指定の agent・stage | そのモデルで判定                                                                       | frontmatter の `model:` と workflow 呼び出し側の `model:`                              |
| 範囲                               | 英語側 (実際にロードされる側) を判定し、置換文は `.ja/` (canonical) と英語の両方で提示 | MIRROR.md / ADR-0073                                                                   |
| 対象外                             | `skills/synced/` (gitignore 済み、upstream が同期で上書き)                             | `.gitignore:115`                                                                       |

走査したファイルは、rules 20、agents 51、skills 95、workflows 8、hooks 20 と `settings.json`。`.ja/` の mirror も読んだ。

## 結論

Opus 5.5 に固有の型に当たったのは 1 件だけだった。`use-cli-recall/SKILL.md:13` の "call without deliberation" (p4-H1) である。Opus 5.5 は thinking が常に有効なので、この no-think 規則には従えない。そのほかの 5.5 向け grep は 0 件だった。対象は次のとおり。

- 推論を出力に書かせる指示 (`reasoning_extraction` refusal の原因になる)
- 途中経過の報告を抑える指示 (update suppressor)
- thinking 無効化を前提にした指示
- 日付付きの固定モデル ID
- 指示としての大文字 MUST/NEVER/CRITICAL (例文の中に 1 件あるだけ)

残りの指摘は、それより前の世代から残っている型である。影響が大きい順に次の 3 つ。

1. finding 段が「迷ったら落とす」と指示している (High 5)。
   - 該当するのは `finding-disposition.md:41` の "When uncertain, prefer SKIP"、`finding-schema.md:35-37` の Reporting Bar ("without hedging … Otherwise, do not report")、efficiency/security/rust の各 reviewer が持つ severity 床である。
   - migration guide は、Opus 4.7 以降と Sonnet 5 で recall を下げる型としてこれを名指ししている。
   - 後段には critic-audit という false positive を落とす段が既にある。`audit.js:627` の spawn prompt も "include it rather than skip" と逆のことを言っており、reviewer は矛盾する 2 つの指示を受け取っている。
2. 決定論的な仕事を LLM が行っている (High 2、Medium 2)。
   - `shake.js` では sonnet が同じコマンドを 10 回実行する。
   - `adrift.js` では、構造も数値も決まっている報告書を LLM が描画している。
   - `build.js` では、テンプレート化された Plan の抽出を LLM が行っている。
   - `audit.js` では、xhigh の critic-evidence の出力が `verify_ran` の真偽値としてしか使われない。DR-0011 の Reassessment Trigger 1 (`docs/decisions/0011-add-evidence-verifier-to-audit-pipeline.md:136`「Integrator が両方を読む必要が無くなったとき」) は、Integrate がどちらの出力も読まないので満たされている。
3. 英語 mirror が canonical からずれている (3 件)。Opus 5.5 の型ではないが、実害がある。
   - `reviewer-rust.md:81` は意味が逆転している。英語の "flag conservatively" は報告を減らす方向、ja の「フラグ寄り」は報告を増やす方向である。`calibration/RU.md` は存在しないので、この分岐は Rust のレビューのたびに発火する。
   - `audit.js:627` では英語だけが "Do NOT" と大文字になっている。
   - `rules/core/OPERATION.md:48-49` の 2 行が `.ja/` に無い (p1-L6)。

## 件数

| パーティション    | High | Medium | Low |
| ----------------- | ---- | ------ | --- |
| CLAUDE.md + rules | 0    | 5      | 6   |
| agents            | 5    | 7      | 6   |
| skills 前半       | 0    | 3      | 4   |
| skills 後半       | 1    | 5      | 2   |
| workflows + hooks | 2    | 6      | 2   |
| 合計 (重複を含む) | 8    | 26     | 20  |

重複を統合すると High 8、Medium 22、Low 20 になる。統合した組は次の 3 つ。

- p2-H3 と p4-M2
- p2-M5 と p5-M1
- p1-M1、p5-M6、p2-M4 の 3 件

## 指摘一覧 (High / Medium、テーマ別)

ID は各パーティションファイル内の見出しに対応する。

### A. finding 段の recall 抑制 (High 5)

| ID            | 場所                                                                                                                | 内容                                                        | 対処                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| p2-H1         | `agents/_lib/finding-disposition.md:41,45`                                                                          | "When uncertain, prefer SKIP"、cold path は high 未満を除外 | 迷ったら報告し、問いは verification に書く                                                                   |
| p2-H2         | 同 `:35,37`                                                                                                         | "wouldn't block the PR"、修正規模で除外                     | 好みだけを除外し、Fix Proportionality は除外しない                                                           |
| p2-H3 + p4-M2 | `agents/_lib/finding-schema.md:35-41`、`reviewer-security.md:46,67`、`use-context-reviewer-security/SKILL.md:43,50` | Reporting Bar と security の `low` 除外                     | 網羅を優先する bar に書き換える。security は `harness-freshness.test.ts` があるため blind run の再実行が要る |
| p2-H4         | `agents/reviewers/reviewer-rust.md:81` (英語のみ)                                                                   | "flag conservatively" (ja と逆の意味)                       | "lean toward reporting" に直す                                                                               |
| p2-H5         | `agents/reviewers/reviewer-efficiency.md:18,40-44,61`                                                               | "Flag only severe"                                          | 経路の頻度は除外ではなく severity に反映する                                                                 |

### B. 決定論的な仕事を担う LLM 呼び出し (High 2、Medium 2)

| ID            | 場所                                  | 対処                                                                                                                                              |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| p5-H1         | `workflows/shake.js:258-271,363-374`  | ループを `shake/run.ts` に移し、haiku が中継する。"Do not reduce the count" は不要になる。制約は下の注記を参照                                    |
| p5-H2         | `workflows/adrift.js:470-501,514-529` | 描画を `adrift/report.ts` に移し、report と confirm-report の 2 呼び出しを 1 つの中継にまとめる                                                   |
| p5-M2         | `workflows/build.js:483-501`          | `build/parse-plan.ts` を追加し、自由文のフィールドだけ LLM に残す                                                                                 |
| p2-M5 + p5-M1 | `workflows/audit.js:803-815,874`      | (a) critic-evidence の呼び出しを削除する (推奨)、または (b) triage に接続する。DR-0011 / DR-0095 と衝突するので、どちらを選んでも DR の更新が要る |

p5-H1 の注記。Bash tool は 1 回の呼び出しを 600000 ms で打ち切る。いまは 10 回の実行がそれぞれ別の呼び出しなので、1 回ずつに上限が掛かっている。10 回を 1 回の中継にまとめると、遅い suite では合計がこの上限を超える。対処は 3 つのどれかになる。

- 中継を 1 回の実行ごとに分ける
- 中継側で `run_in_background` を使う
- `run.ts` 側で 1 回あたりの timeout を持たせ、超過を fail として記録する

### C. 思考やツール呼び出しを煽る文 (High 1、Medium 2)

| ID    | 場所                                | 内容                                                                                           |
| ----- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| p4-H1 | `skills/use-cli-recall/SKILL.md:13` | "call without deliberation" は、Opus 5.5 では従えない no-think 規則になる                      |
| p4-M1 | `skills/use-cli-scout/SKILL.md:13`  | "When unsure, fetch." は tool booster                                                          |
| p1-M4 | `rules/development/TOOLS.md:19`     | モジュールに初めて触れるたびに、codegraph と recall を無条件に並列実行させる。常時ロードされる |

### D. 数値による出力上限 (1f、Medium 4)

以下はすべて PROSE.md の 25 語規約と衝突する。採否はユーザーが判断する。

| ID                    | 場所                                                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p1-M1 + p5-M6 + p2-M4 | `rules/conventions/PROSE.md:53` (25 語 / 150 語)、`WORKFLOWS.md:14`、`workflows/build.js:934,970,1178-1185`、`reviewer-conformance.md:65`、`reviewer-reuse.md:53` |
| p2-M3                 | `critic-design.md:58-60,65` (弱点を上位 3 件に制限)                                                                                                               |
| p3-M1                 | `skills/challenge/SKILL.md:84` (Top 3)                                                                                                                            |
| p3-M2                 | `skills/dr/SKILL.md:40` (節ごとの行数)                                                                                                                            |

### E. 圧力・禁止・一般論 (Medium 5)

| ID    | 場所                                                                 | 内容                                                                                 |
| ----- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| p2-M2 | `critic-audit.md:18`、`critic-design.md:19`、`critic-evidence.md:18` | "Do not save tokens" は xhigh の上に重ねた booster。深さは effort で制御する         |
| p5-M4 | `workflows/audit.js:627` (英語のみ)                                  | "Do NOT" を ja に合わせる                                                            |
| p1-M3 | `rules/core/PREFLIGHT.md:39-49`                                      | Rationalization Counters。「速度より正しいプロセス」の行が User Authority と矛盾する |
| p1-M2 | `rules/core/OPERATION.md:21-29`                                      | Anti-Sycophancy 表。禁止を並べるだけで置換がなく、PROSE.md:72 に反する               |
| p1-M5 | `rules/core/OPERATION.md:5-11`                                       | 一般論の 3 行 (「安全境界を維持する」など)                                           |

### F. 古い、または互いに矛盾する記述 (Medium 7)

| ID    | 場所                                                                                      | 内容                                                                                                                      |
| ----- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| p4-M4 | `use-workflow-tdd-cycle/references/feature-driven.md` 他                                  | 今は存在しない `/code` の対話フロー (it.skip) を記述し、Vertical Slices Only と矛盾する。3 つの agent が preload している |
| p4-M3 | `use-workflow-tdd-cycle/SKILL.md:52-54` 他                                                | 秒単位のサイクル。3 ファイルで 2.5 分 / 2 分 / 5〜10 分と食い違う                                                         |
| p4-M5 | `use-context-reviewer-readability/references/control-flow.md:60`、`ai-antipatterns.md:79` | 関数長 ≤15 と ≤30、共通化の閾値 3+ と ≥2 が食い違う                                                                       |
| p2-M1 | `enhancer-integration.md:39-67,83`、`enhancer-evidence.md:69`                             | 優先度スコアの計算。`audit.js` が並べ替え直すので結果に使われない                                                         |
| p2-M6 | `agents/_lib/prompt-quality-checks.md:13`                                                 | 「強調のための反復」を SKIP させており、cruft を保護している                                                              |
| p2-M7 | `agents/reviewers/reviewer-prompt.md:72`                                                  | 例のないルールに例を足させる (例への過剰な依存)                                                                           |
| p3-M3 | `skills/_lib/review-harness.md:7`                                                         | 事故の日付 (history narrative)                                                                                            |

### G. 設定 (Medium 2)

| ID    | 場所                                                  | 内容                                                                                       |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| p5-M3 | sonnet の中継 stage 10 箇所 (`audit.js:156,518` など) | `effort` を指定しておらず `effortLevel: high` を継承している。`effort: "low"` を足す       |
| p5-M5 | `workflows/audit.js:19`                               | "opus stalls the stream watchdog" に日付がない。Opus 5.5 で 1 回再テストしてから書き換える |

## 統合時の採用文

2 つの ID が同じ行を書き換える箇所では、次の文を採用する。

| 行                                                                  | 採用                                          | 理由                                                               |
| ------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `workflows/build.js:1178-1185` (`.ja/workflows/build.js:1154-1161`) | p5-M6 の translate 置換文                     | p1-M1 の置換文は同じブロックの 1 行しか覆わない                    |
| `workflows/build.js:934,970` (`.ja` `:914,950`)                     | p5-M6 の schema 置換文                        | 根拠の所在 (location / reference) を残すため                       |
| `reviewer-conformance.md:65`、`reviewer-reuse.md:53`                | p2-M4                                         | 重複はない                                                         |
| `PROSE.md:53`、`WORKFLOWS.md:14`                                    | p1-M1                                         | 重複はない                                                         |
| `reviewer-security.md:46`                                           | 下の統合文                                    | p2-H3 は前半を、p4-M2 は "Purely speculative" の文を書き換えるため |
| `reviewer-security.md:67`                                           | p2-H3 ("The lower bar above applies." を削除) | 重複はない                                                         |

`reviewer-security.md:46` の統合文 (en):

```
reviewer-security follows ${CLAUDE_PLUGIN_ROOT}/agents/_lib/finding-schema.md § Reporting Bar. When exploitability is uncertain, report the finding with a fix suggestion and write the open question into verification. A purely speculative item is reported at low with a verification_hint; critic-audit decides whether it survives. The preloaded skill's Reporting table maps signal strength to severity.
```

`reviewer-security.md:46` の統合文 (ja):

```
reviewer-security は ${CLAUDE_PLUGIN_ROOT}/agents/_lib/finding-schema.md § Reporting Bar に従う。悪用可能性が不確実なら修正提案を付けて報告し、未解決の問いを verification に書く。純粋に推測的な項目は verification_hint を付けて low で報告し、残すかどうかは critic-audit が判断する。シグナル強度と severity の対応は preload される skill の Reporting 表に従う。
```

## Low (flag のみ、差分なし、20 件)

主なものは次のとおり。

- mirror のずれ (p1-L6): `OPERATION.md:48-49` が `.ja/` に無い。ja への追加文は p1-L6 にある。実質は修正対象になる。
- Opus 5 で再テスト候補とされている項目: Visual Verification、Overeagerness の条件文、scoping の禁止列、research/implement の検証手順。
- ablate の測定欠陥 (p3-L4): 監査パターンの範囲外だが、優先して直すべきもの。`skills/ablate/scripts/arms.ts:46` で wiped+1 arm が system prompt に足すのは `[ablate] restoring element: <path>` という 1 行だけで、要素の中身ではない。docstring (`:33-35`) の「要素を 1 つ戻す」と一致しないので、wiped+1 は要素を戻せていない。

## 検証 (Step 7)

削除は仮説として扱い、1 件ずつ before/after を比べる。

- 現状の `/ablate` は検証に使えない。p3-L4 の欠陥により、wiped+1 arm が要素を戻していないため。`arms.ts:46` を直してから `/ablate` の対応表 (`skills/ablate/references/measurement-criteria.md:23-43`) で測る。
- A 群は reviewer の recall を変える。security の blind harness (`harness-freshness.test.ts` が再実行を要求する) を Opus 5.5 と Sonnet 5 で回し、recall と false positive を変更前と比べる。

## 推奨する着手順

1. mirror のずれ 3 件 (p2-H4、p5-M4、p1-L6)。DR が関わらず、意味が一義に決まる。`reviewer-rust` は Rust のレビューのたびに発火する。
2. `arms.ts:46` (p3-L4)。この後の検証の前提になる。
3. A 群。blind harness の再実行と組にする。
4. C 群の p4-H1 と p4-M1。1 行ずつの変更で済む。
5. B 群。DR-0011/DR-0095 の更新とテストの変更を伴う。
6. D 群と E 群の rules。PROSE.md など意図して置いた規約と衝突するので、採否はユーザーが判断する。

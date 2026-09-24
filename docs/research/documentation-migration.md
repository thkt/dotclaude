# dotclaude の過去資料の分類と移行

この記録は、基点 `3eceb99e555044da5c7b48af080ad21dafc11c5e` の追跡済み研究 36 件を、同じ repo の `.claude/workspace/research/` から `docs/research/` へ移した対応を示す。原文を変更せず、下表の Git blob と移行先の内容が一致することを確認した。過去の採用判断、観測値、未確認事項を今回の実装成功へ読み替えない。

## 読み方と対象

現在の手順は [wiki](../wiki/README.md)、判断理由と採用状態は [decisions](../decisions/README.md) を読む。この `docs/research/` の日付付き原本は当時の調査記録であり、冒頭の推奨だけで採用済みと判断しない。訂正・追記・限界と、関連 DR の状態を併せて読む。

基点で既に分類済みの wiki 64 ページと DR 118 件は現在の配置を保つ。今回は番号・状態を振り直さず、各ディレクトリの一覧を入口に使う。DR のリンクはその決定の記録を示し、研究全文の承認を示さない。

未追跡・ignored の原本は元のローカル repo に保持した。共有可否が未確認なので、この対応表へ内容やファイル名を取り込まない。別のローカル移行報告で全件の分類と保持理由を記録している。追跡済みであることも、新たな外部公開の許可とは扱わない。この表は分類・内容照合の結果であり、変更の公開・検証・採用状態は [Issue #753](https://github.com/thkt/dotclaude/issues/753) に対応する PR から確認する。

他 repo を題材にする研究は、当時この repo が保持していた原本として残す。以下の適用範囲を超えて dotclaude の規則へ転用せず、他 repo へ自動移送しない。とくに案件の振り返りはハーネスの知見へ抽出しない。

## 本文・状態・出典の分類

「未確認」は採否の照合を完了していない状態を意味する。本文の推奨、調査完了、コードの類似だけから `accepted` を補わない。追記で覆された主張も原本から消さず、訂正箇所を同じ行へ示す。

| 原本・移行先 | 対象・適用範囲 | 役割と状態 | 状態判断の出典・限界 | 反映先・関連判断 |
| --- | --- | --- | --- | --- |
| [2026-03-21-e2e-workflow-integration.md](2026-03-21-e2e-workflow-integration.md) | dotclaude の旧 E2E 統合 | 設計調査。オプトイン提案と当時のギャップを保持 | Purpose / Disconfirmation。関連判断は DR-0029。現行手順への再採用はしない | [DR-0029](../decisions/0029-integrate-e2e-test-generation-into-spec-driven-workflow.md)（superseded by DR-0082） |
| [2026-03-23-fts5-cjk-search.md](2026-03-23-fts5-cjk-search.md) | recall の当時の検索基盤 | 実装観測。instr の正しさと計算量の限界を当時の条件で保持 | Current Implementation / Summary。現在の recall への適用は未確認 | 原本を保持。新規採用なし |
| [2026-03-30-mlx-clear-cache.md](2026-03-30-mlx-clear-cache.md) | rurico と当時の mlx-rs | 仕様調査。メモリ圧迫を測るまでは対応不要という条件付き結論 | Summary / Next Steps。後続の rurico での採否は本移行では確認しない | 原本を保持。新規採用なし |
| [2026-04-02-march-kpt-kai-kizalas.md](2026-04-02-march-kpt-kai-kizalas.md) | 社外案件を含む当時の個人振り返り | 歴史的 KPT。案件固有の観測・提案を保持し、ハーネスの規則へ抽出しない | 対象範囲 / KAI案件 / パノラマ。既存の追跡版を同一 repo 内で保持 | 原本を保持。新規採用なし |
| [2026-05-01-reviewer-structure.md](2026-05-01-reviewer-structure.md) | dotclaude の旧 reviewer 構成 | 構造調査と整理案。後続の reviewer 再編の現状は別途照合が必要 | Purpose / Disconfirmation。単一 consumer と content-fit の当時の判断 | [DR-0063](../decisions/0063-split-reviewer-design-into-deletion-test-and-react-pattern.md)（accepted） |
| [2026-05-02-confirmation-bias-skill-gaps.md](2026-05-02-confirmation-bias-skill-gaps.md) | dotclaude のスキル改善候補 | 提案と仮説。未検証の外部論文を根拠にした部分を採用済みにしない | Next Steps と 2026-06-06 postmortem の訂正・除外印 | [DR-0071](../decisions/0071-think-assert-no-source-enforcement.md)（accepted） |
| [2026-05-02-github-issue-label-strategy.md](2026-05-02-github-issue-label-strategy.md) | 個人 CLI とチーム repo のラベル設計 | 比較調査。tier ごとの条件付き提案を保持 | Disconfirmation が一律 prefix 推奨を否定。採用した部分は DR-0059 | [DR-0059](../decisions/0059-adopt-tier-3-lite-github-label-strategy.md)（accepted） |
| [2026-05-07-issue-69-label-from-issue-push-failure.md](2026-05-07-issue-69-label-from-issue-push-failure.md) | scout と github-labels | 不具合原因調査。初回調査の見逃しも後続訂正とともに保持 | Disconfirmation / 2026-06-06 postmortem F4。単独の完全解決記録にしない | 原本を保持。新規採用なし |
| [2026-05-07-knowledge-reflection-cache-safe-design.md](2026-05-07-knowledge-reflection-cache-safe-design.md) | dotclaude の旧 reflection hook | 設計原本。Stop の発火時点に誤りがあり、機構は退役済み | 2026-06-06 postmortem F5 / DR-0068 deprecated。新規採用しない | [DR-0068](../decisions/0068-stop-hook-knowledge-reflection-subagent-and-mechanical.md)（deprecated） |
| [2026-05-08-issue-104-rrf-merge-unification.md](2026-05-08-issue-104-rrf-merge-unification.md) | rurico / recall | 削除計画の前提調査。順序制約は合意と安全側の推奨を区別 | Purpose / Disconfirmation / postmortem 除外印。現在の採用状態は未確認 | 原本を保持。新規採用なし |
| [2026-05-08-issue-53-aiano-annotation-framework.md](2026-05-08-issue-53-aiano-annotation-framework.md) | amici の annotation 構想 | 設計候補。解決できなかった ADR 番号・論文確認を保持 | Disconfirmation / Next Steps。実装・採用済みには変換しない | 原本を保持。新規採用なし |
| [2026-05-11-sae-100-adr-0060-prep.md](2026-05-11-sae-100-adr-0060-prep.md) | sae / amici / recall / yomu | 採用方針の適用調査。共通 helper 提案と各 repo の要求を区別 | Purpose / Next Steps / postmortem 除外印。共通 CLI 方針は DR-0060 | [DR-0060](../decisions/0060-adopt-agent-friendly-cli-design-principles.md)（accepted） |
| [2026-06-06-research-skill-precision-postmortem.md](2026-06-06-research-skill-precision-postmortem.md) | dotclaude の research 評価 | 事後検証と一部再評価。F4 の再試行、F5 の汚染条件、未実施 regression を保持 | Eval 実行結果 / Next Steps。現行規約は verification.md と別に照合 | [wiki](../wiki/research-correction-before-reuse.md) |
| [2026-06-16-slack-fetch-cap-truncate-adr0003.md](2026-06-16-slack-fetch-cap-truncate-adr0003.md) | Slack 取得 CLI の当時の API | 設計案。切詰め理由の型と伝達案は候補のまま保持 | Key Findings / Next Steps。対象は当時の Issue #222。採用は未確認 | 原本を保持。新規採用なし |
| [2026-06-22-issue17-bash-gate-filesystem-delta.md](2026-06-22-issue17-bash-gate-filesystem-delta.md) | gates の Bash 検知案 | 設計調査・計測訂正。0.8 秒と 21ms の測定方法差、ADR 未確認を保持 | Coverage Summary / Disconfirmation / Next Steps。delta 機構の採用は未確認 | [wiki](../wiki/execution-cost-measurement-scope.md) |
| [2026-07-08-issue-consume-slice-parent-plan-seed.md](2026-07-08-issue-consume-slice-parent-plan-seed.md) | dotclaude の旧 issue 連鎖 | 設計候補。親 Plan は非権威的な参考であり子の要求ではない | Purpose / Next Steps。旧フローは後続 DR-0084 により変更 | [DR-0084](../decisions/0084-retire-issue-gate-and-hand-issue-flow-orchestration-to-human.md)（accepted） |
| [2026-07-08-slice-parent-plan-carry.md](2026-07-08-slice-parent-plan-carry.md) | dotclaude の slice と build | 設計候補と見出し衝突の観測。子の Plan への自動採用はしない | Disconfirmation の regex probe / Next Steps。後続採否は未確認 | 原本を保持。新規採用なし |
| [2026-07-10-scribe-mechanism-cleanup.md](2026-07-10-scribe-mechanism-cleanup.md) | dotclaude の旧巡回 scribe | 実装前調査。run.sh と scribe-setup を前提にした歴史資料 | Purpose / Disconfirmation。現行 hook・CI の説明に読み替えない | 原本を保持。新規採用なし |
| [2026-07-12-scribe-setup-ja-canonical-mirror.md](2026-07-12-scribe-setup-ja-canonical-mirror.md) | dotclaude の旧 scribe-setup | 未追跡 skill の採用準備。調査完了を当該 skill の採用としない | Purpose / tracking 確認。ミラー方針自体は DR-0073 | [DR-0073](../decisions/0073-adopt-ja-as-canonical-source-for-mirror.md)（accepted） |
| [2026-07-13-effort-policy-per-stage.md](2026-07-13-effort-policy-per-stage.md) | dotclaude の workflow 設定 | 変更候補と callsite 棚卸し。当時の xhigh 一律値を保持 | Purpose / Disconfirmation / Next Steps。現在のモデル動作保証ではない | 原本を保持。新規採用なし |
| [2026-07-13-issue-build-flow-simplification-impact.md](2026-07-13-issue-build-flow-simplification-impact.md) | dotclaude の issue→build | 採用前の影響調査。決定方向と変更対象一覧を保持 | Purpose / 決定方向。採用判断は DR-0084 に既存 | [DR-0084](../decisions/0084-retire-issue-gate-and-hand-issue-flow-orchestration-to-human.md)（accepted） |
| [2026-07-13-metacognition-systems-thinking-principles.md](2026-07-13-metacognition-systems-thinking-principles.md) | dotclaude の原則候補 | 文献調査と提案。ユーザーが採用する場合という条件を保持 | Next Steps。一般原則の新たな必須化はしない | 原本を保持。新規採用なし |
| [2026-07-21-apple-container-claude-code-sandbox.md](2026-07-21-apple-container-claude-code-sandbox.md) | dotclaude の sandbox / 当時の Apple container | 比較調査と実機訂正。初期の kernel 推測は追記で棄却 | 実機検証 / DR-0111 accepted。原本の初期 verdict を現行決定にしない | [DR-0111](../decisions/0111-adopt-apple-container-for-agent-sandbox.md)（accepted） / [wiki](../wiki/research-correction-before-reuse.md) |
| [2026-07-27-hyperresearch-port-candidates.md](2026-07-27-hyperresearch-port-candidates.md) | dotclaude の research 改善 | 候補の選別と不採用理由。既知の miss を対象にし、未着手 eval を保持 | 選別軸 / Disconfirmation / Next Steps。外部機構の一括採用はしない | 原本を保持。新規採用なし |
| [2026-07-28-build-ship-scope-deviation-root-cause.md](2026-07-28-build-ship-scope-deviation-root-cause.md) | dotclaude の build #259 | 原因調査。計画外差分を生んだ当時の伝達・検出経路を保持 | Purpose / Phase 5 elimination。是正案の採用状態は未確認 | 原本を保持。新規採用なし |
| [2026-08-02-audit-reviewer-refinement.md](2026-08-02-audit-reviewer-refinement.md) | dotclaude の当時の audit | 実測と改善候補。件数差の意味・実モデル・直列待ちを区別 | Key Findings / Disconfirmation。記録当時の数値を現行性能へ転用しない | [wiki](../wiki/execution-cost-measurement-scope.md) |
| [2026-08-10-scout-html2md-code-block-corruption.md](2026-08-10-scout-html2md-code-block-corruption.md) | scout の HTML→Markdown | 不具合原因と代替 crate の実測。版・入力・pipeline 条件を保持 | Key Findings / Disconfirmation / Next Steps。別 repo の採用結果は未確認 | 原本を保持。新規採用なし |
| [2026-08-19-pr-skill-build-body-duplication.md](2026-08-19-pr-skill-build-body-duplication.md) | dotclaude の PR 本文生成 | 共通知識の所在調査と設計入力。当時の helper 名も保全 | Purpose / Disconfirmation。現行 pr-body.ts の採用判断とは分ける | 原本を保持。新規採用なし |
| [2026-08-22-workflows-record-script-history-shared.md](2026-08-22-workflows-record-script-history-shared.md) | dotclaude の旧 Python recorder | 共有化の検討資料。配置・抽出コストの前提を保持 | Purpose / Disconfirmation。現在は TS 化しているため旧ファイル名は履歴 | 原本を保持。新規採用なし |
| [2026-08-23-aidlc-workflows-v2-stage-mapping.md](2026-08-23-aidlc-workflows-v2-stage-mapping.md) | dotclaude と外部 AI-DLC の比較 | 版を固定した対応表。未対応数は当時の定義と対応規則に限定 | Purpose / Key Findings / Disconfirmation。欠けた全 stage の実装要求ではない | [wiki](../wiki/external-claim-version-pin.md) |
| [2026-08-24-assert-nested-audit-plugin-namespace-fallback.md](2026-08-24-assert-nested-audit-plugin-namespace-fallback.md) | dotclaude の plugin 配布経路 | 不具合調査。名前解決と CLI 版の観測を保持 | Purpose / Disconfirmation。現行版を再検証した結果にはしない | [wiki](../wiki/external-claim-version-pin.md) |
| [2026-08-24-wiki-structure-page-claim-verification.md](2026-08-24-wiki-structure-page-claim-verification.md) | dotclaude の wiki 検証 | 検証手段の調査と prototype。存在確認と意味の一致を区別 | Disconfirmation の mutation probe。現行 structure-page テストと照合 | [DR-0106](../decisions/0106-adopt-the-wiki-as-the-current-state-view-over-immutable-drs.md)（accepted） |
| [2026-08-25-search-tool-layering-ast-grep-wiring.md](2026-08-25-search-tool-layering-ast-grep-wiring.md) | dotclaude の検索権限と選択 | 導入前調査。読み取りと書き込み能力の境界を保持 | Key Findings / Disconfirmation。権限の採用判断は DR-0108 | [DR-0108](../decisions/0108-grant-ast-grep-only-to-write-capable-agents.md)（accepted） |
| [2026-09-04-workflow-script-typescript-engine.md](2026-09-04-workflow-script-typescript-engine.md) | dotclaude / 外部 Workflow runtime | upstream 提案準備。GO は起票案への評価で実装採用ではない | Verdict / Disconfirmation。helper 移行 DR-0112 と workflow runtime の提案を区別 | [DR-0112](../decisions/0112-adopt-typescript-for-helper-scripts.md)（accepted） |
| [2026-09-11-hook-startup-measurement.md](2026-09-11-hook-startup-measurement.md) | dotclaude の当時の Bash hook | 性能観測。早期 return の起動時間であり通常処理時間ではない | 測り方 / 判定。本文の DR-0113 表記は原文維持し関連判断 DR-0112/0114 を参照 | [DR-0114](../decisions/0114-justify-the-hooks-typescript-migration-by-the-type-contract.md)（accepted） / [wiki](../wiki/execution-cost-measurement-scope.md) |
| [agent-friendly-cli-audit.md](agent-friendly-cli-audit.md) | 個人 CLI 群の当時の横断監査 | 外部基準との比較。個別 CLI の不足と共通方針の採用を区別 | Audit Criteria / 各 CLI の評価。方針の採用記録は DR-0060 | [DR-0060](../decisions/0060-adopt-agent-friendly-cli-design-principles.md)（accepted） |

## 旧パスと原文の対応

すべての旧パスは `.claude/workspace/research/` と下表のファイル名を連結したもの、移行先は `docs/research/` と同じファイル名を連結したもの。名称変更・分割・内容編集はない。Git の履歴を読む場合は上記の基点と旧パスを指定する。

| ファイル名 | 原文 Git blob |
| --- | --- |
| `2026-03-21-e2e-workflow-integration.md` | `030be9ac68ee719253d2fcc58a6e4305f21a6409` |
| `2026-03-23-fts5-cjk-search.md` | `e1e3d327d9b0c4825a46a64983275d6dc2bc2d68` |
| `2026-03-30-mlx-clear-cache.md` | `f61831d9f307b7b7c347495785ee0cb3451e5a22` |
| `2026-04-02-march-kpt-kai-kizalas.md` | `43b0059fde65c16b0965925115a11625d377abc2` |
| `2026-05-01-reviewer-structure.md` | `0e91dd67ff3beeac2bd810e7d3c39c3f640ad889` |
| `2026-05-02-confirmation-bias-skill-gaps.md` | `58651a5ec16ab4a6cf2da7e4836b0bb38621a8e1` |
| `2026-05-02-github-issue-label-strategy.md` | `865ce453ca29f576ba64161eb24cebf8d6a52396` |
| `2026-05-07-issue-69-label-from-issue-push-failure.md` | `7365d96d33723f29de8a8c34c6a43334abdb8b88` |
| `2026-05-07-knowledge-reflection-cache-safe-design.md` | `0e6c74eb19e5a178e3040d8edff7b1abdd353b6e` |
| `2026-05-08-issue-104-rrf-merge-unification.md` | `2b95775e2cda7db0865e3a773c7b3564d99efb2d` |
| `2026-05-08-issue-53-aiano-annotation-framework.md` | `46d2a367da464fbb576b36d919325bc6dce06e32` |
| `2026-05-11-sae-100-adr-0060-prep.md` | `ca7c2d5a4cd0df1e37565f900ae2ef0a753ab4af` |
| `2026-06-06-research-skill-precision-postmortem.md` | `372372ccece8fb470782224c597c5771b10ec96b` |
| `2026-06-16-slack-fetch-cap-truncate-adr0003.md` | `fd46d0cec8c27d37581469ffa1931efff1cc257e` |
| `2026-06-22-issue17-bash-gate-filesystem-delta.md` | `0b36a0a2c0c5ebcf5e12e93ac6fd999c030b0cfa` |
| `2026-07-08-issue-consume-slice-parent-plan-seed.md` | `b88128bc277bc36cea49c07c7adc09dfe66ed33b` |
| `2026-07-08-slice-parent-plan-carry.md` | `1b9756bd303aca5ae565b523119cabcf57c4db46` |
| `2026-07-10-scribe-mechanism-cleanup.md` | `4aed1f8e0f2a4196b244521b1cfcd00aee1dc3a4` |
| `2026-07-12-scribe-setup-ja-canonical-mirror.md` | `2a4fadcc641553e07fe609d9c16616ae79ba7edb` |
| `2026-07-13-effort-policy-per-stage.md` | `10e817c275586e49b2e774a7a65e2eecbadeba0c` |
| `2026-07-13-issue-build-flow-simplification-impact.md` | `ab7ff7e55f780673ad450270285c000fa78ffb39` |
| `2026-07-13-metacognition-systems-thinking-principles.md` | `bf96aca594792d3aeb1ceece3df651b78576d053` |
| `2026-07-21-apple-container-claude-code-sandbox.md` | `df917576993694639f00de7011e019dba9dd65f7` |
| `2026-07-27-hyperresearch-port-candidates.md` | `261c3b1322ca154746736e2ace153ff52470e84b` |
| `2026-07-28-build-ship-scope-deviation-root-cause.md` | `9afffd1a1e2ad69b7e3218878d20b807ae76092f` |
| `2026-08-02-audit-reviewer-refinement.md` | `b66a9f99451267d9b86d65e328f308f130f7338c` |
| `2026-08-10-scout-html2md-code-block-corruption.md` | `eba7e98d4168ceca0f0447fc7b1e9b1dec221d93` |
| `2026-08-19-pr-skill-build-body-duplication.md` | `f25dcbb06cda50b2986e26e4351b6ec653decff6` |
| `2026-08-22-workflows-record-script-history-shared.md` | `397e5a6699beb4f04596880e9cc36fbb3a54acfc` |
| `2026-08-23-aidlc-workflows-v2-stage-mapping.md` | `03bc210d19d133d84e1ede8624392cc275cca58d` |
| `2026-08-24-assert-nested-audit-plugin-namespace-fallback.md` | `60132a4717dd23fa40c21c6faad1e557bc4044bb` |
| `2026-08-24-wiki-structure-page-claim-verification.md` | `cf460152c84c73170aa0e0ea50b6d094d48cad78` |
| `2026-08-25-search-tool-layering-ast-grep-wiring.md` | `ae16030423cafec9983e4d6cd8a4e696f32b706e` |
| `2026-09-04-workflow-script-typescript-engine.md` | `e5d6e668b0838a4d7523467eb54b884467eb5515` |
| `2026-09-11-hook-startup-measurement.md` | `ec026c497a04e59f2029497e8d459efefb05e6f5` |
| `agent-friendly-cli-audit.md` | `0d449c4d76d0e4b9bfe42ef26d80548db5f25cd6` |

## 参照の確認

移行した原本内に、解決位置が移動で変わる相対 Markdown リンクはなかった。原本に引用された `workspace/research/`、`.claude/workspace/research/`、当時の絶対パス、廃止済みの code path は調査時点の記録としてそのまま残す。研究ファイルへの旧パスは、この対応表の同じファイル名と基点の blob から追跡できる。ホストの memory・scratchpad・会話記録を新しく共有したり、失われた実行証拠を再構成したりしない。

この表と新規 wiki から移行先原本・既存 DR への相対リンクを確認した。移行先研究は DR の採番対象へ入れない。新規 wiki の出典識別子は原本への参照であり、移動前と移動後を別の根拠として数えない。

## 今回抽出した範囲

- [実行時間の測定範囲](../wiki/execution-cost-measurement-scope.md): 起動費用、実処理、並列待ちを同じ数値で説明しないための確認手順。
- [研究の訂正を先に照合する](../wiki/research-correction-before-reuse.md): 冒頭の推奨を後続の実測・棄却・未実施条件と照合して再利用する手順。

重要な採用判断は既存 DR に対応があるため、同じ選択を別番号で作り直していない。提案や採用不明の資料から、新しい `accepted` DR は生成していない。

---
globs: []
scenes: ["plan", "issue-create"]
---

# 過去の研究は冒頭の推奨と後続の訂正を照合して使う

## 内容

研究原本には、初期の仮説、推奨、追試での訂正、未実施の確認が同居することがある。再利用するときは結論に関係する追記・限界と関連する決定記録を読み、どの主張が今も使えるかを分ける。原本の保存や移行だけでは、候補の採用や現在の効果を確認したことにはならない。

## 定型手順

1. 今回の判断に使う主張と、原本の観測日・対象版・適用範囲を確認する。
2. 同じ原本の追記、再評価、未実施事項と、後続の訂正記録を読む。冒頭の推奨を覆す実測があれば、訂正後の条件を今回の説明へ使う。
3. 採用を述べる場合は対応する DR や合意記録の状態を確認する。研究の `GO`、推奨、調査完了を `accepted` の代わりにしない。
4. wiki の現在形を直すときも、原本の値と当時の判断を消さない。原本への参照と、今回採用する条件・未確認の範囲を残す。

## 参照コード

- `skills/research/SKILL.md` の `Phase 2: Prior Research Scan`（過去の findings を再検証・置換する扱い）。
- `skills/research/SKILL.md` の `Phase 7: Synthesis`（継承した知見の状態と不明事項を残す手順）。
- `skills/dr/references/madr-format.md` の `Status Lifecycle`（提案・採用・棄却・退役・置換の区別）。

## 根拠

- [research:2026-07-21-apple-container-claude-code-sandbox.md](../research/2026-07-21-apple-container-claude-code-sandbox.md) は、kernel 設定からの初期推測を、実際に配布された guest kernel の検証で棄却している。採用判断は既存の [DR-0111](../decisions/0111-adopt-apple-container-for-agent-sandbox.md) にあり、原本冒頭のリスク評価だけでは再構成できない。
- [research:2026-06-06-research-skill-precision-postmortem.md](../research/2026-06-06-research-skill-precision-postmortem.md) は、旧研究の Stop 発火時点の誤認と、再評価で後発の資料が読めた条件を記録している。`PASS` の表記だけを、情報を遮断した比較の成功や regression 全件の完了へ読み替えない。
- [research:2026-09-04-workflow-script-typescript-engine.md](../research/2026-09-04-workflow-script-typescript-engine.md) の `GO` は upstream への提案を検討した結論であり、提案した runtime 変更を採用・実装した記録ではない。

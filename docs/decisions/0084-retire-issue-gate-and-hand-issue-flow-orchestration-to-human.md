---
status: "accepted"
date: 2026-07-13
decision-makers: thkt
---

# ADR-0084: issue-gate を廃止し issue フローのオーケストレーションを人間に返す

## Context and Problem Statement

/issue は challenge / research / think をネスト起動する単一スキルで、veto (issue-gate) が evidence bundle と Title Discipline (タイトル逐語一致束縛) で全段の skip 不能を強制している。veto は #150 / #154 で「LLM が全段を自動連鎖する /issue から、証跡なし起票の skip drift を防ぐ」対策として導入された (導入 ADR は無く issue のみが経緯を持つ)。

運用で 3 つの痛みが定着した。hooks で skip 不能状態を維持するコスト (veto.py 664 行 + tests 計 1161 行の .ja mirror 込み保守)、issue 本文の肥大 (テンプレ + 仮ブロック + Premises + Plan + Backlog) によるレビュー困難、そして 1 回の /issue が何をしているか説明しづらくチームへの移譲が困難であること。影響調査 (workspace/research/2026-07-13-issue-build-flow-simplification-impact.md) で、veto の配線は skill frontmatter hooks のみで settings.json / CI に依存が無いことを確認済み。

## Decision Drivers

- veto の存在理由は LLM がオーケストレータであること。人間が各段を個別に起動する構造では police 対象そのものが消える
- plan 品質の最終防衛線は build.js Load の validate_plan として既に存在する (veto plan-gate の手書きコピーで、contract test が lockstep を保証していた)
- 段間の handoff は成果物ベースで既に成立している。research は workspace/research/ のファイル、plan は issue の `## Plan` 節が durable home
- 対話的な refine 工程は AskUserQuestion を使えない headless workflow に不向きで、ADR-0081 (fan-out は決定論 workflow へ) の script 化路線をそのまま適用できない

## Considered Options

- Option A: 人間駆動の独立スキル群。/issue は単独で成立し、veto を全削除する
- Option B: /issue の連鎖を deterministic workflow (issue.js) に置き換え、強制を script 制御フローへ移す
- Option C: 現状維持で gate を間引く。source-coverage / round-trip check だけ削って軽量化する

## Decision Outcome

Option A を採用する。challenge / research / think / issue / build を人間が繋ぐ独立スキル群に再構成し、パイプラインを結合から推奨の組み合わせに格下げする。

- /issue は薄い起票スキルにする。前段の成果物 (challenge verdict / research / think の plan) は会話コンテキストにあれば使い、なくても起票は成立する。ネストした Skill() 呼び出しと frontmatter hooks は全廃
- hooks/veto 一式 (veto.py / pre-issue-create.sh / tests) と skills/issue/tests/skip-header.test.js、references/premise-check.md を .ja mirror ごと削除する。前提検証は /challenge の役割に一本化
- challenge は verdict-gate の pipe を削除し、one-way downgrade 規則 (不可逆仮定あり / 仮定 7 超 / underspecified なら NO-GO) を prose 規則として本文に保持する
- think は plan-gate の pipe を削除する。PLAN_SCHEMA は prose 契約として維持し、canonical validator は build.js の validate_plan に昇格する
- build との唯一の硬い契約は issue の `## Plan` 節フォーマット (plan-section.md) で変更しない。tentative-marking は build の assumptions 抽出の上流として維持する

### Before / After

| 段         | Before                                                  | After                                               |
| ---------- | ------------------------------------------------------- | --------------------------------------------------- |
| challenge  | /issue が起動し verdict-gate が GO を title 束縛で記録  | 人間が必要と判断した issue だけ単独起動             |
| research   | /issue が起動し research-gate が evidence を記録        | 単独起動。出力は従来どおり workspace/research/ へ   |
| think      | /issue が起動し plan-gate が schema + title を検証      | 単独起動。plan を会話で返す (検証は build に委ねる) |
| issue 起票 | pre-issue-create.sh が evidence bundle 完備を単発 allow | /issue が preview 確認のみで起票                    |
| build      | Load validate が二重目の防衛線                          | Load validate が唯一の防衛線                        |

### Consequences

- Good, 各段が 1 行で説明でき、フローの移譲と部分的なやり直しが可能になる
- Good, issue 本文が Why + Acceptance Criteria + Plan に痩せ、レビュー対象が縮む
- Good, veto 1161 行 ×2 と Title Discipline の維持コストが消える
- Bad, 段の飛ばし忘れ (challenge 未実施の起票など) を誰も止めない。人間の判断をゲートとする対価として受容する
- Bad, plan の schema エラー検出が起票時から build 実行時まで遅延する
- Bad, challenge の downgrade 規則が決定論スクリプトから prose に落ち、遵守が LLM 頼みになる

### Confirmation

hooks/veto/ が .ja 含め存在しないこと、issue / challenge / think の frontmatter に hooks が無いこと、git grep で veto 機構への参照がゼロであること (build.js と pr-body.py の「veto 対象」は PR 上のユーザー拒否対象を指す概念用法で対象外)、残存テスト (plan-section.test.js ほか) が green であること、.ja と EN の mirror が同期していることを確認する。

## Pros and Cons of the Options

### Option A (人間駆動の独立スキル群)

- Good, veto の存在理由ごと消すため、強制機構の保守も title 束縛の壊れやすさも残らない
- Good, 各スキルが producer / consumer として成果物だけで繋がり、単独でも組み合わせでも使える
- Bad, 品質担保が人間の運用規律に依存する

### Option B (issue.js への workflow 化)

- Good, 強制が script 制御フローに載り skip drift は構造的に消える
- Bad, workflow agent は AskUserQuestion を使えず、壁打ち / preview 確認という refine 工程の核が成立しない
- Bad, 説明困難・移譲困難という痛みは 1 本のブラックボックスに置き換わるだけで解消しない

### Option C (gate の間引きだけで現状維持)

- Good, 変更が最小で済む
- Bad, Title Discipline と evidence bundle という複雑さの根 (起票前に evidence を未来の issue に紐づける設計) が残る
- Bad, 1 回の /issue が長く重い構造は変わらず、途中失敗の全損も解消しない

## Reassessment Triggers

- 未検証 plan による build 失敗が繰り返される場合、title-free の standalone plan validator を /think の自己検証として再導入する
- challenge の verdict 品質が prose 規則で劣化した実例が出た場合、決定論 gate の再導入を検討する
- 段の飛ばし忘れによる品質事故が反復する場合、memory 追記でなく hook / script での自動化として対策する

## More Information

- 導入経緯: #150 / #151 / #152 / #154 / #156 / #159 (issue-gate)。supersede 対象の ADR は無い
- 影響調査: workspace/research/2026-07-13-issue-build-flow-simplification-impact.md
- 関連: ADR-0081 (machinery の fan-out は決定論 workflow へ)。本決定は補完で、headless に不向きな refine 工程のオーケストレーションを人間に返す

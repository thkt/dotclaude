---
name: scoping
description: 要求・完了条件・検証方法を整理し、合意した範囲を GitHub Issue にする。合意済み Issue の実装には使わない (/implement)。plan を書く設計探索には使わない (/think)。
when_to_use: 要求整理, 実装範囲の整理, 完了条件, 合意をIssueに, scoping, requirements scoping, sufficiency check
allowed-tools: Read Write Edit LS Agent AskUserQuestion Bash(${CLAUDE_SKILL_DIR}/../scribe/scripts/*) Bash(gh issue:*) Bash(gh api user:*) Bash(gh repo view:*) Bash(git:*) Bash(cat:*) Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[request or issue number]"
---

# /scoping - 要求と実装範囲の整理

要求・完了条件・検証方法と合意範囲を整理し、実装へ引き継げる Issue を作る。商品実装や `/implement` の起動はこの呼び出しに含めない。

確認できる事実は調査し、ユーザーにしか分からない事実や未確定の意図は早めに質問する。人の判断が必要な質問は回答を待って依存する作業を止め、独立した調査は続ける。スキルの一般的な進め方よりユーザーの明示指示を優先する。指示文を理由に確認や停止が必要な場合は、実際に読んだ文書のパスと該当文を示し、明示された条件と自分の解釈を区別する。

## Phase 1: 入口

`$ARGUMENTS` は依頼本文か Issue 番号。対象 repo の指定がなければ現在のリポジトリを使い、元の依頼がなければ AskUserQuestion で何を実現したいかを尋ねる。指定された Issue・設計案・既存の合意と、今回に関係する README・開発方針を確認し、合意済みのことを聞き直さない。小さな変更と文書変更も対象に含める。中断・担当交代では Issue・下書きの決定と不足を、現在のコードと要求に照らして再開する。

## Phase 2: 判断

1. `${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md` § Read and retain に従い、対象 repo の関連 wiki と判断記録を選ぶ。`${CLAUDE_SKILL_DIR}/../scribe/scripts/find_wiki_rule.ts docs/wiki <依頼の語> <触れそうなパス> --scene plan` の `matched` と `scenes` のページを読む。選んだページと判断記録を現行コード・合意と照合する。文書が無くても調査を続ける。
2. 次に決めることを定め、`${CLAUDE_SKILL_DIR}/references/sufficiency.md` の 6 つの問いで根拠・代替案・不確実さ・権限を確認する。事実で解ける不足は調べる。
3. 意図・優先順位・許容範囲・権限が未確定なら、AskUserQuestion で選択肢と影響を示して質問する。仮説を先頭の選択肢に置く。判断を左右する根拠が変わったら再評価する。
4. 既存の資料では判断できず、観測結果で方針が変わる場合だけ `${CLAUDE_SKILL_DIR}/references/experiment.md` の小さな実験を検討する。

## Phase 3: 成果物

目的・範囲・完了条件・検証方法、合意と未解決事項を Issue または下書きにまとめる。再利用する根拠や長い検証結果が必要な場合だけ、`${CLAUDE_SKILL_DIR}/references/session.md` の保存と引き継ぎを行う。判断が固まったら DOCUMENTS.md § Read and retain で wiki と判断記録への影響を確かめる。判断記録が要るなら `/dr` の MADR テンプレートを使う。

要求の抜け・矛盾・曖昧さと、合意・根拠との一致を確認する。矛盾か偏りが残るときは critic-design による独立評価を行い、行わなかったときは未実施と記録する。

「案だけ」「公開しない」の指定ではローカル下書きまでに留める。Issue の公開・更新が依頼範囲にある場合だけ `${CLAUDE_SKILL_DIR}/references/issue.md` の手順を使い、対象・主体・権限と公開後の本文・URL を確認する。スキルの選択や下書きの保存を公開許可に読み替えない。

完了時に Issue または下書き、合意範囲、必要な報告の版と共有状態、残る判断を伝え、実装へ引き継ぐ。

# Issue への反映

合意した要求を Issue へ公開・更新するときに使う。下書きの保存を公開許可に読み替えない。

1. 対象を照合する。`cat .dotagents.json` で repository・remote・baseBranch・capture を読み、`gh repo view --json nameWithOwner,defaultBranchRef,viewerPermission` の repo と照合する。`git remote -v` の取得先と push 先、`gh api user --jq .login` の主体も照合し、不一致や権限不足を解消する。`.dotagents.json` が無ければ、`/implement` が止まることを未解決事項として残す。Issue URL の repo を数字だけに変えて別 repo へ流用しない。
2. `gh issue list --repo OWNER/REPO --state all --search '関連語'` と候補本文で重複を調べる。指定された Issue は `gh issue view NUMBER --repo OWNER/REPO --json title,body,state,url` で読む。重複候補の範囲が異なれば統合しない。
3. 目的、今回の範囲、完了条件、対象 repo 固有のセットアップ・検証方法・必要媒体と保存先、合意の根拠を Markdown 下書きへまとめる。必要媒体と保存先は、`${CLAUDE_SKILL_DIR}/../implement/references/capture.md` の表で `capture` の設定に合わせて書く。未解決事項と次の判断を残し、重要な判断を先送りするなら理由・再判断の条件・判断する人を記す。先送りできるのは、draft PR の公開より後に決めれば足りる判断だけ。実装・検証・PR 本文の作成の間に答えが要る判断は、公開の前に人と合意して本文に決定として書く。「実装時に確認する」とは書かない。`/implement` の workflow は走り出すと人に問えず、未決の判断に当たると止まり、実装をやり直すことになる。実装方法の細部や試行管理を要求へ混ぜず、未合意事項を合意済みと書かない。
4. 対象 repo の README と開発方針から、今回の変更に課される手順を列挙する。Issue 本文に対する手順に加えて、実装が変更する文書・PR 本文・公開・撮影に対する確認や承認も数える。各手順について、`/implement` の workflow が人へ問わず実行できるかを確かめる。実行できないのは、参照先の手順書が無い場合、必要な CLI や権限が無い場合、人の操作が要る場合である。実行できない手順は、扱いを AskUserQuestion で人と合意し、本文に決定として書く。workflow の独立レビューは、方針どおりに行われていない手順を必須の指摘にする。扱いが本文に無いと、実装を終えた後に `human-decision-required` で止まる。
5. 下書きを要求・合意・根拠と照合し、抜け・矛盾・曖昧さを解消する。必要な独立評価と人の合意へつなぐ。
6. 公開直前に対象と gh の主体・権限を再照合する。新規なら `gh issue create --repo OWNER/REPO --title '要求を表すタイトル' --body-file PATH` で作成する。既存 Issue の更新が依頼範囲なら最新本文を読み、既存要求・他担当の内容を保持して `gh issue edit NUMBER --repo OWNER/REPO --body-file PATH` で反映する。
7. `gh issue view NUMBER --repo OWNER/REPO --json title,body,state,url` で読み戻し、対象 repo・本文・URL、決定・合意範囲・根拠・未解決事項を確認する。

通信断などで結果が不明なら、一覧と本文から GitHub 上の実状態を確認してから再試行する。確認できない間は公開完了とせず、本文・判明した状態・残る確認を引き継ぐ。権限不足なら本文を保持して、必要な対応を伝える。

本文の不足・不一致は要求・合意・根拠と照合して修正し、再度読み戻す。判断を左右する不足は sufficiency.md に戻す。

Issue URL と合意範囲を報告し、session.md § 調査成果の引き継ぎに従って報告の版・共有状態・未完了の操作を渡す。変更前の確認を、報告の改訂や Issue の更新に流用しない。

# Issue への反映

合意した要求を Issue へ公開・更新するときに使う。下書きの保存を公開許可に読み替えない。

1. 対象を照合する。`cat .dotagents.json` で repository・remote・baseBranch を読み、`gh repo view --json nameWithOwner,defaultBranchRef,viewerPermission` の repo と照合する。`git remote -v` の取得先と push 先、`gh api user --jq .login` の主体も照合し、不一致や権限不足を解消する。`.dotagents.json` が無ければ、`/implement` が止まることを未解決事項として残す。Issue URL の repo を数字だけに変えて別 repo へ流用しない。
2. `gh issue list --repo OWNER/REPO --state all --search '関連語'` と候補本文で重複を調べる。指定された Issue は `gh issue view NUMBER --repo OWNER/REPO --json title,body,state,url` で読む。重複候補の範囲が異なれば統合しない。
3. 目的、今回の範囲、完了条件、対象 repo 固有のセットアップ・検証方法・必要媒体と保存先、合意の根拠を Markdown 下書きへまとめる。未解決事項と次の判断を残し、重要な判断を先送りするなら理由・再判断の条件・判断する人を記す。実装方法の細部や試行管理を要求へ混ぜず、未合意事項を合意済みと書かない。
4. 下書きを要求・合意・根拠と照合し、抜け・矛盾・曖昧さを解消する。必要な独立評価と人の合意へつなぐ。
5. 公開直前に対象と gh の主体・権限を再照合する。新規なら `gh issue create --repo OWNER/REPO --title '要求を表すタイトル' --body-file PATH` で作成する。既存 Issue の更新が依頼範囲なら最新本文を読み、既存要求・他担当の内容を保持して `gh issue edit NUMBER --repo OWNER/REPO --body-file PATH` で反映する。
6. `gh issue view NUMBER --repo OWNER/REPO --json title,body,state,url` で読み戻し、対象 repo・本文・URL、決定・合意範囲・根拠・未解決事項を確認する。

通信断などで結果が不明なら、一覧と本文から GitHub 上の実状態を確認してから再試行する。確認できない間は公開完了とせず、本文・判明した状態・残る確認を引き継ぐ。権限不足なら本文を保持して、必要な対応を伝える。

本文の不足・不一致は要求・合意・根拠と照合して修正し、再度読み戻す。判断を左右する不足は sufficiency.md に戻す。

Issue URL と合意範囲を報告し、session.md § 調査成果の引き継ぎに従って報告の版・共有状態・未完了の操作を渡す。変更前の確認を、報告の改訂や Issue の更新に流用しない。

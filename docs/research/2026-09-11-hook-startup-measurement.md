# PreToolUse Bash matcher 8 本の起動時間 (移行後)

DR-0112 の Success Criteria「hook 層の移行後、`PreToolUse` の Bash matcher 8 本の合計起動時間が移行前を下回る」と、DR-0112 / DR-0114 の Reassessment Trigger「実測した起動時間の改善が 1 本あたり 5ms を下回る」を判定するための実測。

## 測り方

`settings.json` の `PreToolUse` の `Bash` matcher が登録する 8 本を、DR-0114 が定める bun の絶対パス (`/opt/homebrew/bin/bun`) で 1 本ずつ起動する。stdin には `{"tool_name":"Bash","tool_input":{"command":"echo hi"},"cwd":"/tmp"}` を渡す。どの hook もこの payload では早期 return するので、測っているのは判定ロジックでなく起動コスト。

8 本すべてを 1 回ずつ空回ししてから計測に入る。40 回を 1 ラウンドとして 3 ラウンド回し、ラウンドの最小値を採る。最初に測ったとき `client_identifier_gate` だけ 51.2ms と出たが、空回しを入れて測り直すと 11.55ms で他と並んだ。1 本目に寄る初回コストを他の hook の平均へ混ぜないための手順。

## 結果

| hook | ms / run |
| --- | --- |
| package_manager_rewrite.ts | 10.82 |
| npm_install_guard.ts | 10.66 |
| rm_to_trash.ts | 10.53 |
| git_sandbox_guard.ts | 11.21 |
| body_proofread.ts | 11.84 |
| issue_body_gate.ts | 11.82 |
| client_identifier_gate.ts | 11.55 |
| wiki_scene.ts | 12.44 |
| 合計 | 90.87 |

移行前の基準は DR-0113 が記録する python3 の 24.6ms を 8 本分で 196.80ms。

## 判定

Success Criteria は満たす。合計 90.87ms は移行前の 196.80ms を下回り、差は 105.93ms。

Reassessment Trigger には当たらない。1 本あたりの改善は平均 13.24ms で、最も改善の小さい `wiki_scene.ts` でも 12.16ms あり、閾値の 5ms を上回る。

DR-0113 が並べて記録している `node -e ''` の 30.4ms と比べても、8 本すべてがそれを下回る。DR-0114 が hooks 層だけ bun を採った判断は、この実測で裏づけられる。

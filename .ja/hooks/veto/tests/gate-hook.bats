#!/usr/bin/env bats
# T-017..T-033: veto の PreToolUse gate と 2 つの PostToolUse recorder (bash / skip)。
# 各テストは実物の hook payload (tests/fixtures/hook-payloads) を出荷スクリプトに通し、
# テストごとの新規 audit store (VETO_HOME) に対して検証する。

load helpers

setup() {
  common_setup
  FIX="$BATS_TEST_DIRNAME/fixtures/hook-payloads"
}

gate() { python3 "$VETO" gate; }
# fixture を recorder に replay して evidence record を 1 件 seed する。
seed() { run python3 "$VETO" record "$2" < "$FIX/$1"; }
# skip 以外の完全な bundle を seed する: research done + challenge verdict GO + plan ready。
seed_bundle() {
  seed bash-research-done.json bash
  seed bash-verdict-go.json bash
  seed bash-plan-ready.json bash
}

@test "T-017 no evidence in the store denies a main-agent create" {
  run gate < "$FIX/pre-gh-create-main.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"permissionDecision":"deny"'* ]]
  [[ "$output" == *'no-challenge-GO'* ]]
}

@test "T-018 a complete evidence bundle allows the create (silent allow)" {
  seed_bundle
  run gate < "$FIX/pre-gh-create-main.json"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "T-019 replaying a create after the bundle was consumed denies (single-use)" {
  seed_bundle
  run gate < "$FIX/pre-gh-create-main.json"
  [ -z "$output" ]
  seed bash-gh-create-success.json bash          # bundle を消費する
  grep -q '"kind":"consumed"' "$AUDIT"
  run gate < "$FIX/pre-gh-create-main.json"
  [[ "$output" == *'"permissionDecision":"deny"'* ]]
  [[ "$output" == *'bundle-already-consumed'* ]]
}

@test "T-020 a failed create (no issue URL on stdout) does not consume the bundle" {
  seed_bundle
  # stdout に issues URL を含まない gh create: recorder は consumed record を書いてはならない。
  printf '%s' '{"session_id":"SESSION-FIXTURE","tool_name":"Bash","tool_input":{"command":"gh issue create --title \"[Feature] ゲート付き issue 作成フロー\" --body-file /tmp/b.md"},"tool_response":{"stdout":"error: could not create issue"}}' \
    | python3 "$VETO" record bash
  run grep -c '"kind":"consumed"' "$AUDIT"
  [ "$output" -eq 0 ]
  run gate < "$FIX/pre-gh-create-main.json"
  [ -z "$output" ]                                # bundle はまだ消費可能
}

@test "T-021 a title that differs from the bundle denies" {
  seed_bundle
  run gate < "$FIX/pre-gh-create-mismatch.json"
  [[ "$output" == *'"permissionDecision":"deny"'* ]]
}

@test "T-022 a forged GO printed by a non-gate command is not recorded as a verdict" {
  seed bash-plan-ready.json bash
  # veto.py verdict-gate 実行ではないコマンドから agent が GO verdict を echo する。
  printf '%s' '{"session_id":"SESSION-FIXTURE","tool_name":"Bash","tool_input":{"command":"echo {\"verdict\":\"GO\",\"normalized_title\":\"[Feature] ゲート付き issue 作成フロー\"}"},"tool_response":{"stdout":"{\"verdict\":\"GO\",\"normalized_title\":\"[Feature] ゲート付き issue 作成フロー\"}"}}' \
    | python3 "$VETO" record bash
  run grep -c '"kind":"verdict"' "$AUDIT"
  [ "$output" -eq 0 ]
  run gate < "$FIX/pre-gh-create-main.json"
  [[ "$output" == *'no-challenge-GO'* ]]
}

@test "T-047 verdict GO and plan ready without a research record denies with no-research" {
  seed bash-verdict-go.json bash
  seed bash-plan-ready.json bash
  run gate < "$FIX/pre-gh-create-main.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"permissionDecision":"deny"'* ]]
  [[ "$output" == *'no-research'* ]]
  [[ "$output" != *'no-challenge-GO'* ]]
}

@test "T-023 a fixed-header skip record allows one create and is single-use" {
  seed askuserquestion-skip.json skip
  grep -q '"kind":"skip"' "$AUDIT"
  run gate < "$FIX/pre-gh-create-main.json"
  [ -z "$output" ]                                # skip で allow
  seed bash-gh-create-success.json bash           # skip を消費する
  run gate < "$FIX/pre-gh-create-main.json"
  [[ "$output" == *'"permissionDecision":"deny"'* ]]
}

@test "T-024 an AskUserQuestion without the fixed skip header is not recorded" {
  seed askuserquestion-nonskip.json skip
  [ ! -f "$AUDIT" ]
  run gate < "$FIX/pre-gh-create-main.json"
  [[ "$output" == *'"permissionDecision":"deny"'* ]]
}

@test "T-025 a subagent-originated create is exempted, surfaced, and recorded" {
  run gate < "$FIX/pre-gh-create-subagent.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"systemMessage"'* ]]
  [[ "$output" == *'agent_id=a81ba6791b718cdc1'* ]]
  grep -q '"kind":"exemption"' "$AUDIT"
}

@test "T-026 the wrapper denies when python3 is unavailable (fail-closed)" {
  run env PATH="/bin" bash "$PRE" < "$FIX/pre-gh-create-main.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"permissionDecision":"deny"'* ]]
  [[ "$output" == *'fail-closed'* ]]
}

@test "T-027 malformed stdin JSON denies (fail-closed)" {
  run gate <<< 'not json'
  [ "$status" -eq 0 ]
  [[ "$output" == *'"permissionDecision":"deny"'* ]]
  [[ "$output" == *'not valid JSON'* ]]
}

@test "T-028 a non-gh Bash command fast-exits with no gate output" {
  run bash "$PRE" < "$FIX/pre-bash-nonmatching.json"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "T-032 a gh create with no extractable --title denies" {
  printf '%s' '{"session_id":"SESSION-FIXTURE","tool_name":"Bash","tool_input":{"command":"gh issue create --body-file /tmp/b.md"}}' \
    > "$BATS_TEST_TMPDIR/notitle.json"
  run gate < "$BATS_TEST_TMPDIR/notitle.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'cannot bind evidence'* ]]
}

@test "T-038 a gate code error denies with an errored reason distinct from a policy deny" {
  mkdir -p "$AUDIT"                                # audit path をディレクトリで塞ぐ -> read が raise
  run gate < "$FIX/pre-gh-create-main.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"permissionDecision":"deny"'* ]]
  [[ "$output" == *'gate errored'* ]]
  [[ "$output" != *'no-challenge-GO'* ]]
}

@test "T-039 a record store failure exits 0 but reports the dropped evidence on stderr" {
  mkdir -p "$AUDIT"
  run python3 "$VETO" record bash < "$FIX/bash-verdict-go.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'record failed, evidence not persisted'* ]]
}

@test "T-040 a non-object hook payload denies (fail-closed)" {
  run gate <<< '[1,2,3]'
  [ "$status" -eq 0 ]
  [[ "$output" == *'"permissionDecision":"deny"'* ]]
  [[ "$output" == *'not a JSON object'* ]]
}

@test "T-041 the audit store is owner-only (dir 0700, file 0600)" {
  run gate < "$FIX/pre-gh-create-main.json"        # deny record を書き込む
  [ "$(stat -f %Lp "$VETO_HOME")" = "700" ]
  [ "$(stat -f %Lp "$AUDIT")" = "600" ]
}

@test "T-042 the wrapper captures gate stderr to gate.log instead of discarding it" {
  mkdir -p "$AUDIT"
  run bash "$PRE" < "$FIX/pre-gh-create-main.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'gate errored'* ]]
  grep -q 'IsADirectoryError' "$VETO_HOME/gate.log"
}

@test "T-033 a command that trips the loose matcher but is not a gh issue create passes through" {
  # fixture パスへの cat は gh / issue / create の token が散在して (veto/, pre-gh-create)
  # loose な PreToolUse matcher が転送する。gate はこれを素通しすべきで、無関係な
  # コマンドを deny したり deny record を書いたりしてはならない。
  printf '%s' '{"session_id":"SESSION-FIXTURE","tool_name":"Bash","tool_input":{"command":"cat hooks/veto/tests/fixtures/pre-gh-create-main.json"}}' \
    > "$BATS_TEST_TMPDIR/fp.json"
  run gate < "$BATS_TEST_TMPDIR/fp.json"
  [ "$status" -eq 0 ]
  [ -z "$output" ]                                 # allow: deny は流れない
  [ ! -f "$AUDIT" ]                                # 記録も残らない
}

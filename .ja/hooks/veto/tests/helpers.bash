# veto bats スイート共通 setup: スクリプトパス + テストごとの新規 audit store。
# `load helpers` で読み込む。各スイートの setup() が common_setup を呼んでから FIX dir を足す。
common_setup() {
  VETO="$BATS_TEST_DIRNAME/../veto.py"
  PRE="$BATS_TEST_DIRNAME/../pre-issue-create.sh"
  export VETO_HOME="$BATS_TEST_TMPDIR/store"
  AUDIT="$VETO_HOME/audit.jsonl"
}

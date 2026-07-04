# Shared setup for the veto bats suites: script paths + a fresh per-test audit store.
# Loaded via `load helpers`; each suite's setup() calls common_setup then adds its FIX dir.
common_setup() {
  VETO="$BATS_TEST_DIRNAME/../veto.py"
  PRE="$BATS_TEST_DIRNAME/../pre-issue-create.sh"
  export VETO_HOME="$BATS_TEST_TMPDIR/store"
  AUDIT="$VETO_HOME/audit.jsonl"
}

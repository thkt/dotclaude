#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENTS="$SCRIPT_DIR/agents.sh"
DEMOTED_USER="node"

AGENT_NAME="${1:-}"
if [[ -z "$AGENT_NAME" ]]; then
  echo "ERROR: usage: entrypoint.sh <agent-name>" >&2
  exit 1
fi

if ! "$SCRIPT_DIR/init-firewall.sh" "$AGENT_NAME"; then
  echo "ERROR: firewall setup failed, refusing to exec $AGENT_NAME" >&2
  exit 1
fi

if gosu "$DEMOTED_USER" iptables -L INPUT -n >/dev/null 2>&1; then
  echo "ERROR: $DEMOTED_USER can still run iptables after demotion, aborting" >&2
  exit 1
fi

AGENT_EXEC="$("$AGENTS" exec "$AGENT_NAME")"
exec gosu "$DEMOTED_USER" $AGENT_EXEC

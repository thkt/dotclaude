#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENTS="$SCRIPT_DIR/agents.sh"
IMAGE="${HAKO_IMAGE:-hako}"

usage() {
  echo "usage: hako.sh <agent-name> [--live]" >&2
  echo "       hako.sh login <agent-name>" >&2
}

resolve_workspace_src() {
  local live_flag="$1"
  if [[ "$live_flag" == "--live" ]]; then
    echo "$PWD"
    return
  fi
  local clone_dir
  clone_dir="$(mktemp -d "${TMPDIR:-/tmp}/hako-clone-XXXXXX")"
  git clone "$PWD" "$clone_dir" >/dev/null
  echo "$clone_dir"
}

ensure_agent_volume() {
  local volume_name="$1"
  container volume create "$volume_name" >/dev/null 2>&1 || true
}

run_container() {
  local agent_name="$1" auth_dir="$2" workspace_src="$3"
  shift 3
  local volume_name
  volume_name="hako-${agent_name}-auth"

  ensure_agent_volume "$volume_name"

  container run \
    "$@" \
    --cap-add NET_ADMIN \
    -v "$workspace_src:/workspace" \
    -v "$volume_name:$auth_dir" \
    "$IMAGE" "$agent_name"
}

run_agent() {
  local agent_name="$1" live_flag="${2:-}"
  local auth_dir workspace_src
  auth_dir="$("$AGENTS" auth-dir "$agent_name")"
  workspace_src="$(resolve_workspace_src "$live_flag")"
  run_container "$agent_name" "$auth_dir" "$workspace_src"
}

run_login() {
  local agent_name="$1"
  local auth_dir workspace_src
  auth_dir="$("$AGENTS" auth-dir "$agent_name")"
  workspace_src="$(resolve_workspace_src "")"
  run_container "$agent_name" "$auth_dir" "$workspace_src" --interactive --tty
}

main() {
  local first_arg="${1:-}"

  if [[ "$first_arg" == "login" ]]; then
    local agent_name="${2:-}"
    if [[ -z "$agent_name" ]]; then
      usage
      exit 1
    fi
    run_login "$agent_name"
    return
  fi

  if [[ -z "$first_arg" ]]; then
    usage
    exit 1
  fi
  run_agent "$first_arg" "${2:-}"
}

main "$@"

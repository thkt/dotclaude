#!/usr/bin/env python3
"""veto: evidence gate for gh issue create. All subcommands live in this single file.

  veto.py gate                    Reads a PreToolUse hook payload from stdin, returns allow / deny
  veto.py record bash|skip        Reads a PostToolUse payload from stdin, records to the audit store
  veto.py plan-gate --title T     Reads plan JSON from stdin, returns {ready, errors, normalized_title}
  veto.py verdict-gate --title T  Reads verdict JSON from stdin, applies the one-way GO -> NO-GO downgrade
  veto.py research-gate --title T --file F  Declares a saved research output exists, bound to the title

The fail-closed boundary is gate / plan-gate / verdict-gate / research-gate (parse failure or a
missing file means deny / exit 1). record is best-effort (a payload of the wrong shape is a silent
no-op). Threat model is discipline-not-security: a discipline gate with explicit agent_id / skip
exemptions, not a defense against adversarial evasion.
"""

import hashlib
import json
import os
import re
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import NoReturn

# ---------------------------------------------------------------------------
# Title binding
# ---------------------------------------------------------------------------

GATE_MAX_ASSUMPTIONS = 7


def normalize_title(title):
    """Trim and collapse runs of whitespace to one space, so titles differing only in whitespace bind to the same evidence bundle."""
    return " ".join(str(title or "").split())


def flag_arg(argv, flag):
    """Return the value following flag in argv, or "" when absent."""
    try:
        i = argv.index(flag)
        return argv[i + 1]
    except (ValueError, IndexError):
        return ""


def title_arg(argv):
    return flag_arg(argv, "--title")


def extract_title(cmd):
    """Extract the --title value from a gh issue create command string. Handles --title "x" / 'x' / =x / -t.
    Tries the 4 quoted forms first, the 2 bare forms last."""
    s = str(cmd or "")
    patterns = [
        r'--title[=\s]+"((?:[^"\\]|\\.)*)"',
        r"--title[=\s]+'([^']*)'",
        r'-t[=\s]+"((?:[^"\\]|\\.)*)"',
        r"-t[=\s]+'([^']*)'",
        r"--title[=\s]+(\S+)",
        r"-t[=\s]+(\S+)",
    ]
    for p in patterns:
        m = re.search(p, s)
        if m:
            return re.sub(r'\\(["\\])', r"\1", m.group(1))
    return ""


def is_gh_issue_create(cmd):
    """True only for a contiguous `gh issue create` at a command boundary. Precise detection so the
    loose PreToolUse matcher's catches (tokens scattered across paths or commit messages) are not denied."""
    return (
        re.search(r"(^|[\s;&|(])gh\s+issue\s+create(\s|$)", str(cmd or "")) is not None
    )


# ---------------------------------------------------------------------------
# Audit store (JSONL)
# ---------------------------------------------------------------------------


def store_dir():
    """Overridable via VETO_HOME (tests point it at a temp dir)."""
    return Path(
        os.environ.get("VETO_HOME") or Path.home() / ".claude" / "state" / "veto"
    )


def audit_path():
    return store_dir() / "audit.jsonl"


def append_record(record):
    """audit.jsonl carries session_id / title, so keep it owner-only (dir 0700 / file 0600)."""
    store_dir().mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(audit_path(), os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    with os.fdopen(fd, "a", encoding="utf-8") as f:
        f.write(dumps(record) + "\n")


def read_records():
    """Read all records. Broken or empty lines are skipped (the gate fails closed on missing
    evidence anyway, so a parse error need not abort)."""
    p = audit_path()
    if not p.exists():
        return []
    records = []
    for line in p.read_text(encoding="utf-8").splitlines():
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return records


def dumps(obj):
    """JSON.stringify-compatible compact JSON (does not escape non-ASCII)."""
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)


def deny_json(reason):
    """PreToolUse deny response envelope. Shared by policy denies (cmd_gate) and code-error denies (main)."""
    return dumps(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"veto: {reason}",
            }
        }
    )


def now():
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


# ---------------------------------------------------------------------------
# Gate evaluation
# ---------------------------------------------------------------------------


def evaluate(records, ctx):
    """Decide whether the gh issue create may pass.
    ctx: {session_id, agent_id, normalized_title}
    Returns: {decision: allow|deny, via, reasons, system_message?}"""
    nt = ctx["normalized_title"]

    # agent_id exemption: subagent-originated creates (headless /build etc.). A documented residual
    # bypass, allowed on condition it is surfaced via systemMessage and leaves an exemption record.
    if ctx.get("agent_id"):
        return {
            "decision": "allow",
            "via": "agent_id",
            "reasons": [],
            "system_message": (
                f"veto: subagent-originated gh issue create exempted "
                f"(agent_id={ctx['agent_id']}); recorded to the audit log."
            ),
        }

    sess = [r for r in records if r.get("session_id") == ctx["session_id"]]

    # single-use consumption tally
    consumed_bundle = sum(
        1
        for r in sess
        if r.get("kind") == "consumed"
        and r.get("via") == "bundle"
        and r.get("normalized_title") == nt
    )
    skip_count = sum(1 for r in sess if r.get("kind") == "skip")
    consumed_skip = sum(
        1 for r in sess if r.get("kind") == "consumed" and r.get("via") == "skip"
    )

    # The evidence bundle for this title: research done + challenge GO + plan ready. Each is the
    # output of a synchronous gate script (research-gate / verdict-gate / plan-gate) captured by
    # the recorder via Bash PostToolUse.
    research_done = any(
        r.get("kind") == "research" and r.get("normalized_title") == nt for r in sess
    )
    verdict_go = any(
        r.get("kind") == "verdict"
        and r.get("normalized_title") == nt
        and r.get("verdict") == "GO"
        for r in sess
    )
    plan_ready = any(
        r.get("kind") == "plan"
        and r.get("normalized_title") == nt
        and r.get("ready") is True
        for r in sess
    )

    bundle_complete = research_done and verdict_go and plan_ready
    if bundle_complete and consumed_bundle == 0:
        return {"decision": "allow", "via": "bundle", "reasons": []}

    # Explicit human exemption for docs / chore / minor-bug (recorded via the fixed-header
    # AskUserQuestion). Single-use within the session: N skips permit N creates.
    if skip_count - consumed_skip > 0:
        return {"decision": "allow", "via": "skip", "reasons": []}

    reasons = []
    if bundle_complete and consumed_bundle > 0:
        reasons.append("bundle-already-consumed")
    else:
        if not research_done:
            reasons.append("no-research")
        if not verdict_go:
            reasons.append("no-challenge-GO")
        if not plan_ready:
            reasons.append("no-plan-ready")
    return {"decision": "deny", "via": None, "reasons": reasons}


def consumption_for(records, ctx):
    """What record should consume after a successful create. Mirrors evaluate()'s allow paths.
    The agent_id path was already recorded at gate time, so it consumes nothing."""
    r = evaluate(records, ctx)
    if r["decision"] != "allow" or r["via"] == "agent_id":
        return None
    return r["via"]  # "bundle" | "skip"


# ---------------------------------------------------------------------------
# Plan validation (canonical)
# ---------------------------------------------------------------------------


def validate_plan(plan):
    """Canonical plan-readiness validation. workflows/build.js keeps a marker-fenced manual copy,
    and tests/contract_build_port.py asserts both return identical errors on every fixture.
    Error strings stay in lockstep with the build.js copy.

    Missing array fields are treated as empty (arbitrary stdin must not crash the gate). Content
    and structure defects come back as errors, not exceptions."""
    errors = []
    units = plan.get("units")
    units = units if isinstance(units, list) else []
    # Non-dict entries get a position-based placeholder id so they surface as "<id> has no ..."
    # errors (folding them into a shared id would fabricate duplicate unit ids).
    units = [
        u if isinstance(u, dict) else {"id": f"units[{i}]"} for i, u in enumerate(units)
    ]
    if not units:
        errors.append("units is empty. Define at least one implementation unit")
    if not str(plan.get("test_command") or "").strip():
        errors.append("test_command is empty")

    ids = {u.get("id") for u in units}
    if len(ids) != len(units):
        errors.append("duplicate unit ids")

    test_ids = set()
    for i, u in enumerate(units):
        tests = u.get("tests")
        tests = tests if isinstance(tests, list) else []
        tests = [
            t if isinstance(t, dict) else {"id": f"units[{i}].tests[{j}]"}
            for j, t in enumerate(tests)
        ]
        files = u.get("files")
        files = files if isinstance(files, list) else []
        depends_on = u.get("depends_on")
        depends_on = depends_on if isinstance(depends_on, list) else []
        uid = u.get("id")
        if not tests:
            errors.append(f"{uid} has no test scenario")
        if not files:
            errors.append(f"{uid} has no target files")
        if not str(u.get("goal") or "").strip():
            errors.append(f"{uid} has an empty goal")
        if not str(u.get("contract") or "").strip():
            errors.append(f"{uid} has an empty contract")
        for t in tests:
            tid = t.get("id")
            if tid in test_ids:
                errors.append(f"duplicate test id {tid}")
            test_ids.add(tid)
            for field in ["name", "given", "when", "then"]:
                if not str(t.get(field) or "").strip():
                    errors.append(f"{tid} has an empty {field}")
        for d in depends_on:
            if d not in ids:
                errors.append(f"{uid}'s depends_on {d} points to a nonexistent unit")

    # cycle detection (DFS)
    state = {}

    def visit(uid, path):
        if state.get(uid) == "done":
            return
        if state.get(uid) == "visiting":
            errors.append("depends_on cycle: " + " -> ".join(path + [uid]))
            return
        state[uid] = "visiting"
        u = next((x for x in units if x.get("id") == uid), None)
        deps = u.get("depends_on") if u else None
        deps = deps if isinstance(deps, list) else []
        for d in deps:
            visit(d, path + [uid])
        state[uid] = "done"

    for u in units:
        visit(u.get("id"), [])

    return errors


# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------


def read_stdin():
    return sys.stdin.buffer.read().decode("utf-8")


def parse_json_object(raw, prefix, schema):
    """Parse stdin JSON as an object. Failure exits 1 (fail-closed).
    sys.exit(str) prints the message to stderr and exits 1."""
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError as e:
        sys.exit(f"{prefix}: stdin is not valid JSON: {e}")
    if not isinstance(obj, dict):
        sys.exit(f"{prefix}: stdin is not a JSON object ({schema} mismatch)")
    return obj


def cmd_plan_gate(argv):
    """Deterministic plan-readiness check ported from workflows/build.js validate."""
    raw = read_stdin()
    plan = parse_json_object(raw, "plan-gate", "PLAN_SCHEMA")
    errors = validate_plan(plan)
    print(
        dumps(
            {
                "ready": not errors,
                "errors": errors,
                "normalized_title": normalize_title(title_arg(argv)),
            }
        )
    )


def cmd_verdict_gate(argv):
    """Deterministic residual gate. One-way GO -> NO-GO downgrade only; never upgrades a NO-GO to GO.
    A non-dict assumption entry carries no flags but still counts toward max-assumptions, and is
    surfaced as a producer bug via warnings."""
    raw = read_stdin()
    inp = parse_json_object(raw, "verdict-gate", "VERDICT_SCHEMA")
    if inp.get("verdict") not in ("GO", "NO-GO"):
        sys.exit(
            "verdict-gate: verdict field missing or not one of GO / NO-GO (VERDICT_SCHEMA mismatch)"
        )

    assumptions = inp.get("assumptions")
    assumptions = assumptions if isinstance(assumptions, list) else []
    warnings = [
        f"assumptions[{i}] is not an object"
        for i, a in enumerate(assumptions)
        if not isinstance(a, dict)
    ]
    reasons = []
    if inp["verdict"] == "GO":
        flagged = [a for a in assumptions if isinstance(a, dict)]
        if any(a.get("irreversible") is True for a in flagged):
            reasons.append("irreversible-assumption")
        if len(assumptions) > GATE_MAX_ASSUMPTIONS:
            reasons.append("max-assumptions")
        if any(a.get("underspecified") is True for a in flagged):
            reasons.append("underspecified")

    print(
        dumps(
            {
                "verdict": "NO-GO" if reasons else inp["verdict"],
                "downgraded": bool(reasons),
                "reasons": reasons,
                "warnings": warnings,
                "normalized_title": normalize_title(title_arg(argv)),
                "raw_input_sha": hashlib.sha256(raw.encode("utf-8")).hexdigest(),
            }
        )
    )


def cmd_research_gate(argv):
    """Presence check for a research run. Declares that a saved, non-empty research output file
    exists, bound to the title. Content quality is not inspected (discipline-not-security).
    A missing or empty file exits 1 (fail-closed); with no stdout, the recorder records nothing."""
    path = flag_arg(argv, "--file")
    if not path:
        sys.exit("research-gate: --file <research output path> is required")
    p = Path(path).expanduser()
    if not p.is_file() or p.stat().st_size == 0:
        sys.exit(
            f"research-gate: research output not found or empty: {path} (fail-closed)"
        )
    print(
        dumps(
            {
                "done": True,
                "file": str(p),
                "normalized_title": normalize_title(title_arg(argv)),
            }
        )
    )


def cmd_gate():
    """PreToolUse gate on `gh issue create`. Allows only when this title has its evidence bundle
    (challenge GO + plan ready) or an unconsumed skip record, or when subagent-originated
    (agent_id exemption). Everything else is denied. Parse failure or a missing title also
    denies (fail-closed)."""

    def deny(payload, title, reason) -> NoReturn:
        # Emitting the deny response takes priority over writing the record (dropping the deny
        # JSON on a record failure would degrade into the wrapper's generic DENY and lose the reason).
        try:
            append_record(
                {
                    "kind": "deny",
                    "ts": now(),
                    "session_id": (payload or {}).get("session_id"),
                    "normalized_title": title,
                    "reason": reason,
                }
            )
        except Exception as e:
            print(
                f"veto: failed to append deny record: {type(e).__name__}: {e}",
                file=sys.stderr,
            )
        print(deny_json(reason))
        sys.exit(0)

    raw = read_stdin()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        deny(None, "", "hook payload is not valid JSON (fail-closed)")
    if not isinstance(payload, dict):
        deny(None, "", "hook payload is not a JSON object (fail-closed)")

    command = (payload.get("tool_input") or {}).get("command", "")

    # The PreToolUse matcher (pre-issue-create.sh) is intentionally loose (it forwards even
    # scattered gh / issue / create tokens), so a non-create here is a matcher false positive.
    # Pass it through rather than denying.
    if not is_gh_issue_create(command):
        sys.exit(0)

    nt = normalize_title(extract_title(command))
    if not nt:
        deny(
            payload,
            "",
            "gh issue create without an extractable --title; cannot bind evidence",
        )

    ctx = {
        "session_id": payload.get("session_id"),
        "agent_id": payload.get("agent_id"),
        "normalized_title": nt,
    }
    result = evaluate(read_records(), ctx)

    if result["decision"] == "deny":
        deny(
            payload,
            nt,
            f"no evidence bundle for this issue title ({', '.join(result['reasons'])})",
        )

    # Allow. The agent_id path records the exemption while surfacing it. bundle / skip allow
    # silently (consumption is tallied by record bash when the create succeeds).
    if result["via"] == "agent_id":
        append_record(
            {
                "kind": "exemption",
                "ts": now(),
                "session_id": ctx["session_id"],
                "normalized_title": nt,
                "agent_id": ctx["agent_id"],
                "agent_type": payload.get("agent_type"),
            }
        )
        print(dumps({"systemMessage": result["system_message"]}))
    sys.exit(0)


def cmd_record(kind):
    """PostToolUse recorder. Best-effort: a payload of an unexpected shape is a silent no-op
    (the fail-closed decision point is the gate, not the recorder)."""
    try:
        payload = json.loads(read_stdin())
    except (json.JSONDecodeError, UnicodeDecodeError):
        return

    session_id = payload.get("session_id")

    if kind == "bash":
        cmd = (payload.get("tool_input") or {}).get("command", "")
        stdout = (payload.get("tool_response") or {}).get("stdout", "")

        # (a) a verdict-gate run  -> record GO / NO-GO bound to the title
        # (b) a plan-gate run     -> record the ready flag bound to the title
        # (c) a research-gate run -> record research done bound to the title
        # The optional quote absorbs the closing quote of a quoted path (e.g. "$DIR/veto.py").
        gate_run = re.search(
            r"veto\.py[\"']?\s+(verdict-gate|plan-gate|research-gate)\b", cmd
        )
        if gate_run:
            try:
                out = json.loads(stdout.strip().split("\n")[-1] or "{}")
            except json.JSONDecodeError:
                return
            if gate_run.group(1) == "verdict-gate" and out.get("verdict") in (
                "GO",
                "NO-GO",
            ):
                append_record(
                    {
                        "kind": "verdict",
                        "ts": now(),
                        "session_id": session_id,
                        "normalized_title": out.get("normalized_title", ""),
                        "verdict": out["verdict"],
                        "downgraded": out.get("downgraded") is True,
                    }
                )
            elif gate_run.group(1) == "plan-gate" and isinstance(
                out.get("ready"), bool
            ):
                append_record(
                    {
                        "kind": "plan",
                        "ts": now(),
                        "session_id": session_id,
                        "normalized_title": out.get("normalized_title", ""),
                        "ready": out["ready"],
                    }
                )
            elif gate_run.group(1) == "research-gate" and out.get("done") is True:
                append_record(
                    {
                        "kind": "research",
                        "ts": now(),
                        "session_id": session_id,
                        "normalized_title": out.get("normalized_title", ""),
                        "file": out.get("file", ""),
                    }
                )
            return

        # (d) a successful gh issue create -> consume the bundle / skip that was used (single-use).
        # Detection reuses the same is_gh_issue_create as the gate (duplicating the predicate
        # would be a divergence source). The agent_id path already recorded its exemption at
        # gate time, so it is excluded.
        if is_gh_issue_create(cmd) and not payload.get("agent_id"):
            if not re.search(r"github\.com/\S+/issues/\d+", stdout):
                return
            ctx = {
                "session_id": session_id,
                "agent_id": None,
                "normalized_title": normalize_title(extract_title(cmd)),
            }
            via = consumption_for(read_records(), ctx)
            if via:
                append_record(
                    {
                        "kind": "consumed",
                        "ts": now(),
                        "session_id": session_id,
                        "via": via,
                        "normalized_title": ctx["normalized_title"]
                        if via == "bundle"
                        else None,
                    }
                )
        return

    # AskUserQuestion: record a human gate-exemption only when the fixed header 判定スキップ is
    # present. The chosen kind (docs / chore / minor-bug) is the answer to that question.
    if kind == "skip":
        questions = (payload.get("tool_input") or {}).get("questions") or []
        skip_q = next(
            (q for q in questions if q and q.get("header") == "判定スキップ"), None
        )
        if not skip_q:
            return
        answers = (payload.get("tool_response") or {}).get("answers") or {}
        append_record(
            {
                "kind": "skip",
                "ts": now(),
                "session_id": session_id,
                "skip_kind": answers.get(skip_q.get("question"), ""),
            }
        )


def main():
    sub = sys.argv[1] if len(sys.argv) > 1 else ""
    if sub == "gate":
        try:
            cmd_gate()
        except Exception:
            # A code failure fails closed with a reason distinguishable from a policy deny
            # (no evidence). The traceback goes to stderr (the wrapper routes it to gate.log).
            # SystemExit does not inherit Exception, so cmd_gate's normal exits pass through here.
            traceback.print_exc()
            print(
                deny_json(
                    "gate errored, not a policy deny (fail-closed); "
                    f"traceback in {store_dir() / 'gate.log'}"
                )
            )
            sys.exit(0)
    elif sub == "record":
        # record always exits 0 (best-effort), but the fact that evidence was dropped goes to
        # stderr (silence would make a store failure indistinguishable from a no-challenge-GO deny).
        try:
            cmd_record(sys.argv[2] if len(sys.argv) > 2 else "")
        except Exception as e:
            print(
                f"veto: record failed, evidence not persisted: {type(e).__name__}: {e}",
                file=sys.stderr,
            )
        sys.exit(0)
    elif sub in ("plan-gate", "verdict-gate", "research-gate"):
        try:
            {
                "plan-gate": cmd_plan_gate,
                "verdict-gate": cmd_verdict_gate,
                "research-gate": cmd_research_gate,
            }[sub](sys.argv[2:])
        except Exception as e:
            # Code failures that parse_json_object does not catch also become a structured
            # fail-closed (exit 1 + reason) instead of a raw traceback.
            print(
                f"veto: {sub} errored: {type(e).__name__}: {e} (fail-closed)",
                file=sys.stderr,
            )
            sys.exit(1)
    else:
        print(
            f"veto: unknown subcommand {sub!r} (gate | record | plan-gate | verdict-gate | research-gate)",
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()

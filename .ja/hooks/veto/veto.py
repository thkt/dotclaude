#!/usr/bin/env python3
"""veto: gh issue create の evidence gate。単一ファイルに全 subcommand を集約する。

  veto.py gate                    PreToolUse hook payload を stdin で受け、allow / deny を返す
  veto.py record bash|skip        PostToolUse payload を stdin で受け、audit store に記録する
  veto.py plan-gate --title T     plan JSON を stdin で受け、{ready, errors, normalized_title} を返す
  veto.py verdict-gate --title T  verdict JSON を stdin で受け、一方向 GO -> NO-GO downgrade を適用する
  veto.py research-gate --title T --file F  保存済み research 出力の存在を title に紐付けて宣言する

fail-closed の境界は gate / plan-gate / verdict-gate / research-gate (parse 失敗・file 不在は deny / exit 1)。
record は best-effort (形が合わない payload は silent no-op)。脅威モデルは discipline-not-security:
agent_id / skip の明示的 exemption を持つ規律ゲートで、敵対的回避への防御ではない。
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
    """trim + 連続空白を 1 スペースに畳む。空白差だけの title を同じ evidence bundle に束ねる。"""
    return " ".join(str(title or "").split())


def flag_arg(argv, flag):
    """argv から flag の次の値を取り出す。無ければ ""。"""
    try:
        i = argv.index(flag)
        return argv[i + 1]
    except (ValueError, IndexError):
        return ""


def title_arg(argv):
    return flag_arg(argv, "--title")


def extract_title(cmd):
    """gh issue create コマンド文字列から --title 値を取り出す。--title "x" / 'x' / =x / -t 対応。
    quoted 4 形を先に、bare 2 形を最後に試す。"""
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
    """コマンド境界で連続する `gh issue create` のみ真。loose な PreToolUse matcher が拾った
    無関係コマンド (パスやコミットメッセージに散在する token) を deny しないための精密判定。"""
    return (
        re.search(r"(^|[\s;&|(])gh\s+issue\s+create(\s|$)", str(cmd or "")) is not None
    )


# ---------------------------------------------------------------------------
# Audit store (JSONL)
# ---------------------------------------------------------------------------


def store_dir():
    """VETO_HOME で override 可能 (テストが temp dir を指す)。"""
    return Path(
        os.environ.get("VETO_HOME") or Path.home() / ".claude" / "state" / "veto"
    )


def audit_path():
    return store_dir() / "audit.jsonl"


def append_record(record):
    """audit.jsonl は session_id / title を含むので owner-only (dir 0700 / file 0600)。"""
    store_dir().mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(audit_path(), os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    with os.fdopen(fd, "a", encoding="utf-8") as f:
        f.write(dumps(record) + "\n")


def read_records():
    """全レコードを読む。壊れた行・空行は skip (gate は evidence 不在で fail-closed
    するので、parse エラーで落とす必要がない)。"""
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
    """JSON.stringify 互換の compact JSON (非 ASCII をエスケープしない)。"""
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)


def deny_json(reason):
    """PreToolUse の deny 応答 envelope。policy deny (cmd_gate) と code-error deny (main) で共用。"""
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
    """gh issue create を通してよいか判定する。
    ctx: {session_id, agent_id, normalized_title}
    返り値: {decision: allow|deny, via, reasons, system_message?}"""
    nt = ctx["normalized_title"]

    # agent_id exemption: subagent 発の create (headless /build 等)。systemMessage で可視化し
    # exemption record を残すことを条件に許可する documented residual bypass。
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

    # single-use の消費計上
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

    # この title の evidence bundle: research done + challenge GO + plan ready。いずれも同期
    # gate script (research-gate / verdict-gate / plan-gate) の出力を Bash PostToolUse で
    # recorder が捕捉したもの。
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

    # docs / chore / minor-bug の人間による明示 exemption (固定 header の AskUserQuestion で記録)。
    # session 内 single-use: N skip が N create を許す。
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
    """成功した create の後に record が消費すべきもの。evaluate() の allow パスを鏡映しにする。
    agent_id パスは gate 時に記録済みなので消費しない。"""
    r = evaluate(records, ctx)
    if r["decision"] != "allow" or r["via"] == "agent_id":
        return None
    return r["via"]  # "bundle" | "skip"


# ---------------------------------------------------------------------------
# Plan validation (canonical)
# ---------------------------------------------------------------------------


def validate_plan(plan):
    """plan readiness の canonical 検証。workflows/build.js は marker で囲った手動コピーを持ち、
    tests/contract_build_port.py が全 fixture で同一エラーを返すことを保証する。
    エラー文字列は build.js コピーと lockstep 維持。

    配列 field の欠落は空扱い (任意の stdin で gate を落とさない)。内容・構造の欠陥は
    例外でなく errors として返す。"""
    errors = []
    units = plan.get("units")
    units = units if isinstance(units, list) else []
    # 非 dict の entry は位置ベースの placeholder id を与えて "<id> has no ..." 系の errors と
    # して表面化させる (共有 id に畳むと偽の duplicate unit ids が出る)。
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
    """stdin JSON を object として parse する。失敗は exit 1 (fail-closed)。
    sys.exit(str) は message を stderr に出して exit 1 する。"""
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError as e:
        sys.exit(f"{prefix}: stdin is not valid JSON: {e}")
    if not isinstance(obj, dict):
        sys.exit(f"{prefix}: stdin is not a JSON object ({schema} mismatch)")
    return obj


def cmd_plan_gate(argv):
    """workflows/build.js validate 由来の決定論的 plan-readiness チェック。"""
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
    """決定論的 residual gate。一方向 GO -> NO-GO downgrade のみ。NO-GO を GO に上げることはない。
    非 dict の assumption entry は flag なし扱いだが、件数としては max-assumptions に数え、
    warnings で producer バグとして可視化する。"""
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
    """research 実行の presence チェック。保存済み research 出力ファイルの存在 (非空) を
    title に紐付けて宣言する。内容の質は見ない (discipline-not-security)。
    file 不在・空は exit 1 (fail-closed) で、stdout が出ないため recorder にも記録されない。"""
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
    """PreToolUse gate on `gh issue create`。この title の evidence bundle (challenge GO +
    plan ready) か未消費の skip record があるとき、または subagent 発 (agent_id exemption)
    のときだけ許可する。それ以外は deny。parse 失敗・title 不在も deny (fail-closed)。"""

    def deny(payload, title, reason) -> NoReturn:
        # deny 応答の出力は record 書き込みより優先する (record 失敗で deny JSON を
        # 落とすと wrapper の generic DENY に化けて理由が消える)。
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

    # PreToolUse matcher (pre-issue-create.sh) は意図的に loose (gh / issue / create token が
    # 散在するだけでも forward) なので、実 create でなければ matcher の誤爆。deny せず素通しする。
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

    # allow。agent_id パスは exemption を可視化しつつ記録する。bundle / skip は silent allow
    # (消費は create 成功時に record bash が計上する)。
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
    """PostToolUse recorder。best-effort: 期待した形でない payload は silent no-op
    (fail-closed の決定点は recorder でなく gate)。"""
    try:
        payload = json.loads(read_stdin())
    except (json.JSONDecodeError, UnicodeDecodeError):
        return

    session_id = payload.get("session_id")

    if kind == "bash":
        cmd = (payload.get("tool_input") or {}).get("command", "")
        stdout = (payload.get("tool_response") or {}).get("stdout", "")

        # (a) verdict-gate 実行  -> GO / NO-GO を title に紐付けて記録
        # (b) plan-gate 実行     -> ready flag を title に紐付けて記録
        # (c) research-gate 実行 -> research done を title に紐付けて記録
        # quote 許容は quoted path (例 "$DIR/veto.py") の閉じ quote 用。
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

        # (d) 成功した gh issue create -> 使った bundle / skip を消費 (single-use)。
        # 判定は gate と同じ is_gh_issue_create に統一 (述語の二重化は divergence 源)。
        # agent_id パスは gate 時に exemption 記録済みなので対象外。
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

    # AskUserQuestion: 固定 header 判定スキップ があるときだけ人間の gate-exemption を記録。
    # 選ばれた kind (docs / chore / minor-bug) はその質問への answer。
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
            # コード異常は policy deny (no evidence) と区別できる理由で fail-closed する。
            # traceback は stderr へ (wrapper が gate.log に回す)。SystemExit は Exception を
            # 継承しないので、cmd_gate 内の正常 exit はここを素通りする。
            traceback.print_exc()
            print(
                deny_json(
                    "gate errored, not a policy deny (fail-closed); "
                    f"traceback in {store_dir() / 'gate.log'}"
                )
            )
            sys.exit(0)
    elif sub == "record":
        # record は常に exit 0 (best-effort) だが、evidence を落とした事実は stderr に残す
        # (無音だと store 障害が no-challenge-GO deny と区別できない)。
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
            # parse_json_object が拾わないコード異常も生 traceback でなく構造化した
            # fail-closed (exit 1 + 理由) にする。
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

#!/usr/bin/env python3
"""Usage: snapshot.py   (audit payload JSON on stdin)

audit の 1 実行を $HOME/.claude/workspace/history/ に記録し、直近の prior
snapshot に対する resolved/new/carried の delta を計算する。

stdin:  JSON {scope, focus, pre_flight, raw_findings[], findings[], skipped[]}
        各 raw_findings entry は最低限 {file, message} を持つ。
stdout: 書き込んだ JSON record のパス。
exit 0 は成功。exit 1 は payload が parse 不能 (何も書かない)。

record に追加される解決済みフィールド (シェル / prior snapshot 由来):
  branch        git rev-parse --abbrev-ref HEAD ("unknown" にフォールバック)
  generated_at  UTC ISO-8601
  delta         直近の audit-*.json に対する {resolved, new, carried} カウント。
                (file, message) で照合。初回は全て 0 + note "first run"。
"""

import glob
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import NoReturn

HISTORY_DIR = Path(os.path.expanduser("~")) / ".claude" / "workspace" / "history"


def fail(message) -> NoReturn:
    print(f"Error: {message}", file=sys.stderr)
    sys.exit(1)


def finding_key(f):
    return (f.get("file"), f.get("message"))


def compute_delta(current_raw, prior_raw):
    """resolved = prior のみ、new = current のみ、carried = 両方に存在。

    prior snapshot が無いとき prior_raw は None。その場合は "first run" note を
    記録する。
    """
    if prior_raw is None:
        return {"resolved": 0, "new": 0, "carried": 0, "note": "first run"}
    cur = {finding_key(f) for f in current_raw}
    prior = {finding_key(f) for f in prior_raw}
    return {
        "resolved": len(prior - cur),
        "new": len(cur - prior),
        "carried": len(cur & prior),
    }


def latest_prior_raw(history_dir):
    """直近の prior audit-*.json の raw_findings。存在しなければ None。

    ファイル名でソートする。名前に UTC timestamp が入るため辞書順が時系列に
    なる。読めない、あるいは raw_findings を欠く prior ファイルは run を
    中断せずスキップする。
    """
    priors = sorted(glob.glob(str(history_dir / "audit-*.json")), reverse=True)
    for path in priors:
        try:
            with open(path) as fh:
                data = json.load(fh)
        except (OSError, ValueError):
            continue
        raw = data.get("raw_findings")
        if isinstance(raw, list):
            return raw
    return None


def git_branch():
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        branch = out.stdout.strip()
        return branch or "unknown"
    except (OSError, subprocess.SubprocessError):
        return "unknown"


def build_record(payload, branch, generated_at, delta):
    record = dict(payload)
    record["branch"] = branch
    record["generated_at"] = generated_at
    record["delta"] = delta
    return record


def main():
    raw_stdin = sys.stdin.read()
    try:
        payload = json.loads(raw_stdin)
    except ValueError as exc:
        fail(f"unparseable payload: {exc}")
    if not isinstance(payload, dict):
        fail("payload must be a JSON object")

    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)

    prior_raw = latest_prior_raw(HISTORY_DIR)
    current_raw = payload.get("raw_findings") or []
    delta = compute_delta(current_raw, prior_raw)

    record = build_record(
        payload,
        branch=git_branch(),
        generated_at=now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        delta=delta,
    )

    out_path = HISTORY_DIR / f"audit-{now.strftime('%Y-%m-%d-%H%M%S')}.json"
    with open(out_path, "w") as fh:
        json.dump(record, fh, ensure_ascii=False, indent=2)
    print(str(out_path))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Usage: revalidate.py   (preconditions JSON on stdin)

plan の precondition を working tree に対して決定的に再検証する。

stdin:  {path, pattern?} の JSON 配列。issue の plan が前提とする既存コード。
        path は process cwd (repo root) からの相対。pattern は任意で、その
        ファイルに含まれるはずの literal (fixed-string、regex ではない) 部分文字列。
stdout: JSON {results: [{path, pattern, exists, matches}]}、入力順に 1 件ずつ。
          exists  = path が通常ファイル
          matches = pattern 無しなら exists と同じ。pattern 有りなら exists かつ
                    その literal pattern がファイルの bytes に出現する
完了時は exit 0 (verdict は JSON から読む)。usage / parse error 時は exit 1。
fail-closed で、壊れた payload を「全 precondition pass」と黙って扱うことはない。
drift 判定 (exists=false / matches=false のいずれか) は build.js 側に残る。
"""

import json
import sys
from pathlib import Path


def verify_one(root, entry):
    """1 件の precondition entry について {path, pattern, exists, matches} を返す。

    非オブジェクトの entry、または読めないファイルの entry は、例外を投げず
    exists/matches を false に解決する (fail-closed)。
    """
    path = str(entry.get("path", "")) if isinstance(entry, dict) else ""
    raw_pattern = entry.get("pattern", "") if isinstance(entry, dict) else ""
    pattern = "" if raw_pattern is None else str(raw_pattern)
    exists = (root / path).is_file() if path else False
    if not pattern:
        matches = exists
    elif not exists:
        matches = False
    else:
        try:
            matches = pattern.encode("utf-8") in (root / path).read_bytes()
        except OSError:
            matches = False
    return {"path": path, "pattern": pattern, "exists": exists, "matches": matches}


def run(preconditions, root=Path(".")):
    """全 precondition を root に対して検証し、入力の順序と件数を保つ。"""
    return [verify_one(root, entry) for entry in preconditions]


def fail(message):
    print(message, file=sys.stderr)
    sys.exit(1)


def main():
    try:
        preconditions = json.loads(sys.stdin.read())
    except json.JSONDecodeError as exc:
        fail(f"Error: preconditions is not valid JSON: {exc}")
    if not isinstance(preconditions, list):
        fail("Error: preconditions must be a JSON array of {path, pattern?}")
    print(json.dumps({"results": run(preconditions)}))


if __name__ == "__main__":
    main()

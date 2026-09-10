/// <reference types="node" />
// Differential test for hooks/_lib/gh_filing.ts against hooks/_lib/gh_filing.py: for the same
// command line the two must extract the same filing kind, token list, title/body flag values,
// and body file path (contract: docs/decisions/0112-adopt-typescript-for-helper-scripts.md's
// Success Criteria differential-test requirement, same as hook-payload-parity.test.ts).
//
// Same PY_DRIVER shape as hook-payload-parity.test.ts:41, but one python3 spawn for the whole
// corpus rather than one per case, the way command-scan-parity.test.ts spawns once for its
// corpus (per this unit's contract).
//
// The corpus is every distinct gh issue create / gh pr create command-line shape
// hooks/pre-bash/tests/body_proofread_test.py and hooks/pre-bash/tests/issue_body_gate_test.py
// build to exercise body_proofread.py and issue_body_gate.py -- the two hooks that read a
// filing through gh_filing's find/flag/body_file, the viewpoint hooks/_lib/tests/gh-filing.test.ts
// (U-001) covers directly. Several of those tests call the same command-building helper
// (issue_body_gate_test.py's bug_issue_cmd) with a different body file's content but an
// identical command shape; parity depends on the shape command_scan tokenizes, not on the body
// file's content, so repeats of one shape are folded to a single corpus entry rather than
// enumerated per call site.
//
// hooks/_lib/gh_filing.py's retirement slice deletes this file along with it.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { body_file, find, flag, TITLE_FLAGS, BODY_FLAGS } from "../gh_filing.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOKS_LIB_DIR = join(HERE, "..");

/** One corpus command line, named for the behaviour-test scenario it is drawn from. */
interface CorpusCase {
  readonly name: string;
  readonly command: string;
}

const LINTED_BODY =
  "この機能はユーザーが設定を変更することができます。この説明は日本語判定の五十文字閾値を超えるための追加の文章です。";

const MULTILINE_BODY =
  "一行目は複数行の本文が正しく抽出されることを確認する文です。\n" +
  "これは、二行目、で、読点、が、多す、ぎます。\n" +
  "三行目は日本語判定の五十文字閾値を確実に超えるための追加の文章です。";

const ENGLISH_BODY =
  "This is an English issue body with enough content to verify that textlint does " +
  "not run on non-Japanese text. The structure review should still appear.";

// Every distinct command-line shape the two behaviour test files build. Command-building
// helpers those files reuse verbatim (issue_body_gate_test.py's bug_issue_cmd,
// body_proofread_test.py's heredoc_commit) contribute one entry per distinct call shape.
const CORPUS: readonly CorpusCase[] = [
  // body_proofread_test.py
  {
    name: "body_proofread T-006 issue create, inline body drawing findings",
    command: `gh issue create --title "test" --body "${LINTED_BODY}"`,
  },
  {
    name: "body_proofread T-020 issue create, body-file",
    command: 'gh issue create --title "test" --body-file /tmp/gh-filing-parity/issue/body.md',
  },
  {
    name: "body_proofread T-021 pr create, body-file",
    command: 'gh pr create --title "test" --body-file /tmp/gh-filing-parity/pr/body.md',
  },
  {
    name: "body_proofread T-023 issue create, quoted body-file path with a space",
    command: 'gh issue create --title "test" --body-file "/tmp/gh-filing-parity/with space/body.md"',
  },
  {
    name: "body_proofread T-022 issue create, relative body-file with no cd",
    command: 'gh issue create --title "test" --body-file body.md',
  },
  {
    name: "body_proofread T-028 cd then issue create, relative body-file",
    command: 'cd /tmp/gh-filing-parity/rel && gh issue create --title "test" --body-file body.md',
  },
  {
    name: "body_proofread T-007 issue create, inline body drawing no finding",
    command: 'gh issue create --title "test" --body "テストです。"',
  },
  {
    name: "body_proofread T-008 a non-gh command is out of scope",
    command: "git status",
  },
  {
    name: "body_proofread T-010 pr create, inline body drawing findings",
    command: `gh pr create --title "test" --body "${LINTED_BODY}"`,
  },
  {
    name: "body_proofread T-015 pr create, multiline inline body",
    command: `gh pr create --title "test" --body "${MULTILINE_BODY}"`,
  },
  {
    name: "body_proofread T-016 a heredoc commit is not a filing",
    command: 'git commit -m "$(cat <<\'EOF\'\nfix(hooks): 処理を行うことが出来ます\nEOF\n)"',
  },
  {
    name: "body_proofread T-025 a commit message file is not a filing",
    command: "git commit -F /tmp/gh-filing-parity/commit/body.md",
  },
  {
    name: "body_proofread T-026 issue create, short flag body-file (-F)",
    command: 'gh issue create --title "test" -F /tmp/gh-filing-parity/short/body.md',
  },
  {
    name: "body_proofread T-026 issue create, short flag body (-b)",
    command: `gh issue create --title "test" -b "${LINTED_BODY}"`,
  },
  {
    name: "body_proofread T-027 an unrelated heredoc ahead of the filing",
    command:
      "cat > /tmp/patch.py <<'PY'\n" +
      "これは、無関係、な、ファイル、の、中身、です。\nPY\n" +
      'gh issue create --title "test" --body-file /tmp/gh-filing-parity/heredoc/body.md',
  },
  {
    name: "body_proofread T-017 a commit -m message is not a filing",
    command: 'git commit -m "fix: これは、読点、が、多い、修正、です。"',
  },
  {
    name: "body_proofread T-013 issue create, no body",
    command: 'gh issue create --title "test"',
  },
  {
    name: "body_proofread T-014 issue create, English inline body",
    command: `gh issue create --title "test" --body "${ENGLISH_BODY}"`,
  },
  {
    name: "body_proofread T-029 a commit message naming a filing is not one",
    command:
      'git commit -m "fix: gh issue create の説明。これは、テスト、です、が、読点、が、多すぎ、ます。"',
  },
  {
    name: "body_proofread T-030 a heredoc commit body naming a filing is not one",
    command:
      "git commit -m \"$(cat <<'EOF'\n" +
      "fix: これは、テスト、です、が、読点、が、多すぎ、ます。\n\n" +
      "gh issue create --title x の行\nEOF\n)\"",
  },
  // issue_body_gate_test.py
  {
    name: "issue_body_gate T-005 gh issue list is not a create",
    command: "gh issue list",
  },
  {
    name: "issue_body_gate T-005 a commit -m mentioning a filing is not one",
    command: 'git commit -m "fix: gh issue create hook"',
  },
  {
    name: "issue_body_gate T-005 a multi-line commit -m mentioning a filing is not one",
    command:
      "git commit -m 'fix(hooks): stop a filing that skips the skeleton\n\n" +
      'gh issue create --title "[Bug] x" --body-file /nonexistent/body.md now denies\'',
  },
  {
    name: "issue_body_gate T-006 issue create, title with no type prefix",
    command:
      'gh issue create --title "Login fails for some users" ' +
      "--body-file /tmp/gh-filing-parity/no-prefix/body.md",
  },
  {
    name: "issue_body_gate T-007 issue create, inline body",
    command:
      'gh issue create --title "[Bug] Login fails for some users" ' +
      '--body "Login fails for some users."',
  },
  {
    name: "issue_body_gate bug_issue_cmd: cd then issue create, body-file",
    command:
      "cd /tmp/gh-filing-parity/bug && gh issue create " +
      '--title "[Bug] Login fails for some users" --body-file /tmp/gh-filing-parity/bug/body.md',
  },
  {
    name: "issue_body_gate T-013 cd, assignment on its own line, then issue create with $B",
    command:
      "cd /tmp/gh-filing-parity/split\n" +
      "B=/tmp/gh-filing-parity/split/body.md\n" +
      'gh issue create --title "[Bug] Login fails for some users" --body-file "$B"',
  },
  {
    name: "issue_body_gate T-014 issue create, unresolved $B and no cd",
    command: 'gh issue create --title "[Bug] Login fails" --body-file "$B"',
  },
  {
    name: "issue_body_gate T-015 cd then issue create with an unterminated quote",
    command:
      'cd /tmp/gh-filing-parity/bug && gh issue create --title "[Bug] Login fails ' +
      "--body-file /tmp/gh-filing-parity/bug/body.md",
  },
  {
    name: "issue_body_gate T-024 a heredoc commit body naming a filing is not one",
    command:
      "cat > /tmp/gh-filing-parity/msg.txt << 'EOF'\n" +
      "fix(hooks): 何かを直す\n\n" +
      "gh issue create --title x を本文で説明している行\n" +
      "EOF\n" +
      "git commit -F /tmp/gh-filing-parity/msg.txt",
  },
  {
    name: "issue_body_gate T-016 cd then issue create, a type with no skeleton",
    command:
      'cd /tmp/gh-filing-parity/spike && gh issue create --title "[Spike] 骨格を持たない型" ' +
      "--body-file /tmp/gh-filing-parity/spike/body.md",
  },
  {
    name: "issue_body_gate T-018 cd then issue create, short flag title (-t)",
    command:
      "cd /tmp/gh-filing-parity/bug && gh issue create -t \"[Bug] Login fails\" " +
      "--body-file /tmp/gh-filing-parity/bug/body.md",
  },
  {
    name: "issue_body_gate T-019 cd then issue create, short flag body-file (-F)",
    command:
      'cd /tmp/gh-filing-parity/bug && gh issue create --title "[Bug] Login fails" ' +
      "-F /tmp/gh-filing-parity/bug/body.md",
  },
  {
    name: "issue_body_gate T-020 two cds then issue create, relative body-file",
    command:
      "cd / && cd /tmp/gh-filing-parity/bug && gh issue create --title \"[Bug] Login fails\" " +
      "--body-file body.md",
  },
];

interface FilingResult {
  readonly kind: string;
  readonly tokens: readonly string[];
  readonly title: string | null;
  readonly body: string | null;
  readonly bodyFile: string | null;
}

interface CaseResult {
  readonly raised: boolean;
  readonly filing: FilingResult | null;
}

// One python3 spawn for the whole corpus (per the contract): reads the command list off stdin
// as a JSON array and hands back gh_filing.py's find/flag/body_file output per command, in the
// same {raised, filing} shape tsResultFor below produces so the two compare directly.
const PY_DRIVER = `
import json
import sys

sys.path.insert(0, sys.argv[1])
import gh_filing

commands = json.loads(sys.stdin.read())
results = []
for command in commands:
    try:
        filing = gh_filing.find(command)
    except Exception:
        results.append({"raised": True, "filing": None})
        continue
    if filing is None:
        results.append({"raised": False, "filing": None})
        continue
    resolved = gh_filing.body_file(filing)
    results.append({
        "raised": False,
        "filing": {
            "kind": filing.kind,
            "tokens": filing.tokens,
            "title": gh_filing.flag(filing, gh_filing.TITLE_FLAGS),
            "body": gh_filing.flag(filing, gh_filing.BODY_FLAGS),
            "bodyFile": str(resolved) if resolved is not None else None,
        },
    })
print(json.dumps(results))
`;

function runPython(commands: readonly string[]): CaseResult[] {
  const result = spawnSync("python3", ["-c", PY_DRIVER, HOOKS_LIB_DIR], {
    input: JSON.stringify(commands),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`python3 driver failed (exit ${result.status}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as CaseResult[];
}

function tsResultFor(command: string): CaseResult {
  let filing;
  try {
    filing = find(command);
  } catch {
    return { raised: true, filing: null };
  }
  if (filing === null) {
    return { raised: false, filing: null };
  }
  const resolved = body_file(filing);
  return {
    raised: false,
    filing: {
      kind: filing.kind,
      tokens: [...filing.tokens],
      title: flag(filing, TITLE_FLAGS),
      body: flag(filing, BODY_FLAGS),
      bodyFile: resolved,
    },
  };
}

test("T-295 every command line the behaviour tests use yields the same filing, flag values and body file from both implementations", () => {
  assert.ok(CORPUS.length > 0, "the corpus must not be empty");

  const commands = CORPUS.map((entry) => entry.command);
  const pyResults = runPython(commands);
  assert.equal(
    pyResults.length,
    commands.length,
    "the python3 driver must return one result per corpus command",
  );

  CORPUS.forEach((entry, index) => {
    const tsResult = tsResultFor(entry.command);
    const pyResult = pyResults[index];
    assert.equal(tsResult.raised, pyResult.raised, `${entry.name}: raised must agree`);
    assert.deepEqual(tsResult.filing, pyResult.filing, `${entry.name}: filing must agree`);
  });
});

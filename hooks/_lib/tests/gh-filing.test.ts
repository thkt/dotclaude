/// <reference types="node" />
// Unit tests for hooks/_lib/gh_filing.ts, the TypeScript side of hooks/_lib/gh_filing.py. No
// test exercises this module directly yet (hooks/pre-bash/body_proofread.ts and
// hooks/pre-bash/issue_body_gate.py cover it only through the Python original), so the command
// lines here are drawn from hooks/pre-bash/tests/body_proofread_test.py and
// hooks/pre-bash/tests/issue_body_gate_test.py's filing-construction inputs: a `gh issue create`
// / `gh pr create` carrying --title/-t, --body/-b, and --body-file/-F.
import assert from "node:assert/strict";
import test from "node:test";
import { BODY_FILE_FLAGS, BODY_FLAGS, body_file, find, flag, TITLE_FLAGS } from "../gh_filing.ts";

test("T-292 find returns the kind and the token list for an issue create and for a pr create, and null for a command that is neither", () => {
  const issueFiling = find('gh issue create --title "test" --body "hello"');
  assert.ok(issueFiling, "gh issue create must resolve to a filing");
  assert.equal(issueFiling.kind, "issue");
  assert.deepEqual(issueFiling.tokens.slice(0, 3), ["gh", "issue", "create"]);

  const prFiling = find('gh pr create --title "test" --body "hello"');
  assert.ok(prFiling, "gh pr create must resolve to a filing");
  assert.equal(prFiling.kind, "pr");
  assert.deepEqual(prFiling.tokens.slice(0, 3), ["gh", "pr", "create"]);

  assert.equal(
    find('git commit -m "gh issue create mentioned only in a commit message"'),
    null,
    "a command that runs neither gh issue create nor gh pr create must return null",
  );
});

test("T-293 flag returns the value for each of the long and short spellings the tables name, and null when the flag is absent", () => {
  const longFiling = find('gh issue create --title "Login fails" --body "hello world"');
  assert.ok(longFiling, "the long-flag filing must resolve");
  assert.equal(flag(longFiling, TITLE_FLAGS), "Login fails");
  assert.equal(flag(longFiling, BODY_FLAGS), "hello world");

  const shortFiling = find('gh issue create -t "Login fails" -b "hello world"');
  assert.ok(shortFiling, "the short-flag filing must resolve");
  assert.equal(flag(shortFiling, TITLE_FLAGS), "Login fails");
  assert.equal(flag(shortFiling, BODY_FLAGS), "hello world");

  assert.equal(
    flag(longFiling, BODY_FILE_FLAGS),
    null,
    "a flag absent from the filing's tokens must return null",
  );
});

test("T-294 body_file returns the path for a --body-file filing and null for a --body filing", () => {
  const fileFiling = find('gh issue create --title "Login fails" --body-file /tmp/body.md');
  assert.ok(fileFiling, "the --body-file filing must resolve");
  assert.equal(body_file(fileFiling), "/tmp/body.md");

  const inlineFiling = find('gh issue create --title "Login fails" --body "hello world"');
  assert.ok(inlineFiling, "the --body filing must resolve");
  assert.equal(
    body_file(inlineFiling),
    null,
    "a filing with no --body-file/-F flag must return null",
  );
});

/// <reference types="node" />
// Behavior tests for workflows/_lib/tests/_retirement.ts's pure scan core: offendersAmong walks
// a caller-supplied file list with a caller-supplied reader, so these tests drive it with a
// synthetic tree instead of this repository's real one. gate-retirement.test.ts and
// record-retirement.test.ts exercise the git-backed wrapper that a later unit adds on top of
// this core; T-120-T-122 here are the helper's own tests.
import assert from "node:assert/strict";
import test from "node:test";
import { offendersAmong } from "./_retirement.ts";

test(
  "T-120 a file whose path starts with a historical directory is not reported even when its " +
    "content names the retired path",
  () => {
    const retiredNeedle = "_lib/legacy-helper.py";
    const files = ["docs/decisions/DR-0100-example.md", "workflows/build/record.ts"];
    const contents: Record<string, string> = {
      "docs/decisions/DR-0100-example.md": `kept as history: ${retiredNeedle}`,
      "workflows/build/record.ts": `still calls ${retiredNeedle}`,
    };
    const read = (path: string): string => contents[path];
    const matches = (content: string): boolean => content.includes(retiredNeedle);

    const offenders = offendersAmong(files, read, matches);

    assert.deepEqual(
      offenders,
      ["workflows/build/record.ts"],
      "the docs/decisions/ file must be excluded and the live file must still be caught",
    );
  },
);

test(
  "T-121 a file the caller lists as an extra exclusion is not reported while the same " +
    "content under another path is reported",
  () => {
    const retiredNeedle = "record.py";
    const excluded = "docs/wiki/supply-list-single-source.md";
    const files = [excluded, "workflows/build/record.ts"];
    const contents: Record<string, string> = {
      [excluded]: `basis line quoting ${retiredNeedle}`,
      "workflows/build/record.ts": `invokes ${retiredNeedle}`,
    };
    const read = (path: string): string => contents[path];
    const matches = (content: string): boolean => content.includes(retiredNeedle);

    const offenders = offendersAmong(files, read, matches, [excluded]);

    assert.deepEqual(
      offenders,
      ["workflows/build/record.ts"],
      "the caller's extra exclusion must be skipped and the other matching path must still be caught",
    );
  },
);

test(
  "T-122 the offender list is the set of matching paths in tree order and an unreadable " +
    "file is skipped rather than aborting the scan",
  () => {
    const retiredNeedle = "retired-thing";
    const files = ["a/one.ts", "b/unreadable.ts", "c/two.ts", "d/no-match.ts"];
    const contents: Record<string, string> = {
      "a/one.ts": `names ${retiredNeedle}`,
      "c/two.ts": `also names ${retiredNeedle}`,
      "d/no-match.ts": "clean",
    };
    const read = (path: string): string => {
      if (path === "b/unreadable.ts") {
        throw new Error("EACCES: simulated unreadable file");
      }
      return contents[path];
    };
    const matches = (content: string): boolean => content.includes(retiredNeedle);

    const offenders = offendersAmong(files, read, matches);

    assert.deepEqual(
      offenders,
      ["a/one.ts", "c/two.ts"],
      "the unreadable file must be skipped without aborting the scan, and matches kept in tree order",
    );
  },
);

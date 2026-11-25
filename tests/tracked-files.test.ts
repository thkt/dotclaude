/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { offendersAmong } from "./_tracked-files.ts";

test(
  "a file whose path starts with a historical directory is not reported even when its " +
    "content names the retired path",
  () => {
    const needle = "_lib/legacy-helper.py";
    const live = ["workflows/implement/record.ts", "docs/notes/live.md"];
    for (const historical of [
      "docs/decisions/DR-0100-example.md",
      "docs/research/2026-09-24-original.md",
      "research/2026-09-24-original.md",
      ".claude/workspace/research/original.md",
    ]) {
      const contents: Record<string, string> = {
        [historical]: `kept as history: ${needle}`,
        [live[0]]: `still calls ${needle}`,
        [live[1]]: `still names ${needle}`,
      };
      const read = (path: string): string => contents[path];
      const matches = (content: string): boolean => content.includes(needle);

      const offenders = offendersAmong([historical, ...live], read, matches);

      assert.deepEqual(
        offenders,
        live,
        `${historical} must be excluded and both live files must still be caught`,
      );
    }
  },
);

test(
  "a file the caller lists as an extra exclusion is not reported while the same " +
    "content under another path is reported",
  () => {
    const needle = "_lib/legacy-tool.py";
    const excluded = "docs/notes/supply-list-single-source.md";
    const files = [excluded, "workflows/implement/record.ts"];
    const contents: Record<string, string> = {
      [excluded]: `basis line quoting ${needle}`,
      "workflows/implement/record.ts": `invokes ${needle}`,
    };
    const read = (path: string): string => contents[path];
    const matches = (content: string): boolean => content.includes(needle);

    const offenders = offendersAmong(files, read, matches, [excluded]);

    assert.deepEqual(
      offenders,
      ["workflows/implement/record.ts"],
      "the caller's extra exclusion must be skipped and the other matching path must still be caught",
    );
  },
);

test(
  "the offender list is the set of matching paths in tree order and an unreadable " +
    "file is skipped rather than aborting the scan",
  () => {
    const needle = "retired-thing";
    const files = ["a/one.ts", "b/unreadable.ts", "c/two.ts", "d/no-match.ts"];
    const contents: Record<string, string> = {
      "a/one.ts": `names ${needle}`,
      "c/two.ts": `also names ${needle}`,
      "d/no-match.ts": "clean",
    };
    const read = (path: string): string => {
      if (path === "b/unreadable.ts") {
        throw new Error("EACCES: simulated unreadable file");
      }
      return contents[path];
    };
    const matches = (content: string): boolean => content.includes(needle);

    const offenders = offendersAmong(files, read, matches);

    assert.deepEqual(
      offenders,
      ["a/one.ts", "c/two.ts"],
      "the unreadable file must be skipped without aborting the scan, and matches kept in tree order",
    );
  },
);

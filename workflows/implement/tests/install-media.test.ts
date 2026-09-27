/// <reference types="node" />
// Behavior tests for workflows/implement/install-media.ts: the host step that validates captured
// media and replaces the capture destination with it (the port of installMedia in
// ~/.agents/scripts/correction.ts and validateCaptureMedia in capture.ts).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "install-media.ts");
const PNG = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(16, 1)]);

const withRepo = (fn: (root: string) => void) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "install-media-")));
  try {
    spawnSync("git", ["init", "-q", join(root, "wt")]);
    mkdirSync(join(root, "out"));
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};
const install = (root: string, destination = "trial/evidence/generated") => {
  const result = spawnSync(
    process.execPath,
    [SCRIPT, join(root, "out"), join(root, "wt"), destination],
    { encoding: "utf8" },
  );
  return { status: result.status, out: JSON.parse(result.stdout || "{}") };
};

test("valid media replaces the destination's previous contents and is reported with size and sha256", () => {
  withRepo((root) => {
    const destination = join(root, "wt", "trial/evidence/generated");
    mkdirSync(destination, { recursive: true });
    writeFileSync(join(destination, "stale.png"), PNG);
    writeFileSync(join(root, "out", "list.png"), PNG);
    const { status, out } = install(root);
    assert.equal(status, 0);
    assert.equal(out.ok, true);
    assert.deepEqual(readdirSync(destination), ["list.png"]);
    assert.equal(out.files[0].name, "list.png");
    assert.equal(out.files[0].size, PNG.length);
    assert.match(out.files[0].sha256, /^[0-9a-f]{64}$/);
  });
});

test("an empty output, a wrong extension, a mismatched signature, or a symlink is rejected without touching the destination", () => {
  const cases: [string, (out: string) => void][] = [
    ["empty", () => {}],
    ["extension", (out) => writeFileSync(join(out, "notes.txt"), PNG)],
    ["signature", (out) => writeFileSync(join(out, "list.png"), Buffer.alloc(24, 7))],
    [
      "symlink",
      (out) => {
        writeFileSync(join(dirname(out), "real.png"), PNG);
        symlinkSync(join(dirname(out), "real.png"), join(out, "link.png"));
      },
    ],
  ];
  for (const [name, fill] of cases) {
    withRepo((root) => {
      const destination = join(root, "wt", "trial/evidence/generated");
      mkdirSync(destination, { recursive: true });
      writeFileSync(join(destination, "kept.png"), PNG);
      fill(join(root, "out"));
      const { status, out } = install(root);
      assert.equal(status, 1, name);
      assert.equal(out.ok, false, name);
      assert.deepEqual(readdirSync(destination), ["kept.png"], name);
    });
  }
});

test("a destination that git ignores is rejected, since the media would fall out of the reviewed tree", () => {
  withRepo((root) => {
    writeFileSync(join(root, "wt", ".gitignore"), "trial/evidence/\n");
    writeFileSync(join(root, "out", "list.png"), PNG);
    const { status, out } = install(root);
    assert.equal(status, 1);
    assert.equal(out.reason, "ignored");
    assert.ok(!existsSync(join(root, "wt", "trial/evidence/generated")));
  });
});

test("a destination outside the worktree or behind a symlinked parent is rejected", () => {
  withRepo((root) => {
    writeFileSync(join(root, "out", "list.png"), PNG);
    assert.equal(install(root, "../escape").out.ok, false);
    mkdirSync(join(root, "elsewhere"));
    symlinkSync(join(root, "elsewhere"), join(root, "wt", "trial"));
    const linked = install(root);
    assert.equal(linked.out.ok, false);
    assert.deepEqual(readdirSync(join(root, "elsewhere")), []);
  });
});

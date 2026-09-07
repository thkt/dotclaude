/// <reference types="node" />
// T-008: DR-0114 fixed the hooks bun shebang to an absolute Homebrew path (see
// hooks/_lib/shebang_scope.ts's SHEBANG docstring) because settings.json runs hooks on a
// truncated PATH -- the kernel resolves the interpreter straight from the shebang line, never
// through a PATH lookup. That fix is only real infrastructure if the interpreter actually sits
// at that path on the machine running the hook, so this checks the constant against the real
// filesystem rather than trusting the literal. darwin-only: DR-0114's path is a Homebrew-on-
// macOS convention (`/opt/homebrew/bin/bun`), and this plan does not cover a Linux host.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { SHEBANG } from "../shebang_scope.ts";

test(
  "T-008 on a darwin host the interpreter path named by the bun shebang constant exists on disk",
  {
    skip:
      process.platform !== "darwin" && `only applies on darwin, this host is ${process.platform}`,
  },
  () => {
    const interpreterPath = SHEBANG.replace(/^#!/, "");
    assert.ok(
      existsSync(interpreterPath),
      `${interpreterPath} (from SHEBANG) does not exist on this host`,
    );
  },
);

/// <reference types="node" />
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

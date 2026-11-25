/// <reference types="node" />
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function withEnv<T>(vars: Record<string, string | undefined>, body: () => T): T {
  const saved = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return body();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

export function installStub(root: string, name: string, script: string): string {
  const binDir = join(root, "bin");
  mkdirSync(binDir, { recursive: true });
  const stub = join(binDir, name);
  writeFileSync(stub, script);
  chmodSync(stub, 0o755);
  return binDir;
}

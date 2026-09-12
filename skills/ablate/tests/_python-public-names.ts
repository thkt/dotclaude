/// <reference types="node" />
// Shared by arms-parity.test.ts, dr-gate-parity.test.ts, verdict-parity.test.ts, and their
// harness_elements/enforcer_map/usage_counts siblings: reads a Python module's own top-level
// public names from its AST, without importing or executing it. Each of those tests spawns this
// once per module and compares the result against the matching .ts module's export names, as
// names rather than as a count.
//
// AST rather than import + dir(): a Python module's namespace can carry names its own text
// never declared -- a language flag such as `from __future__ import annotations`, or a name
// pulled in through a sibling import -- and dir() would report those as public too. Reading the
// source's own top-level Assign/AnnAssign/FunctionDef/ClassDef targets sidesteps that: a name
// reaches this comparison only when the module's text itself declares it, which is the "look at
// names, not values" contract (see the callers' headers for the concrete name each module's
// import pattern would otherwise leak).
//
// A top-level `class Foo(TypedDict):` is dropped rather than reported as a public name: it is
// Python's shape-only type declaration, the same role a TS `interface` plays, and a TS
// `interface` export carries no runtime value so it never appears in Object.keys() on the .ts
// side (harness_elements.ts's HarnessElement, usage_counts.ts's ElementUsage/UsageResult). Every
// other ClassDef still counts -- only a TypedDict base marks a class as type-only on the Python
// side.
import { spawnSync } from "node:child_process";
import { join } from "node:path";

// Reads a python module's own top-level bindings from its source text and prints the ones that
// do not start with "_", sorted. No import, no execution: a name this driver cannot produce
// comes from a missing or unparseable file, not from a sibling import failing at runtime.
const PY_DRIVER = `
import ast
import json
import sys

with open(sys.argv[1], encoding="utf-8") as f:
    tree = ast.parse(f.read(), filename=sys.argv[1])

def is_typed_dict(base):
    return (isinstance(base, ast.Name) and base.id == "TypedDict") or (
        isinstance(base, ast.Attribute) and base.attr == "TypedDict"
    )

names = []
for node in tree.body:
    if isinstance(node, ast.Assign):
        names += [t.id for t in node.targets if isinstance(t, ast.Name)]
    elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
        names.append(node.target.id)
    elif isinstance(node, ast.ClassDef):
        if not any(is_typed_dict(base) for base in node.bases):
            names.append(node.name)
    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        names.append(node.name)

print(json.dumps(sorted(n for n in names if not n.startswith("_"))))
`;

/** The public top-level names `${module}.py` declares under `scriptsDir`, read via a single
 * python3 spawn. */
export function pythonPublicNames(scriptsDir: string, module: string): string[] {
  const result = spawnSync("python3", ["-c", PY_DRIVER, join(scriptsDir, `${module}.py`)], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`python3 driver failed (exit ${result.status}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as string[];
}

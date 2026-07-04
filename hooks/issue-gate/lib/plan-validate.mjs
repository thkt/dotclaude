// Canonical plan-readiness validation. plan-gate.mjs is the standalone script wrapper;
// workflows/build.js keeps a marker-wrapped hand-maintained copy of this logic (it cannot
// import across the workflow runtime). hooks/issue-gate/tests/contract-build-port.test.mjs
// extracts that copy and asserts it returns identical errors to this function on every shared
// fixture, so the DRY debt has a single guard. Keep this body and the build.js copy in lockstep.
//
// Missing array fields are treated as empty so arbitrary stdin cannot crash the gate; content
// and structural defects surface as errors, not exceptions.
export const validate = (plan) => {
  const errors = [];
  const units = Array.isArray(plan.units) ? plan.units : [];
  if (!units.length) errors.push("units is empty. Define at least one implementation unit");
  if (!String(plan.test_command || "").trim()) errors.push("test_command is empty");

  const ids = new Set(units.map((u) => u.id));
  if (ids.size !== units.length) errors.push("duplicate unit ids");

  const testIds = new Set();
  for (const u of units) {
    const tests = Array.isArray(u.tests) ? u.tests : [];
    const files = Array.isArray(u.files) ? u.files : [];
    const dependsOn = Array.isArray(u.depends_on) ? u.depends_on : [];
    if (!tests.length) errors.push(`${u.id} has no test scenario`);
    if (!files.length) errors.push(`${u.id} has no target files`);
    if (!String(u.goal || "").trim()) errors.push(`${u.id} has an empty goal`);
    if (!String(u.contract || "").trim()) errors.push(`${u.id} has an empty contract`);
    for (const t of tests) {
      if (testIds.has(t.id)) errors.push(`duplicate test id ${t.id}`);
      testIds.add(t.id);
      for (const field of ["name", "given", "when", "then"]) {
        if (!String(t[field] || "").trim()) errors.push(`${t.id} has an empty ${field}`);
      }
    }
    for (const d of dependsOn) {
      if (!ids.has(d)) errors.push(`${u.id}'s depends_on ${d} points to a nonexistent unit`);
    }
  }

  // Cycle detection (DFS)
  const state = new Map();
  const visit = (id, path) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      errors.push(`depends_on cycle: ${[...path, id].join(" -> ")}`);
      return;
    }
    state.set(id, "visiting");
    const u = units.find((x) => x.id === id);
    for (const d of u && Array.isArray(u.depends_on) ? u.depends_on : []) visit(d, [...path, id]);
    state.set(id, "done");
  };
  for (const u of units) visit(u.id, []);

  return errors;
};

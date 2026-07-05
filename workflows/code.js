export const meta = {
  name: "code",
  description:
    'TDD workflow that takes a structured plan (units / test_command) and runs Red -> Green per unit under script enforcement. An unconfirmed Red (tests passing from the start) is recorded as an anomaly, and at the end an independent agent verifies the full suite + lint + type-check. Writing tests after the fact and skipping Red cannot happen structurally. Callable standalone or nested from build via workflow("code").',
  whenToUse:
    "Headless TDD implementation. args is {plan, repo, model}; plan is a structured plan with units / test_command (as produced by the think skill or build's planning). model (optional) propagates only to the Red / Green implementation agents.",
  phases: [{ title: "Implement" }, { title: "Verify" }],
};

// RGRC at the main loop's discretion can degrade: tests written in bulk afterwards,
// Red confirmation skipped. This workflow has the script's loop own
// the per-unit Red -> Green, receiving the Red confirmation via schema and recording
// it. Green's self-report is not trusted: an independent agent uninvolved in the
// implementation re-runs the full suite at the end (reward-hack countermeasure).

// args may arrive as an object or, if a caller stringifies it, as a JSON string.
// Normalize once. Keep the object branch: nested workflow("code", {plan}) arrives as an object.
const input = (() => {
  if (typeof args === "object" && args) return args;
  if (typeof args !== "string") return {};
  const s = args.trim();
  if (s.startsWith("{")) {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // malformed JSON: fall through and fail-close as no-plan
    }
  }
  return {};
})();
const plan = input.plan;
if (!plan || !Array.isArray(plan.units) || !plan.units.length) {
  return {
    stopped: "no-plan",
    why: "Pass a structured plan (units required) as args.plan.",
  };
}
const repo = typeof input.repo === "string" ? input.repo : "";
const anchor = (p) =>
  repo
    ? `Run every git, file, and build command from the repository at ${repo} (begin each shell command with \`cd ${repo} && \`).\n\n${p}`
    : p;

const RED_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["red_confirmed", "test_files", "notes"],
  properties: {
    red_confirmed: {
      type: "boolean",
      description: "true when you ran the tests you wrote and confirmed they fail as expected",
    },
    test_files: { type: "array", items: { type: "string" } },
    notes: {
      type: "string",
      description: "when red_confirmed is false, the reason (e.g. the behavior already exists)",
    },
  },
};

const GREEN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["green", "notes"],
  properties: {
    green: {
      type: "boolean",
      description: "true when all of the unit's tests pass",
    },
    notes: { type: "string" },
  },
};

const VERIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tests_pass", "gates_pass", "output_tail"],
  properties: {
    tests_pass: { type: "boolean" },
    gates_pass: {
      type: "boolean",
      description: "true when lint / type-check pass",
    },
    output_tail: {
      type: "string",
      description: "on failure, the tail of the failing output",
    },
  },
};

// Order by dependency (already validated upstream, but fail-close on a malformed
// plan from a standalone call).
const units = [];
const placed = new Set();
let progressed = true;
while (progressed && units.length < plan.units.length) {
  progressed = false;
  for (const u of plan.units) {
    if (placed.has(u.id)) continue;
    if ((u.depends_on || []).every((d) => placed.has(d))) {
      units.push(u);
      placed.add(u.id);
      progressed = true;
    }
  }
}
if (units.length < plan.units.length) {
  const stuck = plan.units.filter((u) => !placed.has(u.id)).map((u) => u.id);
  return {
    stopped: "invalid-plan",
    why: `unresolvable depends_on for units: ${stuck.join(", ")}`,
  };
}

const testCmd = plan.test_command || "";
const completed = [];
const anomalies = [];

// ---- Implement: Red -> Green per unit (serial; the working tree is shared) ----
phase("Implement");
for (const unit of units) {
  const ctx =
    `Unit ${unit.id}'s goal is "${unit.goal}". The target files are ${JSON.stringify(unit.files)}.\n` +
    `The contract is ${unit.contract}. The test scenarios are ${JSON.stringify(unit.tests)}.\n` +
    `The test command is ${testCmd}.\n` +
    (completed.length ? `The units already implemented are ${completed.join(", ")}.\n` : "");

  // Red: write tests and confirm failure by running them. Write no implementation.
  let red = await agent(
    anchor(
      `TDD Red step. ${ctx}` +
        `Write each test scenario (T-NNN) as a failing test. Use the scenario's name verbatim as the test name. ` +
        `Write no implementation code whatsoever. Run the tests and confirm they fail as expected, then report. ` +
        `If the tests do not fail, do not implement; write the reason in notes.`,
    ),
    {
      label: `red:${unit.id}`,
      phase: `Unit ${unit.id}`,
      agentType: "general-purpose",
      schema: RED_SCHEMA,
      ...(input.model ? { model: input.model } : {}),
    },
  );
  if (red && !red.red_confirmed) {
    // Red unconfirmed = either the behavior already exists or the test is vacuous.
    // Scrutinize exactly once.
    red = await agent(
      anchor(
        `TDD Red step retry. ${ctx}` +
          `Last time the tests did not fail. The reason was ${red.notes}.\n` +
          `Scrutinize whether the tests really verify the target behavior (assertions are not empty, the target code is invoked). ` +
          `If the behavior is unimplemented they should fail. If after scrutiny the tests still pass, judge the behavior as already implemented and keep red_confirmed=false with the reason in notes.`,
      ),
      {
        label: `red2:${unit.id}`,
        phase: `Unit ${unit.id}`,
        agentType: "general-purpose",
        schema: RED_SCHEMA,
        ...(input.model ? { model: input.model } : {}),
      },
    );
  }
  if (!red) return { stopped: "red-failed", unit: unit.id, completed, anomalies };
  if (!red.red_confirmed) {
    anomalies.push({ unit: unit.id, kind: "no-red", notes: red.notes });
    log(`${unit.id}: Red unconfirmed (${red.notes}). Skipping the implement step.`);
    completed.push(unit.id);
    continue;
  }

  // Green: implement until the tests pass, then refactor. Do not modify the tests.
  let green = await agent(
    anchor(
      `TDD Green step. ${ctx}` +
        `Write the minimal implementation that makes the failing tests in ${JSON.stringify(red.test_files)} pass. ` +
        `Changes that weaken / skip / delete test assertions are forbidden (if the test structure needs fixing, write it in notes and return green=false). ` +
        `After passing, refactor while keeping the tests green. Re-run the unit's tests and report.`,
    ),
    {
      label: `green:${unit.id}`,
      phase: `Unit ${unit.id}`,
      agentType: "general-purpose",
      schema: GREEN_SCHEMA,
      ...(input.model ? { model: input.model } : {}),
    },
  );
  if (green && !green.green) {
    green = await agent(
      anchor(
        `TDD Green step retry. ${ctx}` +
          `Last time the tests did not pass. The reason was ${green.notes}.\nIdentify the cause, fix the implementation, and make the unit's tests pass. Weakening tests is forbidden.`,
      ),
      {
        label: `green2:${unit.id}`,
        phase: `Unit ${unit.id}`,
        agentType: "general-purpose",
        schema: GREEN_SCHEMA,
        ...(input.model ? { model: input.model } : {}),
      },
    );
  }
  if (!green || !green.green) {
    return {
      stopped: "unit-failed",
      unit: unit.id,
      why: (green && green.notes) || "the green agent returned no result",
      completed,
      anomalies,
    };
  }
  completed.push(unit.id);
  log(`${unit.id}: Red -> Green done (${completed.length}/${units.length}).`);
}

// ---- Verify: an independent agent uninvolved in the implementation re-runs everything ----
phase("Verify");
const verify = (await agent(
  anchor(
    `Verification stage. You were not involved in the implementation. Run the full test suite (${testCmd}) and the project's lint / type-check gates, and report the results as they are. Do not fix anything.`,
  ),
  {
    label: "verify",
    phase: "Verify",
    agentType: "general-purpose",
    schema: VERIFY_SCHEMA,
  },
)) || {
  tests_pass: false,
  gates_pass: false,
  output_tail: "the verify agent returned no result",
};

log(
  `code: ${completed.length}/${units.length} unit(s) done, ${anomalies.length} anomaly(ies), verify tests=${verify.tests_pass} gates=${verify.gates_pass}.`,
);

return {
  completed,
  anomalies,
  tests_pass: verify.tests_pass,
  gates_pass: verify.gates_pass,
  verify_output: verify.output_tail,
};

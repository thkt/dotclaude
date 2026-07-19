export const meta = {
  name: "code",
  description:
    'TDD workflow that takes a structured plan (units / test_command) and implements per unit under script enforcement. A unit with test scenarios runs Red -> Green; a unit with no tests (docs / config, no verifiable behavior) runs a single direct-implementation step, so whether TDD applies is selected in the plan, not decided at runtime. An unconfirmed Red is recorded as an anomaly, and at the end an independent agent verifies the full suite + lint + type-check. Callable standalone or nested from build via workflow("code").',
  whenToUse:
    "Headless plan implementation. args is {plan, repo, model}; plan is a structured plan with units / test_command (as produced by the think skill). model (optional) propagates only to the implementation agents (defaults to opus). The implementation agents run at effort xhigh.",
  phases: [{ title: "Implement" }, { title: "Verify" }],
};

// args may arrive as an object or a stringified JSON; normalize once. Nested
// workflow("code", {plan}) arrives as an object.
const parseArgs = () => {
  if (typeof args === "object" && args) return args;
  if (typeof args !== "string") return {};
  const s = args.trim();
  if (s.startsWith("{")) {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // malformed JSON falls through to the no-plan fail-close
    }
  }
  return {};
};
const input = parseArgs();
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

// The plan lists units in implementation order; run them as listed.
const units = plan.units;

const testCmd = plan.test_command || "";
const completed = [];
const anomalies = [];
// Shared by every implementation agent so a model/effort change lands once.
const implementOpts = { model: input.model || "opus", effort: "xhigh" };

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

// ---- Implement: per unit, serial (the working tree is shared) ----
// A unit with tests runs Red -> Green; one with no tests runs a single direct step.
// The plan selects which; no TDD-or-not discretion exists at runtime.
phase("Implement");
for (const unit of units) {
  const tests = Array.isArray(unit.tests) ? unit.tests : [];
  const ctx =
    `Unit ${unit.id}'s goal is "${unit.goal}". The target files are ${JSON.stringify(unit.files)}.\n` +
    `The contract is ${unit.contract}. The test scenarios are ${JSON.stringify(tests)}.\n` +
    `The test command is ${testCmd}.\n` +
    `When writing framework / library API code, follow the pinned version's official docs rather than memory. Read docs with the WebFetch tool, not via shell. If unreachable, mark that API usage unverified in a code comment and keep implementing.\n` +
    (completed.length ? `The units already implemented are ${completed.join(", ")}.\n` : "");

  // No tests is the plan's selection (docs / config). Implement directly and keep
  // the existing suite green.
  if (!tests.length) {
    let impl = await agent(
      anchor(
        `Direct implementation step. ${ctx}` +
          `Implement per the contract; write no new tests. Keep the existing test suite green (${testCmd}); weakening / skipping / deleting existing tests is forbidden. ` +
          `Run the suite and report green.`,
      ),
      {
        label: `impl:${unit.id}`,
        phase: `Unit ${unit.id}`,
        agentType: "general-purpose",
        schema: GREEN_SCHEMA,
        ...implementOpts,
      },
    );
    if (impl && !impl.green) {
      impl = await agent(
        anchor(
          `Direct implementation retry. ${ctx}` +
            `Last time the suite did not pass. The reason was ${impl.notes}.\nIdentify the cause, fix the implementation, and make the suite pass. Weakening tests is forbidden.`,
        ),
        {
          label: `impl2:${unit.id}`,
          phase: `Unit ${unit.id}`,
          agentType: "general-purpose",
          schema: GREEN_SCHEMA,
          ...implementOpts,
        },
      );
    }
    if (!impl || !impl.green) {
      return {
        stopped: "unit-failed",
        unit: unit.id,
        why: (impl && impl.notes) || "the implement agent returned no result",
        completed,
        anomalies,
      };
    }
    completed.push(unit.id);
    log(`${unit.id}: direct implementation done (${completed.length}/${units.length}).`);
    continue;
  }

  let red = await agent(
    anchor(
      `TDD Red step. ${ctx}` +
        `Write each test scenario (T-NNN) as a failing test. Use the scenario's name verbatim as the test name. ` +
        `Write no implementation code whatsoever. Run the tests and confirm each fails for the intended reason, then report. ` +
        `If the tests do not fail, do not implement; write the reason in notes.`,
    ),
    {
      label: `red:${unit.id}`,
      phase: `Unit ${unit.id}`,
      agentType: "general-purpose",
      schema: RED_SCHEMA,
      ...implementOpts,
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
          `If after scrutiny the tests still pass, judge the behavior as already implemented and keep red_confirmed=false with the reason in notes.`,
      ),
      {
        label: `red2:${unit.id}`,
        phase: `Unit ${unit.id}`,
        agentType: "general-purpose",
        schema: RED_SCHEMA,
        ...implementOpts,
      },
    );
  }
  if (!red)
    return {
      stopped: "red-failed",
      unit: unit.id,
      why: "the red agent returned no result",
      completed,
      anomalies,
    };
  if (!red.red_confirmed) {
    anomalies.push({ unit: unit.id, kind: "no-red", notes: red.notes });
    log(`${unit.id}: Red unconfirmed (${red.notes}). Skipping the implement step.`);
    completed.push(unit.id);
    continue;
  }

  let green = await agent(
    anchor(
      `TDD Green step. ${ctx}` +
        `Write the minimal implementation that makes the failing tests in ${JSON.stringify(red.test_files)} pass. ` +
        `Make one test pass at a time; never bulk-implement against all tests at once. ` +
        `Changes that weaken / skip / delete test assertions are forbidden. If the test structure needs fixing, write it in notes and return green=false. ` +
        `After passing, refactor while keeping the tests green. Re-run the unit's tests and report.`,
    ),
    {
      label: `green:${unit.id}`,
      phase: `Unit ${unit.id}`,
      agentType: "general-purpose",
      schema: GREEN_SCHEMA,
      ...implementOpts,
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
        ...implementOpts,
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

// ---- Verify: an independent agent uninvolved in the implementation re-runs everything ----
phase("Verify");
const verify = (await agent(
  anchor(
    `Verification stage. Run the full test suite (${testCmd}) and the project's lint / type-check gates, and report the results as they are. Fix nothing.`,
  ),
  {
    label: "verify",
    phase: "Verify",
    agentType: "general-purpose",
    schema: VERIFY_SCHEMA,
    model: "sonnet",
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

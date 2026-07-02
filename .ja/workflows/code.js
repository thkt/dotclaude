export const meta = {
  name: "code",
  description:
    'think workflow の構造化 plan を受け取り、unit ごとに Red -> Green を script 強制で回す TDD workflow。Red 未確認 (テストが最初から通る) は anomaly として記録され、最後に独立 agent が全 suite + lint + type-check を検証する。テスト後書きと Red 省略が構造的に起きない。単体でも、build から workflow("code") 経由の入れ子でも呼べる。',
  whenToUse:
    "headless に TDD 実装を回したいとき。args は {plan, repo, model}。plan は think workflow の返り値の plan (units / test_command を持つ)。model (任意) は Red / Green 実装 agent にのみ伝播する。",
  phases: [{ title: "Implement" }, { title: "Verify" }],
};

// main loop 裁量の RGRC は「テストをまとめて後書き」「Red 確認を飛ばす」という省略が
// 起きうる。この workflow は unit 単位の Red -> Green を script の loop が所有し、
// Red の確認結果を schema で受け取って記録する。Green の自己申告は信用せず、最後に実装に
// 関与していない独立 agent が全 suite を再実行する (reward hack 対策)。

// args は object で届くことも、caller が stringify すると JSON 文字列で届くこともある。
// 一度だけ正規化する。nested の workflow("code", {plan}) は object で届くのでその分岐を残す。
const input = (() => {
  if (typeof args === "object" && args) return args;
  if (typeof args !== "string") return {};
  const s = args.trim();
  if (s.startsWith("{")) {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // malformed JSON: plan なしとして fail-close
    }
  }
  return {};
})();
const plan = input.plan;
if (!plan || !Array.isArray(plan.units) || !plan.units.length) {
  return { stopped: "no-plan", why: "args.plan に think workflow の plan (units 必須) を渡す。" };
}
const repo = typeof input.repo === "string" ? input.repo : "";
const anchor = (p) =>
  repo
    ? `git / ファイル / ビルドのコマンドはすべて ${repo} の repository から実行する (各シェルコマンドを \`cd ${repo} && \` で始める)。\n\n${p}`
    : p;

const RED_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["red_confirmed", "test_files", "notes"],
  properties: {
    red_confirmed: {
      type: "boolean",
      description: "書いたテストを実行し、期待どおり fail することを確認できたら true",
    },
    test_files: { type: "array", items: { type: "string" } },
    notes: {
      type: "string",
      description: "red_confirmed が false の場合はその理由 (既に振る舞いが存在する等)",
    },
  },
};

const GREEN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["green", "notes"],
  properties: {
    green: { type: "boolean", description: "unit のテストが全て pass したら true" },
    notes: { type: "string" },
  },
};

const VERIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tests_pass", "gates_pass", "output_tail"],
  properties: {
    tests_pass: { type: "boolean" },
    gates_pass: { type: "boolean", description: "lint / type-check が pass したら true" },
    output_tail: { type: "string", description: "失敗時は失敗箇所の出力末尾" },
  },
};

// 依存順に整列する (think の validate 済みだが、単体呼び出しの malformed plan に fail-close)。
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
  return { stopped: "invalid-plan", why: `depends_on を解決できない unit: ${stuck.join(", ")}` };
}

const testCmd = plan.test_command || "";
const completed = [];
const anomalies = [];

// ---- Implement: unit ごとに Red -> Green (working tree を共有するため直列) ----
phase("Implement");
for (const unit of units) {
  const ctx =
    `Unit ${unit.id}: ${unit.goal}\n対象ファイル: ${JSON.stringify(unit.files)}\n` +
    `Contract: ${unit.contract}\nTest scenarios: ${JSON.stringify(unit.tests)}\n` +
    `テスト実行: ${testCmd}\n` +
    (completed.length ? `実装済み unit: ${completed.join(", ")}\n` : "");

  // Red: テストを書き、fail を実行で確認する。実装は書かない。
  let red = await agent(
    anchor(
      `TDD の Red step。${ctx}` +
        `各 test scenario (T-NNN) を failing test として書く。テスト名は scenario の name をそのまま使う。` +
        `実装コードは一切書かない。テストを実行し、期待どおり fail することを確認して報告する。` +
        `テストが fail しない場合は実装せず、その理由を notes に書く。`,
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
    // Red が確認できない = 振る舞いが既に存在するか、テストが空回りしている。1 回だけ精査させる。
    red = await agent(
      anchor(
        `TDD の Red step 再試行。${ctx}` +
          `前回テストが fail しなかった: ${red.notes}\n` +
          `テストが対象の振る舞いを本当に検証しているか精査する (assertion が空でないか、対象コードを呼んでいるか)。` +
          `振る舞いが未実装なら fail するはずである。精査後もテストが pass するなら、振る舞いは実装済みと judged し red_confirmed=false のまま理由を notes に書く。`,
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
    log(`${unit.id}: Red 未確認 (${red.notes})。実装 step を skip して次の unit へ。`);
    completed.push(unit.id);
    continue;
  }

  // Green: テストが pass するまで実装し、その後 refactor する。テストは変更しない。
  let green = await agent(
    anchor(
      `TDD の Green step。${ctx}` +
        `テストファイル ${JSON.stringify(red.test_files)} の failing test を pass させる最小の実装を書く。` +
        `テストの assertion を弱める・skip する・削除する変更は禁止 (テスト構造の修正が必要なら notes に書いて green=false で返す)。` +
        `pass 後、テストを green に保ったまま refactor する。unit のテストを再実行して報告する。`,
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
        `TDD の Green step 再試行。${ctx}` +
          `前回 pass しなかった: ${green.notes}\n原因を特定して実装を修正し、unit のテストを pass させる。テストの弱体化は禁止。`,
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
      why: (green && green.notes) || "green agent が結果を返さなかった",
      completed,
      anomalies,
    };
  }
  completed.push(unit.id);
  log(`${unit.id}: Red -> Green 完了 (${completed.length}/${units.length})。`);
}

// ---- Verify: 実装に関与していない独立 agent が全 suite + gate を再実行する ----
phase("Verify");
const verify = (await agent(
  anchor(
    `検証 stage。実装には関与していない。全テスト suite (${testCmd}) とプロジェクトの lint / type-check gate を実行し、結果をそのまま報告する。修正はしない。`,
  ),
  { label: "verify", phase: "Verify", agentType: "general-purpose", schema: VERIFY_SCHEMA },
)) || { tests_pass: false, gates_pass: false, output_tail: "verify agent が結果を返さなかった" };

log(
  `code: ${completed.length}/${units.length} unit 完了、anomaly ${anomalies.length} 件、verify tests=${verify.tests_pass} gates=${verify.gates_pass}。`,
);

return {
  completed,
  anomalies,
  tests_pass: verify.tests_pass,
  gates_pass: verify.gates_pass,
  verify_output: verify.output_tail,
};

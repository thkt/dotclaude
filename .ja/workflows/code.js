export const meta = {
  name: "code",
  description:
    '構造化 plan (units / test_command) を受け取り、unit ごとに script 制御で実装する TDD workflow。test scenario を持つ unit は Red → Green で実装し、tests が空の unit (docs / 設定など検証可能な振る舞いが無いもの) は直接実装 1 段で扱う。TDD の要否は runtime でなく plan が選択する。未確認の Red は anomaly として記録し、最後に実装へ関与していない独立 agent が全 suite + lint + type-check を検証する。単独でも build からの workflow("code") でも呼べる。',
  whenToUse:
    "headless の plan 実装。args は {plan, repo, model}。plan は units / test_command を持つ構造化 plan (think skill が生成する形)。model (任意) は実装 agent にのみ伝播する (default は fable)。実装 agent は effort xhigh で走る。",
  phases: [{ title: "Implement" }, { title: "Verify" }],
};

// args は object でも文字列化 JSON でも届くので 1 回だけ正規化する。入れ子の
// workflow("code", {plan}) は object で届く。
const parseArgs = () => {
  if (typeof args === "object" && args) return args;
  if (typeof args !== "string") return {};
  const s = args.trim();
  if (s.startsWith("{")) {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // 壊れた JSON は no-plan の fail-close に落とす
    }
  }
  return {};
};

const input = parseArgs();
const plan = input.plan;

if (!plan || !Array.isArray(plan.units) || !plan.units.length) {
  return {
    stopped: "no-plan",
    why: "構造化 plan (units 必須) を args.plan に渡す。",
  };
}

const repo = typeof input.repo === "string" ? input.repo : "";
const anchor = (p) =>
  repo
    ? `すべての git / ファイル / ビルドコマンドを ${repo} のリポジトリから実行する (各シェルコマンドを \`cd ${repo} && \` で始める)。\n\n${p}`
    : p;

// plan の units は実装順に並んでいる。並び順のまま実行する。
const units = plan.units;
const testCmd = plan.test_command || "";
const completed = [];
const anomalies = [];
// unit 途中終了の返り値は 3 サイト共通の shape。completed / anomalies を閉じ込め、部分進捗を
// 呼び出し元へそのまま渡す
const stopUnit = (stopped, unit, why) => ({ stopped, unit: unit.id, why, completed, anomalies });
// 全実装 agent で共有し、model / effort の変更を 1 箇所にする。
const implementOpts = { model: input.model || "fable", effort: "xhigh" };

const RED_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["red_confirmed", "test_files", "notes"],
  properties: {
    red_confirmed: {
      type: "boolean",
      description: "書いたテストを実行し、期待どおり失敗することを確認できたとき true",
    },
    test_files: { type: "array", items: { type: "string" } },
    notes: {
      type: "string",
      description: "red_confirmed が false のとき、その理由 (例: 振る舞いが既に存在する)",
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
      description: "unit のテストがすべて pass したとき true",
    },
    notes: { type: "string" },
  },
};

// ---- Implement: unit ごとに直列で実装 (working tree を共有するため) ----
// tests を持つ unit は Red → Green、空の unit は直接実装 1 段。選択は plan が持ち、
// runtime に TDD 要否の裁量は無い。
phase("Implement");

for (const unit of units) {
  const tests = Array.isArray(unit.tests) ? unit.tests : [];
  const ctx =
    `Unit ${unit.id} の goal は「${unit.goal}」。対象ファイルは ${JSON.stringify(unit.files)}。\n` +
    `contract は ${unit.contract}。test scenario は ${JSON.stringify(tests)}。\n` +
    `テストコマンドは ${testCmd}。\n` +
    `フレームワーク / ライブラリの API を書くときは、記憶でなく pinned version の公式 docs に従う。docs は WebFetch で読み、シェル経由では取得しない。読めなければその API 使用を未確認としてコード内コメントに残し、実装は続ける。\n` +
    (completed.length ? `実装済みの unit は ${completed.join(", ")}。\n` : "");

  // tests 無しは plan の選択 (docs / 設定)。直接実装して既存 suite を green に保つ。
  if (!tests.length) {
    let impl = await agent(
      anchor(
        `直接実装 step。${ctx}` +
          `contract に従って実装する。新しいテストは書かない。既存のテスト suite (${testCmd}) を green に保つ。既存テストの弱体化 / skip / 削除は禁止。` +
          `suite を実行して green を報告する。`,
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
          `直接実装 retry。${ctx}` +
            `前回 suite が pass しなかった。理由は ${impl.notes}。\n原因を特定して実装を直し、suite を pass させる。テストの弱体化は禁止。`,
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
      return stopUnit(
        "unit-failed",
        unit,
        (impl && impl.notes) || "implement agent が結果を返さなかった",
      );
    }

    completed.push(unit.id);

    log(`${unit.id}: 直接実装 done (${completed.length}/${units.length})。`);

    continue;
  }

  let red = await agent(
    anchor(
      `TDD Red step。${ctx}` +
        `各 test scenario (T-NNN) を失敗するテストとして書く。scenario の name をテスト名として逐語で使う。` +
        `実装コードは一切書かない。テストを実行し、それぞれが意図した理由で失敗することを確認して報告する。` +
        `テストが失敗しない場合は実装せず、理由を notes に書く。`,
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
    // Red 未確認 = 振る舞いが既に存在するか、テストが空振りしている。1 回だけ精査する。
    red = await agent(
      anchor(
        `TDD Red step retry。${ctx}` +
          `前回テストが失敗しなかった。理由は ${red.notes}。\n` +
          `assertion が空でないか、対象コードが呼ばれているかを精査し、テストが対象の振る舞いを本当に検証しているか確かめる。` +
          `精査後もテストが pass するなら、振る舞いは実装済みと判断して red_confirmed=false のまま理由を notes に書く。`,
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

  if (!red) return stopUnit("red-failed", unit, "red agent が結果を返さなかった");

  if (!red.red_confirmed) {
    anomalies.push({ unit: unit.id, kind: "no-red", notes: red.notes });
    log(`${unit.id}: Red 未確認 (${red.notes})。implement step を skip する。`);
    completed.push(unit.id);
    continue;
  }

  let green = await agent(
    anchor(
      `TDD Green step。${ctx}` +
        `${JSON.stringify(red.test_files)} の失敗しているテストを pass させる最小の実装を書く。` +
        `テストを 1 つずつ pass させ、全テストに対してまとめて実装しない。` +
        `テストの assertion を弱める / skip する / 削除する変更は禁止。テスト構造の修正が必要なら notes に書いて green=false を返す。` +
        `pass 後、テストを green に保ったままリファクタする。unit のテストを再実行して報告する。`,
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
        `TDD Green step retry。${ctx}` +
          `前回テストが pass しなかった。理由は ${green.notes}。\n原因を特定して実装を直し、unit のテストを pass させる。テストの弱体化は禁止。`,
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
    return stopUnit(
      "unit-failed",
      unit,
      (green && green.notes) || "green agent が結果を返さなかった",
    );
  }
  completed.push(unit.id);
  log(`${unit.id}: Red → Green done (${completed.length}/${units.length})。`);
}

const VERIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tests_pass", "gates_pass", "output_tail"],
  properties: {
    tests_pass: { type: "boolean" },
    gates_pass: {
      type: "boolean",
      description: "lint / type-check が pass したとき true",
    },
    output_tail: {
      type: "string",
      description: "失敗時、失敗出力の末尾",
    },
  },
};

// ---- Verify: 実装に関与していない独立 agent が全体を再実行する ----
phase("Verify");

const verify = (await agent(
  anchor(
    `検証 stage。全テスト suite (${testCmd}) とプロジェクトの lint / type-check gate を実行し、結果をそのまま報告する。何も修正しない。`,
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
  output_tail: "verify agent が結果を返さなかった",
};

log(
  `code: ${completed.length}/${units.length} unit done、anomaly ${anomalies.length} 件、verify tests=${verify.tests_pass} gates=${verify.gates_pass}。`,
);

return {
  completed,
  anomalies,
  tests_pass: verify.tests_pass,
  gates_pass: verify.gates_pass,
  verify_output: verify.output_tail,
};

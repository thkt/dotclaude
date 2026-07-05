export const meta = {
  name: "build",
  description:
    "autonomous な end-to-end build。/issue で練られた Plan 節付き issue を入力に、Load (verbatim fetch -> 決定論 id 収集 -> extract -> validate + id cross-check) / Revalidate / Branch / Code / Audit / Polish / Backlog / Ship が決定論的 script stage として headless に走る。レビューは draft PR で行う。",
  whenToUse:
    'fire-and-forget の実装。人間と練る工程は /issue で完結させ、その issue 番号 ("123" / "#123") / URL / {issue, repo} を args で渡す。離席して戻ると draft PR があり、記録された assumption と audit 結果、そして /issue で起票するための scope 外 backlog 候補が列挙されている。飛行中の操舵が要るなら対話で phase を回す。',
  phases: [
    { title: "Load" },
    { title: "Revalidate" },
    { title: "Branch" },
    { title: "Code" },
    { title: "Audit" },
    { title: "Polish" },
    { title: "Backlog" },
    { title: "Ship" },
  ],
};

// 上流の /issue が premise 検証と人間との refine を終えている前提で、build は plan の
// 再発明をしない。issue 本文の ## Plan 節が唯一の計画ソースで、抽出は LLM に任せるが
// 検証は script が持つ: Plan 見出し検査と U/T id 収集は決定論 regex、構造検証は
// validate()、抽出の silent drop は id 集合の exact 比較で reject する。issue 起票から
// build 起動までの間に前提コードが動いた可能性は Revalidate (preconditions の
// exists/matches 検査) が fail-close で捕まえる。fan-out を内側に持つ stage は入れ子
// workflow に委譲する (code / audit / polish。入れ子は 1 段まで許可)。

phase("Load");

const input = typeof args === "object" && args ? args : {};
const issueRef = String(typeof args === "string" ? args : input.issue || "").trim();
// "123" / "#123" / issue URL の末尾から issue 番号を決定論で取り出す。
const issueNumber = (issueRef.match(/(\d+)\D*$/) || [])[1] || "";
if (!issueRef || !issueNumber) {
  return {
    stopped: "no-issue",
    why: 'issue を args で渡す ("123" / "#123" / URL / {issue, repo})。',
  };
}

// repo 指定時は session cwd と無関係にその repository へ固定する。「subagent は session cwd を
// 引き継ぐ」に頼るのは model 裁量で、別の場所から起動されると事故る。anchor() が絶対 cd を
// 前置して開始 cwd を無関係にする。guard は取り返しの利きにくい step (branch / commit / push /
// PR) の決定論的な backstop で、headless 完走中に介入の機会が無いぶん、git を変更する前に
// repo root を確認させる。
const repo = typeof input.repo === "string" ? input.repo : "";
const anchor = (p) =>
  repo
    ? `git / ファイル / ビルドのコマンドはすべて ${repo} の repository から実行する (各シェルコマンドを \`cd ${repo} && \` で始める)。\n\n${p}`
    : p;
const guard = repo
  ? ` この step で最初の commit / push / branch 変更を行う前に \`cd ${repo} && git rev-parse --show-toplevel\` を実行し、出力が ${repo} であることを確認する。異なる場合は git を変更せず中断し、不一致を報告する。`
  : "";

const FETCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["found", "body"],
  properties: {
    found: { type: "boolean" },
    body: {
      type: "string",
      description: "issue 本文の verbatim。要約・整形をしない",
    },
  },
};

// issue の Plan 節が持つ構造化 plan (units + preconditions + backlog_candidates) の schema。抽出は issue に
// 書かれた plan の構造化であって再計画ではない。
const EXTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "dir",
    "outcome",
    "decisions",
    "assumptions",
    "units",
    "test_command",
    "preconditions",
    "backlog_candidates",
  ],
  properties: {
    dir: {
      type: "string",
      description: "planning dir。例 .claude/workspace/planning/YYYY-MM-DD-slug",
    },
    outcome: {
      type: "string",
      description: "done 状態の 1 行記述 (実装非依存、観測可能)",
    },
    decisions: { type: "array", items: { type: "string" } },
    assumptions: {
      type: "array",
      items: { type: "string" },
      description: "issue に記録された best-guess の残余。PR でのユーザー拒否対象",
    },
    non_goals: { type: "array", items: { type: "string" } },
    constraints: { type: "array", items: { type: "string" } },
    units: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "goal", "files", "contract", "tests", "depends_on"],
        properties: {
          id: {
            type: "string",
            description: "U-001 形式。issue 本文の id をそのまま使う",
          },
          goal: {
            type: "string",
            description: "この unit が届ける振る舞いの 1 行記述",
          },
          files: {
            type: "array",
            items: { type: "string" },
            description: "作成・変更するファイルパス",
          },
          contract: {
            type: "string",
            description: "公開インターフェース。signature / CLI flag / schema の素描",
          },
          tests: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "name", "given", "when", "then"],
              properties: {
                id: {
                  type: "string",
                  description: "T-001 形式 (plan 全体で一意)",
                },
                name: {
                  type: "string",
                  description: "検証する仕様の言明。テスト名になる",
                },
                given: { type: "string" },
                when: { type: "string" },
                // JSON Schema の property 定義であり thenable ではない (BDD の given/when/then)
                // oxlint-disable-next-line unicorn/no-thenable
                then: { type: "string" },
              },
            },
          },
          depends_on: {
            type: "array",
            items: { type: "string" },
            description: "先行 unit の id。無ければ空配列",
          },
        },
      },
    },
    test_command: {
      type: "string",
      description: "テスト実行コマンド。例 cargo test / bun test",
    },
    preconditions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path"],
        properties: {
          path: {
            type: "string",
            description: "plan が前提とする既存ファイル",
          },
          pattern: {
            type: "string",
            description: "そのファイルに存在するはずの symbol / 文字列",
          },
        },
      },
      description: "issue の plan が前提とする既存コード。無ければ空配列",
    },
    backlog_candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["summary"],
        properties: {
          summary: { type: "string" },
        },
      },
      description: "issue に書かれた scope 外候補。無ければ空配列",
    },
  },
};

const REVALIDATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "pattern", "exists", "matches"],
        properties: {
          path: { type: "string" },
          pattern: { type: "string" },
          exists: { type: "boolean" },
          matches: { type: "boolean" },
        },
      },
    },
  },
};

const SHIP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["committed", "pr_url"],
  properties: {
    committed: { type: "boolean" },
    pr_url: { type: "string" },
    notes: { type: "string" },
  },
};

// 構造化 plan の再検証 + content 非空検査。構造 (id 重複 / 宙吊り / 循環 / テスト
// 欠落) と内容 (contract / name / given / when / then の空) を決定論で reject する。
//
// DRY 負債: これは hooks/veto/veto.py の validate_plan (canonical な plan-gate、
// plan-gate.bats T-011 でロック) の手動メンテコピー。workflow runtime はこのファイルを
// AsyncFunction 本体として wrap するため、build.js は canonical を import できない
// (しかも Python)。コピーは hooks/veto/tests/contract_build_port.py が lockstep に保つ:
// 下の 2 つの CONTRACT-TEST marker 間から本体を抽出し node で実行して、全共有 fixture で
// canonical と同一の errors を返すことを assert する。canonical を更新せずにこの block を
// 編集する (逆も同様) とそのテストが落ちる。marker のリネーム・削除は禁止。
// CONTRACT-TEST-BEGIN validate
const validate = (plan) => {
  const errors = [];
  // 非 object エントリには位置ベースの placeholder id を与え、"<id> has no ..." エラー
  // として表面化させる (共有 id に畳むと偽の "duplicate unit ids" が出る)。
  const units = (Array.isArray(plan.units) ? plan.units : []).map((u, i) =>
    u && typeof u === "object" && !Array.isArray(u) ? u : { id: `units[${i}]` },
  );
  if (!units.length) errors.push("units is empty. Define at least one implementation unit");
  if (!String(plan.test_command || "").trim()) errors.push("test_command is empty");

  const ids = new Set(units.map((u) => u.id));
  if (ids.size !== units.length) errors.push("duplicate unit ids");

  const testIds = new Set();
  for (const [i, u] of units.entries()) {
    const tests = (Array.isArray(u.tests) ? u.tests : []).map((t, j) =>
      t && typeof t === "object" && !Array.isArray(t) ? t : { id: `units[${i}].tests[${j}]` },
    );
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

  // 循環検出 (DFS)
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
// CONTRACT-TEST-END validate

// ---- Load: verbatim fetch -> Plan 見出し検査 -> 決定論 id 収集 -> extract -> validate + cross-check ----
const fetched = await agent(
  anchor(
    `GitHub issue ${issueRef} の本文を固定コマンドで取得する。要約・整形をしない。` +
      `\`gh issue view ${issueRef} --json body --jq .body\` をそのまま実行し、その stdout を body として verbatim で返す` +
      `(--jq 抽出は構造上 verbatim。編集しない)。コマンドが非 0 で終了した (issue が見つからない・取得失敗) 場合は found: false を返す。`,
  ),
  {
    label: "fetch",
    phase: "Load",
    agentType: "general-purpose",
    schema: FETCH_SCHEMA,
    model: "haiku",
  },
);
if (!fetched || !fetched.found || !String(fetched.body || "").trim()) {
  return {
    stopped: "no-issue-body",
    why: `issue ${issueRef} の本文を取得できなかった。issue 番号と repo を確認する。`,
  };
}
const body = fetched.body;

// Plan 見出し検査と id 収集は extract agent より前に script が決定論で行う。
const planHeading = body.match(/^##\s+Plan\b.*$/m);
if (!planHeading) {
  return {
    stopped: "no-plan",
    why: "issue 本文に ## Plan 節が無い。/issue で plan を練ってから build を起動する。",
  };
}
const afterHeading = body.slice(planHeading.index + planHeading[0].length);
const nextSection = afterHeading.search(/^##[^#]/m);
const planSection = nextSection === -1 ? afterHeading : afterHeading.slice(0, nextSection);
// id は定義位置でのみ拾い、prose 参照は拾わない (plan-section.md 参照)。
const idSet = (re) => new Set([...planSection.matchAll(re)].map((m) => m[1]));
const bodyUnitIds = idSet(/^###\s+(U-\d{3})\b/gm);
const bodyTestIds = idSet(/^[ \t]*[-*+][ \t]+(T-\d{3})\b/gm);

const plan = await agent(
  anchor(
    `次の GitHub issue 本文の ## Plan 節から構造化 plan を抽出する。再計画・要約・補完はせず、書かれている内容をそのまま構造化する。` +
      `unit id (U-NNN) と test id (T-NNN) は本文のものを漏れなく保持する (欠落は後段の決定論 cross-check で reject される)。` +
      `preconditions は plan が前提とする既存コードの {path, pattern} 一覧、backlog_candidates は issue に書かれた scope 外候補。本文に無ければ空配列。\n\n---\n${body}`,
  ),
  {
    label: "extract",
    phase: "Load",
    agentType: "general-purpose",
    schema: EXTRACT_SCHEMA,
    model: "sonnet",
  },
);
if (!plan) {
  return {
    stopped: "extraction-failed",
    why: "extract agent が plan を返さなかった。",
  };
}

const blockers = validate(plan);
if (blockers.length) {
  return {
    stopped: "invalid-plan",
    blockers,
    why: "抽出された plan が構造検証を通らない。",
  };
}

// 抽出での silent drop / 捏造を id 集合の exact 比較で reject する。
const planUnitIds = new Set(plan.units.map((u) => u.id));
const planTestIds = new Set(plan.units.flatMap((u) => u.tests.map((t) => t.id)));
const setDiff = (a, b) => [...a].filter((x) => !b.has(x));
const mismatch = {
  units_missing: setDiff(bodyUnitIds, planUnitIds),
  units_extra: setDiff(planUnitIds, bodyUnitIds),
  tests_missing: setDiff(bodyTestIds, planTestIds),
  tests_extra: setDiff(planTestIds, bodyTestIds),
};
if (Object.values(mismatch).some((l) => l.length)) {
  return {
    stopped: "extraction-mismatch",
    detail: mismatch,
    why: "issue 本文の U/T id 集合と抽出結果が一致しない。",
  };
}
log(
  `plan 抽出: unit ${plan.units.length} 件、test scenario ${planTestIds.size} 件、id cross-check pass。`,
);

// ---- Revalidate: preconditions を現在の codebase に対して再検証 (決定論 script gate) ----
// issue 起票から build 起動までの間に前提コードが動いた可能性を fail-close で捕まえる。
// exists/matches の判定は LLM でなく決定論 verifier workflows/build/revalidate.py が下す:
// チェック (test -f + literal grep) は推論不要で、workflow runtime に無い shell アクセスだけを
// 要するので、agent は preconditions を流し込んで verifier の stdout をそのまま返すだけの
// 起動役にする。drift 判定は下の script の filter が持つ。
// Branch (checkout) とは相互独立 (両者とも plan にしか依存しない) なので並列に走らせる。
// トレードオフ: Revalidate が drift で stop した場合、checkout 済み branch が残る
// (作成のみで commit は無いので回収は容易)。stopped return に branch を含めて可視化する。
phase("Revalidate");
const preconditions = plan.preconditions || [];
const [reval, branch] = await parallel([
  () =>
    preconditions.length
      ? agent(
          anchor(
            `plan の preconditions を決定論 verifier で再検証する。exists/matches を自分で判定しない。` +
              `手順は、(1) この JSON をそのまま temp file に書き出す。(2) repository root から ` +
              `\`python3 "$HOME/.claude/workflows/build/revalidate.py" < <tempfile>\` を実行する。` +
              `(3) verifier の stdout "results" 配列を verbatim で返す (全 ${preconditions.length} 件、追加・削除・編集をしない)。` +
              `verifier は {"results":[{path,pattern,exists,matches}]} を出力する。\n` +
              `Preconditions JSON は次のとおり。\n${JSON.stringify(preconditions)}`,
          ),
          {
            label: "revalidate",
            phase: "Revalidate",
            agentType: "general-purpose",
            schema: REVALIDATE_SCHEMA,
            model: "haiku",
          },
        )
      : Promise.resolve(null),
  () =>
    agent(
      anchor(
        `issue #${issueNumber} "${plan.outcome}" のための新しい git 作業 branch を checkout する。conventional な branch 名 (type + 短い slug) を選び、その名前で git checkout -b を実行する。既に default branch 以外に居るなら現在の branch を維持する。branch 名を最終テキストで報告する。${guard}`,
      ),
      {
        label: "checkout",
        phase: "Branch",
        agentType: "general-purpose",
        model: "haiku",
      },
    ),
]);
if (preconditions.length) {
  if (!reval || !Array.isArray(reval.results)) {
    return {
      stopped: "revalidate-failed",
      detail: reval,
      branch,
      why: "revalidate agent が results 配列を返さなかった。",
    };
  }
  // 各 precondition を (path, pattern) で result に束縛する。単なる件数一致に頼らない:
  // launcher が並べ替え・drop して重複補填・差し替えをしても長さは同じになり、件数だけでは
  // 実 drift を見逃す。対応する exists&&matches result が無い (欠落 or 失敗) precondition は drift。
  const keyOf = (o) => JSON.stringify([o.path, o.pattern || ""]);
  const resultByKey = new Map(reval.results.map((r) => [keyOf(r), r]));
  const drift = [];
  for (const pc of preconditions) {
    const r = resultByKey.get(keyOf(pc));
    if (!r) drift.push({ ...pc, exists: false, matches: false, missing: true });
    else if (!r.exists || !r.matches) drift.push(r);
  }
  if (drift.length) {
    return {
      stopped: "plan-drift",
      drift,
      branch,
      why: "issue の plan が前提とするコードが現在の codebase に無い。issue を更新してから再起動する。",
    };
  }
  log(`revalidate: preconditions ${preconditions.length} 件 全 pass。`);
}

// checkout agent は上で Revalidate と並列に実行済み。phase マーカーは drift gate の後で
// 発火させ、観測可能な trace を Load → Revalidate → Branch → Code に保つ
// (plan-drift stop は Branch に到達しない)。
phase("Branch");

// ---- Code: workflow("code") に委譲 (unit ごとの Red -> Green + 独立 verify) ----
// preconditions / backlog_candidates は build 側で消費済みなので、code へは
// PLAN_SCHEMA 相当だけを渡す。
phase("Code");
const stripPreconditions = (p) =>
  Object.fromEntries(
    Object.entries(p).filter(([k]) => k !== "preconditions" && k !== "backlog_candidates"),
  );
const code =
  (await workflow("code", {
    plan: stripPreconditions(plan),
    repo,
    model: "sonnet",
  })) || null;
if (!code || code.stopped) {
  return { stopped: "code-failed", detail: code, planning: plan.dir };
}
if (!code.tests_pass || !code.gates_pass)
  log(
    `code の独立 verify が fail (tests=${code.tests_pass} gates=${code.gates_pass})。audit へ前進し PR に表面化する。`,
  );
// workflow("code") は自前の `▸ code` グループで走るため Code phase ボックスに直接 agent が
// 付かず「Not started」のままになる。この安価な agent 1 体で着火・完了させ、code phase が
// 届けた内容の run-log recap も兼ねる。
await agent(
  `Summarize in one line what the code phase delivered: ${plan.units.length} unit(s) implemented, independent verify tests=${code.tests_pass} gates=${code.gates_pass}. Return the sentence only.`,
  { label: "code-summary", phase: "Code", model: "haiku" },
);

// ---- Audit ∥ Polish review ∥ Conformance -> fix -> re-audit loop (audit 実行は最大 3 回) ----
// audit は workflow("audit") が fan-out を所有する (/audit の glob routing 表 + reviewer ->
// challenge -> verify -> integrate)。scope を渡さないので uncommitted diff、つまり実装全体を
// route する。code phase がテストを green にしているので preflight は省く。polish の review
// mode は読み取りのみで、同じ diff に外部 Codex レンズを audit と並走できる。
// reviewer-conformance は「実装が issue の Plan と一致するか」の Spec 軸を独立に見る。この軸の
// findings は quality findings と別軸なので、消費側で toFix / residualBlocking に merge も
// rerank もせず、PR の専用セクションに独立して surface する (reviewer-conformance の Posture)。
const CONFORMANCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["spec_found", "findings"],
  properties: {
    spec_found: {
      type: "boolean",
      description: "照合対象の spec (issue の Plan) が見つかり review した場合 true",
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "spec_line", "location", "detail"],
        properties: {
          category: {
            type: "string",
            enum: ["missing", "scope_creep", "wrong"],
            description: "欠落/部分実装、scope creep、実装誤り",
          },
          spec_line: { type: "string", description: "対象となる spec / issue の引用行" },
          location: {
            type: "string",
            description: "diff 内の file:line、または scope creep の箇所",
          },
          detail: { type: "string" },
        },
      },
    },
  },
};
phase("Audit");
const [audit0, review, conformance] = await parallel([
  () => workflow("audit", { repo, skipPreflight: true }),
  () => workflow("polish", { repo, mode: "review" }),
  () =>
    agent(
      anchor(
        `originating issue に対する conformance review。spec は GitHub issue #${issueNumber}: ` +
          `\`gh issue view ${issueNumber}\` で読む。review 対象は UNCOMMITTED な working-tree diff ` +
          `(この build はまだ commit していない) なので、\`git diff HEAD\` と ` +
          `\`git status --porcelain\` が示す untracked file (新規の test/impl file) を対象にする。` +
          `main...HEAD は使わない (HEAD はまだ branch 分岐点)。3 category (欠落/部分実装、scope creep、` +
          `実装誤り) を spec 行を引用して報告する。spec が見つからなければ spec_found=false と空の findings を返す。`,
      ),
      {
        label: "conformance",
        phase: "Audit",
        agentType: "reviewer-conformance",
        schema: CONFORMANCE_SCHEMA,
      },
    ),
]);
const conf = conformance || { spec_found: false, findings: [] };
log(
  conf.spec_found
    ? `conformance: ${conf.findings.length} 件の spec 逸脱 (独立軸、PR に別セクションで surface)。`
    : "conformance: 照合対象の spec 未検出、skip。",
);
let audit = audit0 || { findings: [] };
log(
  `audit が ${(audit.assignments || []).length} reviewer group を発火、polish レンズは ${review && review.codex_available ? "有効" : "無効"}。`,
);
const criticalHigh = (a) =>
  (a.findings || []).filter((f) => f.severity === "critical" || f.severity === "high");
const polishSurvivors = ((review && review.survivors) || []).map((f) => ({
  severity: f.severity === "P1" ? "high" : "medium",
  summary: `${f.title}: ${f.detail}`,
  file: f.file || "",
}));
// fix -> re-audit を 0 critical/high まで回す。旧版は fix 1 回で re-audit なし、つまり fix の
// 検証が無かった。最終 round の fix だけは re-audit 予算が尽きるため未検証のまま PR に
// 表面化する。
let toFix = [...criticalHigh(audit), ...polishSurvivors];
let reaudited = true;
for (let round = 1; round <= 3 && toFix.length; round++) {
  log(`fix round ${round}: ${toFix.length} 件を修正。`);
  await agent(
    anchor(
      `これらの review findings を修正し、テストが通ることを確認する。findings は次のとおり。\n${JSON.stringify(toFix)}`,
    ),
    {
      agentType: "general-purpose",
      phase: "Audit",
      label: `fix:${round}`,
      model: "sonnet",
    },
  );
  if (round === 3) {
    reaudited = false;
    log("fix round 上限。最終 round の fix は re-audit されず、PR に表面化する。");
    break;
  }
  audit = (await workflow("audit", { repo, skipPreflight: true })) || {
    findings: [],
  };
  toFix = criticalHigh(audit);
}
// re-audit 済みなら criticalHigh(audit) は (ループ退出条件より空の) 検証済み集合。
// round 上限に達した (reaudited === false) 場合、toFix は最終 round で修正したが
// re-audit していない critical/high findings を保持する。汎用警告だけでなく PR に
// 「未解決の可能性がある blocker」を列挙するため surface する。
const residualBlocking = reaudited ? criticalHigh(audit) : toFix;

// ---- Polish: cleanup のみ (simplify -> enhancer-code -> テスト検証) ----
// review レンズは Audit phase で消化済みなので、ここは mutator だけを回す。
phase("Polish");
const cleanup = await workflow("polish", { repo, mode: "cleanup" });
// workflow("polish") は自前の `▸ polish` グループで走るため Polish phase ボックスに直接 agent
// が付かない。Code phase と同じく agent 1 体で着火・完了させる。
const cleanupEdits = cleanup?.cleanup?.edits?.length ?? 0;
await agent(
  `Summarize in one line what the polish phase did: ${cleanupEdits} cleanup edit(s) applied, tests_pass=${cleanup?.cleanup?.tests_pass}. Return the sentence only.`,
  { label: "polish-summary", phase: "Polish", model: "haiku" },
);

// ---- Backlog: scope 外の発見を「ユーザーが起票する候補」として集める ----
// 候補源は issue 本文に書かれた scope 外候補 (source: issue) と build 中の発見 (code /
// audit / polish)。build はこれを自分で起票しない: headless 実行からの自動 post は
// 未成熟で重複しやすい issue を量産し、自動化への信頼を下げる。起票は最終出力に委ねる。
// 候補を PR body と戻り値に載せ、起票に値するものはユーザーが /issue で立てる。
// /issue は build が issue に期待する premise-check / challenge の refine を通す。
// code.anomalies はここに畳まない: Red 未確認の build 健全性シグナルであり、PR の専用
// "Anomalies" 節 (shipPayload.code_anomalies 経由) で一度だけ描画する。ここにも畳むと
// 各 anomaly が二重に列挙されていた。
phase("Backlog");
const backlogCandidates = [
  ...(plan.backlog_candidates || []).map((c) => ({ ...c, source: "issue" })),
  ...(audit.findings || [])
    .filter((f) => f.severity === "medium" || f.severity === "low")
    .map((f) => ({
      source: "audit",
      summary: f.summary,
      file: f.file,
      severity: f.severity,
    })),
  ...((review && review.needs_context) || []).map((f) => ({
    source: "polish",
    summary: `${f.title}: ${f.why || f.detail}`,
  })),
];
if (backlogCandidates.length) {
  log(
    `backlog: scope 外候補 ${backlogCandidates.length} 件を、ユーザーが /issue で起票するため surface。`,
  );
}

// ---- Ship: commit + draft PR (外向きの操作なので draft = 可逆) ----
// PR は人間レビュアーも読むので、body は所有者の異なる 2 部構成にする。冒頭の Summary
// (何を・なぜ・どこを見るか) はレビュアーの入口で本質的に生成なので agent が書く
// (commit メッセージと同様)。その下に、script が既に持つ構造化事実 (assumption /
// backlog 候補 / 未解決 finding / 未 re-audit 警告 / verify 結果) の fail-closed な転記が
// 続く。この tail だけを決定論 renderer workflows/build/pr-body.py に委ね、事実セクションの
// 欠落や和らげを起こさせない。agent は tail を再入力せず append し、append と `gh pr create` を
// `&&` で連結する。renderer が失敗 (payload 不正 / 必須欠落 → exit 1、出力なし) したら PR は
// 一切作られず、tail の欠けた PR を出さない。verify ログの pass/fail 判定は pr-body.py だけが
// 持つ (失敗時のみ verify_output を読む) ので、payload は無条件でそれを渡す。
phase("Ship");

// tail のラベルは pr-body.py が言語化するが、finding 本文は reviewer が英語で吐くので
// そのまま出ていた。人間レビュアーも読むため、fail-closed でない情報系セクションの
// 自由記述だけを対象言語へ翻訳 + 軽く圧縮する。安全事実 (verify status / not-reaudited
// 警告 / verify_output ログ) と、file:line・severity・件数・識別子といった構造化フィールド
// は対象外で決定論のまま残す。source の finding を mutate しないよう copy に対して行う。
const shipAssumptions = [...(plan.assumptions || [])];
const shipBacklog = backlogCandidates.map((c) => ({ ...c }));
const shipResidual = residualBlocking.map((f) => ({ ...f }));
const shipAnomalies = (code.anomalies || []).map((a) => ({ ...a }));
const shipConformance = conf.spec_found ? conf.findings.map((f) => ({ ...f })) : [];

// 翻訳対象の自由記述だけを id 付きで集める。書き戻しは set() 経由で、構造化
// フィールドには触れない。空文字列は翻訳に送らない。
const slots = [];
shipAssumptions.forEach((t, i) => {
  if (typeof t === "string" && t.trim())
    slots.push({ text: t, set: (v) => (shipAssumptions[i] = v) });
});
for (const c of shipBacklog)
  if (c.summary && c.summary.trim()) slots.push({ text: c.summary, set: (v) => (c.summary = v) });
for (const f of shipResidual)
  if (f.summary && f.summary.trim()) slots.push({ text: f.summary, set: (v) => (f.summary = v) });
for (const f of shipConformance)
  if (f.detail && f.detail.trim()) slots.push({ text: f.detail, set: (v) => (f.detail = v) });
for (const a of shipAnomalies)
  if (a.notes && a.notes.trim()) slots.push({ text: a.notes, set: (v) => (a.notes = v) });

if (slots.length) {
  // 単一利用の schema。各要素に入力の id を付けて返させ、id で書き戻す。順序が
  // 入れ替わっても取り違えず、全 id が揃わなければ fail-open で英語原文を維持。
  const TRANSLATION_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["translations"],
    properties: {
      translations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "text"],
          properties: { id: { type: "integer" }, text: { type: "string" } },
        },
      },
    },
  };
  const translated = await agent(
    anchor(
      `\`$HOME/.claude/settings.json\` の \`language\` を読む (未設定なら english)。` +
        `次の JSON 配列は PR 本文の情報系セクション (backlog / assumptions / 未解決 finding / conformance / anomaly) の自由記述。各要素の \`text\` を \`language\` へ翻訳し、冗長な散文は締めて短くする。english のときも軽い圧縮のためこの手順を通す。\n` +
        `厳守: (a) file:line・パス・数値・件数・severity ラベル・識別子・コード片は原文のまま残す。(b) 事実を足さない・削らない。訳と圧縮のみで、新しい主張や件数を作らない。(c) 出力 \`translations\` は各要素に入力の \`id\` を付けて全件返す。順序は問わないが id は入力と一致させる。\n` +
        `入力:\n${JSON.stringify(slots.map((s, i) => ({ id: i, text: s.text })))}`,
    ),
    {
      label: "translate-tail",
      phase: "Ship",
      schema: TRANSLATION_SCHEMA,
      model: "sonnet",
    },
  );
  const out = translated && translated.translations;
  // id で突合。全 slot 分の訳が揃ったときだけ反映し、欠落・取り違え・順序入れ替えは
  // 英語原文で継続する。
  const byId = new Map();
  if (Array.isArray(out))
    for (const o of out)
      if (o && Number.isInteger(o.id) && typeof o.text === "string" && o.text.trim())
        byId.set(o.id, o.text);
  if (slots.every((_, i) => byId.has(i))) {
    slots.forEach((s, i) => s.set(byId.get(i)));
  } else {
    log(`translate-tail: 訳が ${byId.size}/${slots.length} 件、英語原文で ship を継続。`);
  }
}

const shipPayload = {
  issue: issueNumber,
  assumptions: shipAssumptions,
  backlog_candidates: shipBacklog,
  residual_blocking: shipResidual,
  reaudited,
  code_anomalies: shipAnomalies,
  tests_pass: code.tests_pass,
  gates_pass: code.gates_pass,
  verify_output: code.verify_output || "",
  conformance: shipConformance,
};
const ship = await agent(
  anchor(
    `全変更 (planning 成果物 + 実装) を 1 つの Conventional Commits commit にする。commit メッセージは自分で書く (diff を要約する)。` +
      `branch を push し、draft pull request を開く。body は PR テンプレートから自分で書く人間向け部分と、データから決定論生成した事実セクションの 2 部構成にする (事実セクションは手書きしない)。手順は次のとおり。\n` +
      `(1) \`$HOME/.claude/settings.json\` の \`language\` を読み (未設定なら英語)、人間向け body をその言語で書く。code・識別子・技術用語は翻訳しない。PR テンプレートを選ぶ。repository にあればそれを使い (case-insensitive、優先順 \`.github/pull_request_template.md\` > \`pull_request_template.md\` > \`docs/pull_request_template.md\` > \`PULL_REQUEST_TEMPLATE/\` ディレクトリ)、なければ bundled \`$HOME/.claude/skills/pr/templates/pr.md\` を使う。skeleton を読んで body file に畳み込む。人間向けセクションだけを埋め、レビュアーが一目で意図をつかめるようにする。この PR が何を実装したか (outcome は ${JSON.stringify(plan.outcome)})、アプローチ、レビューで注視すべき箇所を、リストとコンパクトな table で簡潔に書く。冗長表現も事実の捏造もしない。決定論 tail が既に出すセクションはスキップする。Related / Closes (tail が \`Closes #\` を出す) と Scope / Backlog (tail が backlog を出す)。Design Decisions は plan の decisions (${JSON.stringify(plan.decisions || [])}) と実際の diff から埋め、空ならセクションごと省く。\n` +
      `(2) この JSON をそのまま temp file に書き出す。\n${JSON.stringify(shipPayload)}\n` +
      `(3) 事実 tail の追記と PR 作成を 1 つの \`&&\` チェーンで行い、renderer 失敗時は PR を作る前に中断する。repository root から ` +
      `\`python3 "$HOME/.claude/workflows/build/pr-body.py" < <tempfile> >> <bodyfile> && gh pr create --draft --title "<commit subject>" --body-file <bodyfile>\` を実行する。\n` +
      `pr-body.py は payload が不正・必須フィールド欠落なら非 0 で終了し (何も出力しない)。チェーンが失敗したら他の手段で PR を作らず、committed と空の pr_url とエラーを報告する。tail の欠けた PR を出すより欠落を surface する。\n` +
      `committed 状態と PR url を報告する。${guard}`,
  ),
  {
    label: "ship",
    phase: "Ship",
    agentType: "general-purpose",
    schema: SHIP_SCHEMA,
    model: "sonnet",
  },
);

return {
  issue: issueNumber,
  branch,
  planning: plan.dir,
  units_completed: code.completed.length,
  code_anomalies: (code.anomalies || []).length,
  code_verified: code.tests_pass && code.gates_pass,
  audit_findings: (audit.findings || []).length,
  residual_blocking: residualBlocking.length,
  conformance_findings: (conf.findings || []).length,
  polish_cleanup: cleanup && cleanup.cleanup ? cleanup.cleanup.tests_pass : null,
  backlog_candidates: backlogCandidates,
  assumptions: plan.assumptions,
  pr_url: ship.pr_url,
  committed: ship.committed,
};

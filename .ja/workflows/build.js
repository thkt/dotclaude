export const meta = {
  name: "build",
  description:
    "autonomous な end-to-end build。/issue で練られた Plan 節付き issue を入力に、Load (verbatim fetch -> 決定論 id 収集 -> extract -> validate + id cross-check) / Revalidate / Branch / Code / Audit / Polish / Backlog / Ship が決定論的 script stage として headless に走る。レビューは draft PR で行う。",
  whenToUse:
    'fire-and-forget の実装。人間と練る工程は /issue で完結させ、その issue 番号 ("123" / "#123") / URL / {issue, repo} を args で渡す。離席して戻ると draft PR があり、記録された assumption と audit 結果と backlog issue をレビューする。飛行中の操舵が要るなら対話で phase を回す。',
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
    body: { type: "string", description: "issue 本文の verbatim。要約・整形をしない" },
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
    outcome: { type: "string", description: "done 状態の 1 行記述 (実装非依存、観測可能)" },
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
          id: { type: "string", description: "U-001 形式。issue 本文の id をそのまま使う" },
          goal: { type: "string", description: "この unit が届ける振る舞いの 1 行記述" },
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
                id: { type: "string", description: "T-001 形式 (plan 全体で一意)" },
                name: { type: "string", description: "検証する仕様の言明。テスト名になる" },
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
    test_command: { type: "string", description: "テスト実行コマンド。例 cargo test / bun test" },
    preconditions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path"],
        properties: {
          path: { type: "string", description: "plan が前提とする既存ファイル" },
          pattern: { type: "string", description: "そのファイルに存在するはずの symbol / 文字列" },
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

const BACKLOG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["posted", "deferred"],
  properties: {
    posted: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
        },
      },
    },
    deferred: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "reason"],
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
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
    `GitHub issue ${issueRef} の本文を取得する。gh CLI (例: gh issue view ${issueRef} --json body) を使い、body は要約・整形・省略を一切せず verbatim で返す。issue が見つからない・取得に失敗した場合は found: false を返す。`,
  ),
  { label: "fetch", phase: "Load", agentType: "general-purpose", schema: FETCH_SCHEMA },
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
const idSet = (re) => new Set([...planSection.matchAll(re)].map((m) => m[0]));
const bodyUnitIds = idSet(/\bU-\d{3}\b/g);
const bodyTestIds = idSet(/\bT-\d{3}\b/g);

const plan = await agent(
  anchor(
    `次の GitHub issue 本文の ## Plan 節から構造化 plan を抽出する。再計画・要約・補完はせず、書かれている内容をそのまま構造化する。` +
      `unit id (U-NNN) と test id (T-NNN) は本文のものを漏れなく保持する (欠落は後段の決定論 cross-check で reject される)。` +
      `preconditions は plan が前提とする既存コードの {path, pattern} 一覧、backlog_candidates は issue に書かれた scope 外候補。本文に無ければ空配列。\n\n---\n${body}`,
  ),
  { label: "extract", phase: "Load", agentType: "general-purpose", schema: EXTRACT_SCHEMA },
);
if (!plan) {
  return { stopped: "extraction-failed", why: "extract agent が plan を返さなかった。" };
}

const blockers = validate(plan);
if (blockers.length) {
  return { stopped: "invalid-plan", blockers, why: "抽出された plan が構造検証を通らない。" };
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

// ---- Revalidate: preconditions を現在の codebase に対して再検証 (evidence + script gate) ----
// issue 起票から build 起動までの間に前提コードが動いた可能性を fail-close で捕まえる。
// miss の判定は agent の自己申告でなく script の filter が行う。
phase("Revalidate");
const preconditions = plan.preconditions || [];
if (preconditions.length) {
  const reval = await agent(
    anchor(
      `plan の preconditions を現在の codebase に対して再検証する。各 {path, pattern} について、path の存在 (exists) と pattern の grep 一致 (matches。pattern 無しなら exists と同値) を実際にコマンドで確認し、全 ${preconditions.length} 件を results で返す。判定を甘くしない。\n${JSON.stringify(preconditions)}`,
    ),
    {
      label: "revalidate",
      phase: "Revalidate",
      agentType: "general-purpose",
      schema: REVALIDATE_SCHEMA,
    },
  );
  if (!reval || !Array.isArray(reval.results) || reval.results.length !== preconditions.length) {
    return {
      stopped: "revalidate-failed",
      detail: reval,
      why: "revalidate agent が全 preconditions の results を返さなかった。",
    };
  }
  const drift = reval.results.filter((r) => !r.exists || !r.matches);
  if (drift.length) {
    return {
      stopped: "plan-drift",
      drift,
      why: "issue の plan が前提とするコードが現在の codebase に無い。issue を更新してから再起動する。",
    };
  }
  log(`revalidate: preconditions ${preconditions.length} 件 全 pass。`);
}

// ---- Branch: 作業 branch を checkout ----
phase("Branch");
const branch = await agent(
  anchor(
    `issue #${issueNumber} "${plan.outcome}" のための新しい git 作業 branch を checkout する。conventional な branch 名 (type + 短い slug) を選び、その名前で git checkout -b を実行する。既に default branch 以外に居るなら現在の branch を維持する。branch 名を最終テキストで報告する。${guard}`,
  ),
  { label: "checkout", phase: "Branch", agentType: "general-purpose" },
);

// ---- Code: workflow("code") に委譲 (unit ごとの Red -> Green + 独立 verify) ----
// preconditions / backlog_candidates は build 側で消費済みなので、code へは
// PLAN_SCHEMA 相当だけを渡す。
phase("Code");
const stripPreconditions = (p) =>
  Object.fromEntries(
    Object.entries(p).filter(([k]) => k !== "preconditions" && k !== "backlog_candidates"),
  );
const code =
  (await workflow("code", { plan: stripPreconditions(plan), repo, model: "sonnet" })) || null;
if (!code || code.stopped) {
  return { stopped: "code-failed", detail: code, planning: plan.dir };
}
if (!code.tests_pass || !code.gates_pass)
  log(
    `code の独立 verify が fail (tests=${code.tests_pass} gates=${code.gates_pass})。audit へ前進し PR に表面化する。`,
  );

// ---- Audit ∥ Polish review -> fix -> re-audit loop (audit 実行は最大 3 回) ----
// audit は workflow("audit") が fan-out を所有する (/audit の glob routing 表 + reviewer ->
// challenge -> verify -> integrate)。scope を渡さないので uncommitted diff、つまり実装全体を
// route する。code phase がテストを green にしているので preflight は省く。polish の review
// mode は読み取りのみで、同じ diff に外部 Codex レンズを audit と並走できる。
phase("Audit");
const [audit0, review] = await parallel([
  () => workflow("audit", { repo, skipPreflight: true }),
  () => workflow("polish", { repo, mode: "review" }),
]);
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
      `これらの review findings を修正し、テストが通ることを確認する:\n${JSON.stringify(toFix)}`,
    ),
    { agentType: "general-purpose", phase: "Audit", label: `fix:${round}` },
  );
  if (round === 3) {
    reaudited = false;
    log("fix round 上限。最終 round の fix は re-audit されず、PR に表面化する。");
    break;
  }
  audit = (await workflow("audit", { repo, skipPreflight: true })) || { findings: [] };
  toFix = criticalHigh(audit);
}
const residualBlocking = reaudited ? criticalHigh(audit) : [];

// ---- Polish: cleanup のみ (simplify -> enhancer-code -> テスト検証) ----
// review レンズは Audit phase で消化済みなので、ここは mutator だけを回す。
phase("Polish");
const cleanup = await workflow("polish", { repo, mode: "cleanup" });

// ---- Backlog: scope 外の発見を issue 化する (ハイブリッド) ----
// 候補源は issue 本文に書かれた scope 外候補 (source: issue) と build 中の発見。既存 issue と
// 照合して新規と確信できるものだけ自動 post する。確信の持てない候補は PR body に回して
// 人間が triage する。重複 issue の量産は自動化への信頼を下げるので、迷ったら deferred に倒す。
phase("Backlog");
const backlogCandidates = [
  ...(plan.backlog_candidates || []).map((c) => ({ ...c, source: "issue" })),
  ...(code.anomalies || []).map((a) => ({
    source: "code",
    summary: `${a.unit} で Red 未確認 (${a.kind}): ${a.notes}`,
  })),
  ...(audit.findings || [])
    .filter((f) => f.severity === "medium" || f.severity === "low")
    .map((f) => ({ source: "audit", summary: f.summary, file: f.file, severity: f.severity })),
  ...((review && review.needs_context) || []).map((f) => ({
    source: "polish",
    summary: `${f.title}: ${f.why || f.detail}`,
  })),
];
let backlog = { posted: [], deferred: [] };
if (backlogCandidates.length) {
  backlog = (await agent(
    anchor(
      `build 中に発見された scope 外の問題を GitHub issue 化する backlog stage。build 元 issue: #${issueNumber}。候補:\n${JSON.stringify(backlogCandidates)}\n` +
        `各候補について次を行う。(1) issue に値するか判定する (actionable で、この build の scope 外で、些末でない。重複や言い換えは 1 件に統合する)。` +
        `(2) gh CLI の issue 検索 (state open、候補のキーワード) で既存 issue との重複を照合する。\n` +
        `新規と確信できるものだけ issue を立てる (上限 5 件)。label build-discovered を付け、repo に無ければ gh の label サブコマンドで先に用意する (色 BFD4F2、説明は「autonomous build が発見した scope 外の問題」。用意に失敗したら label なしで立てる)。issue 本文に出所 (source) と発見元の build 元 issue #${issueNumber} を記す。\n` +
        `重複の疑いがある・判断に迷う候補は post せず deferred に回し、理由を書く。gh が使えない場合は全候補を deferred にする。`,
    ),
    { label: "backlog", phase: "Backlog", agentType: "general-purpose", schema: BACKLOG_SCHEMA },
  )) || {
    posted: [],
    deferred: backlogCandidates.map((c) => ({
      title: `[${c.source}] ${c.summary}`,
      reason: "backlog agent が結果を返さなかった",
    })),
  };
  log(
    `backlog: issue ${backlog.posted.length} 件を post、${backlog.deferred.length} 件を PR body へ。`,
  );
}

// ---- Ship: commit + draft PR (外向きの操作なので draft = 可逆) ----
phase("Ship");
const ship = await agent(
  anchor(
    `全変更 (planning 成果物 + 実装) を 1 つの Conventional Commits commit にする。` +
      `branch を push し、gh CLI で draft の pull request を開く。\n` +
      `PR body には次を全て載せる。(1) 元 issue を閉じる参照 "Closes #${issueNumber}"。` +
      `(2) plan に記録された assumption (ユーザーの拒否対象): ${JSON.stringify(plan.assumptions)}。` +
      `(3) backlog で post した issue: ${JSON.stringify(backlog.posted)}。` +
      `(4) 人間の triage 待ち backlog 候補: ${JSON.stringify(backlog.deferred)}。` +
      `(5) 未解決の critical/high findings: ${JSON.stringify(residualBlocking)}${reaudited ? "" : " (最終 fix round は re-audit されていない旨を明記する)"}。` +
      `(6) code の Red 未確認 anomaly: ${JSON.stringify(code.anomalies || [])}。` +
      `(7) code の独立 verify 結果 (tests=${code.tests_pass} gates=${code.gates_pass})${code.tests_pass && code.gates_pass ? "" : `。fail の詳細: ${JSON.stringify(code.verify_output)}`}。\n` +
      `committed 状態と PR url を報告する。${guard}`,
  ),
  { label: "ship", phase: "Ship", agentType: "general-purpose", schema: SHIP_SCHEMA },
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
  polish_cleanup: cleanup && cleanup.cleanup ? cleanup.cleanup.tests_pass : null,
  backlog_posted: backlog.posted,
  backlog_deferred: backlog.deferred.length,
  assumptions: plan.assumptions,
  pr_url: ship.pr_url,
  committed: ship.committed,
};

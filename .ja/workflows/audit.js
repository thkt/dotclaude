export const meta = {
  name: "audit",
  description:
    '決定論的な audit fan-out。ファイルの routing (glob 表) は script 内で走るため reviewer 選択は drift しない。git I/O と各 reviewer / critic は agent として走る。pipeline は reviewer -> challenge -> verify -> integrate であり reviewer -> aggregate ではない。standalone でも build から workflow("audit") で nested にも呼べる。',
  whenToUse:
    "diff に対して adversarial な reviewer 一式を決定論的に発火させ、review を main loop の裁量に委ねない。/audit または Workflow({name:'audit'}) で直接起動する。launcher skill は無い。起動前に scope や focus が不明なら、ユーザーに 2 点を尋ねる。focus (all / security / performance / quality / a11y) と scope (staged の HEAD diff、path、別 repo のいずれか)。それらを args として渡す。例 Workflow({name:'audit', args:{focus:'security', scope:'src/'}})。args を省くと focus=all で HEAD diff を audit する。この workflow が clarification の受け渡しと fan-out の両方を所有する。",
  phases: [
    { title: "Pre-flight" },
    { title: "Route" },
    { title: "Review" },
    { title: "Challenge" },
    { title: "Verify" },
    { title: "Integrate" },
    { title: "Snapshot" },
  ],
};

// routing を agent でなく script に置く理由。/audit は純粋な glob 表 (拡張子 -> reviewer
// list) で reviewer を割り当てる。agent がその表を再導出すると、この workflow が消すために
// 存在するまさにその drift を再び持ち込む。だから表は JS に移植して決定論的に適用し、agent は
// tool を要する処理 (git diff / log) か判断 (review 自体) だけを行う。reviewer は sonnet で
// 走る。/audit の教訓に倣う。opus + 深い解析は stream watchdog を stall させる。silent でなく
// 明示した pilot cut。reviewer-causation (全 findings への 5 Whys) と複数 run の集約は seam が
// 実証されるまで deferred。

// args は object (推奨) で来ることも、呼び出し側が stringify すれば JSON 文字列で来ることも
// ある。一度だけ正規化し、scope が blob 全体を飲み込まず、渡され方に依らず focus / repo /
// skipPreflight を読めるようにする。object に parse できる文字列はその object とし、それ以外の
// 文字列は scope の短縮記法とする。
const opts = (() => {
  if (typeof args === "object" && args) return args;
  if (typeof args !== "string") return {};
  const s = args.trim();
  if (s.startsWith("{")) {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // 壊れた JSON。抜けて raw 文字列を scope として扱う
    }
  }
  return { scope: args };
})();

const scope = typeof opts.scope === "string" ? opts.scope : "";
const focus = typeof opts.focus === "string" ? opts.focus : "all";
const repo = typeof opts.repo === "string" ? opts.repo : "";
// noLimit は >30 ファイルの guard を skip する。skipPreflight は呼び出し側 (build。その Code
// phase が既に test を green まで回した) が冗長な test 実行を抑止できるようにする。
const noLimit = opts.noLimit === true;
const skipPreflight = opts.skipPreflight === true;
const anchor = (p) =>
  repo
    ? `repo ${repo} から全 git コマンドを実行せよ (各シェルコマンドを \`cd ${repo} && \` で始めよ)。\n\n${p}`
    : p;

// snapshot の永続化は disk 副作用で、return 契約の一部ではない。script は filesystem に触れず
// Date.now() も呼べない (どちらも sandbox で throw / block される) ため、bash agent が
// `date -u` で timestamp を刻み、$CLAUDE_SESSION_ID と branch を読み、直近の prior snapshot との
// delta を計算してファイルを書く。その結果は消費されない。
const writeSnapshot = async ({ preFlight, rawFindings, findings, skipped }) => {
  phase("Snapshot");
  const payload = JSON.stringify({
    scope: scope || "HEAD",
    focus,
    pre_flight: preFlight,
    raw_findings: rawFindings,
    findings,
    skipped,
  });
  await agent(
    anchor(
      `あなたは audit の snapshot 段階だ。この run の JSON 記録を ` +
        `"$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).json" に書け (先に mkdir -p でディレクトリを作る)。` +
        `この payload を起点に、シェルで解決する 3 フィールドを足せ。$CLAUDE_SESSION_ID から "session"、` +
        `\`git rev-parse --abbrev-ref HEAD\` から "branch"、\`date -u +%Y-%m-%dT%H:%M:%SZ\` から "generated_at"。` +
        `さらに "delta" を足せ。この run の raw_findings を同ディレクトリの直近の audit-*.json と比較し ` +
        `(file + message でマッチ)、{ resolved, new, carried } を件数で記録する。prior snapshot が無ければ 0 とし "first run" と注記する。` +
        `コードを review したり finding を変更したりするな。Payload:\n${payload}`,
    ),
    {
      agentType: "general-purpose",
      phase: "Snapshot",
      label: "snapshot",
      model: "sonnet",
    },
  );
};

// /audit の routing 表を移植し言語別に分けたもの。react-pattern は JSX ファイル (jsx / tsx) を
// 対象とし、純 js の audit で空振りしない。保証でなく heuristic。JSX なしで書かれた React は
// react-pattern を失う。キーは下の classify() の規則で各ファイルとマッチし、ファイルは最初に
// マッチした行を取る。型の機械的チェック (any / アサーション / strict モード) は gates の
// リンタが担い、reviewer は持たない。
const ROUTING = {
  "*.sh": ["security", "silence", "duplication", "reuse", "efficiency", "operations", "resilience"],
  "*.js": [
    "security",
    "silence",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "testability",
    "operations",
    "resilience",
  ],
  "*.ts": [
    "security",
    "silence",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "testability",
    "operations",
    "resilience",
  ],
  "*.jsx": [
    "security",
    "silence",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "react-pattern",
    "testability",
    "operations",
    "resilience",
    "accessibility",
    "progressive",
  ],
  "*.tsx": [
    "security",
    "silence",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "react-pattern",
    "testability",
    "operations",
    "resilience",
    "accessibility",
    "progressive",
  ],
  "*.rs": [
    "security",
    "silence",
    "rust",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "testability",
    "operations",
    "resilience",
  ],
  "*.py": [
    "security",
    "silence",
    "duplication",
    "reuse",
    "efficiency",
    "design",
    "testability",
    "operations",
    "resilience",
  ],
  "*.md": ["prompt"],
  "*.css,*.html": ["accessibility", "progressive", "duplication"],
  test: ["coverage", "testability"],
  default: ["duplication", "reuse", "efficiency"],
};

// /audit の focus フィルタ。最終的なファイルごとの集合 = routed reviewer と focus 集合の積。
const FOCUS = {
  security: ["security", "silence"],
  performance: ["react-pattern", "efficiency", "progressive"],
  quality: [
    "readability",
    "design",
    "react-pattern",
    "rust",
    "causation",
    "resilience",
    "duplication",
    "reuse",
    "testability",
    "operations",
    "prompt",
    "silence",
  ],
  a11y: ["accessibility", "progressive"],
  all: null,
};

const ext = (p) => {
  const base = p.slice(p.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot).toLowerCase() : "";
};
const classify = (p) => {
  if (/(^|\/|\.)test\./.test(p)) return ROUTING.test;
  const e = ext(p);
  if (e === ".sh") return ROUTING["*.sh"];
  if (e === ".js") return ROUTING["*.js"];
  if (e === ".ts") return ROUTING["*.ts"];
  if (e === ".jsx") return ROUTING["*.jsx"];
  if (e === ".tsx") return ROUTING["*.tsx"];
  if (e === ".rs") return ROUTING["*.rs"];
  if (e === ".py") return ROUTING["*.py"];
  if (e === ".md") return ROUTING["*.md"];
  if (e === ".yaml" || e === ".yml" || e === ".json") return ROUTING["*.yaml,*.json"];
  if (e === ".css" || e === ".html") return ROUTING["*.css,*.html"];
  return ROUTING.default;
};

const FINDINGS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "line", "severity", "summary"],
        properties: {
          file: { type: "string" },
          line: { type: "string" },
          severity: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
          summary: { type: "string" },
        },
      },
    },
  },
};

const ROUTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["files"],
  properties: {
    files: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "churn"],
        properties: {
          path: { type: "string", description: "repo-relative path" },
          churn: {
            type: "integer",
            description: "count of fix commits touching this file",
          },
        },
      },
    },
  },
};

const PREFLIGHT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ran"],
  properties: {
    ran: {
      type: "boolean",
      description: "true if a test command was found and executed",
    },
    runner: { type: "string", description: "detected task runner, or empty" },
    command: { type: "string", description: "test command run, or empty" },
    tests_passed: { type: "integer" },
    tests_failed: { type: "integer" },
    exit_code: { type: "integer" },
    note: {
      type: "string",
      description: "one line: skip reason, timeout, or summary",
    },
  },
};

// ---- Pre-flight ∥ Route。独立した 2 段、barrier は 1 つ ----
// Pre-flight は test suite を回す (test I/O)。Route は変更ファイル + churn を列挙する
// (git I/O)。両者はデータを共有しないため、並行に走らせても直列和でなく
// max(preflight, route) のコストで済む。素の phase() は parallel() 下で race するので、各
// thunk は opts.phase で自分の group を名指す。
const scopeInstr = scope
  ? `Scope は "${scope}"。ファイル一覧は \`git diff --name-only ${scope}\` を実行する。`
  : `Scope が無い。staged + modified のファイルを列挙する。\`git diff --name-only HEAD\` と \`git diff --name-only --staged\` の和集合。`;
const [preFlightRaw, route] = await parallel([
  // Pre-flight。設計上 tests-only。静的解析は gates hook の担当 (ここで linter を回すと重複し、
  // /audit skill が禁じる挙動を発明することになる)。test の失敗は context として記録するが
  // block せず、finding にもしない。呼び出し側が既に test を green まで回した場合 (build の
  // Code phase) は skip し、nested run で suite を再実行しない。
  async () => {
    if (skipPreflight) return { ran: false, note: "呼び出し側により skip" };
    const pf = (await agent(
      anchor(
        `あなたは audit の pre-flight 段階だ。プロジェクトの task runner を検出せよ (package.json -> npm/yarn/pnpm/bun、Cargo.toml -> cargo、pyproject.toml -> poetry/uv、Makefile -> make、Taskfile.yml -> task)。その test script を見つけ (test, test:unit, test:ci, spec の順に試す。無ければ vitest/jest/pytest/cargo test を \`command -v\` で探す)、60 秒の timeout で 1 度だけ実行せよ。pass/fail の件数と exit code を記録する。非ゼロ exit や timeout は記録するが block しない。何も修正せず、コードを review もするな。runner か test script が見つからなければ、理由を note に入れて ran=false を返せ。`,
      ),
      {
        agentType: "general-purpose",
        phase: "Pre-flight",
        label: "pre-flight",
        model: "sonnet",
        schema: PREFLIGHT_SCHEMA,
      },
    )) || { ran: false, note: "pre-flight agent が出力を返さなかった" };
    log(
      pf.ran
        ? `Pre-flight: ${pf.command} -> pass ${pf.tests_passed || 0}, fail ${pf.tests_failed || 0} (exit ${pf.exit_code})。`
        : `Pre-flight skip: ${pf.note}`,
    );
    return pf;
  },
  // Route。変更ファイル + churn を列挙し、下の JS で reviewer にマッピングする。
  () =>
    agent(
      anchor(
        `あなたは audit の routing 段階だ。${scopeInstr}\n` +
          `各ファイルについて、過去に触れた fix commit の数を数えよ。\`git log --grep=fix --oneline -- <file>\` の行数を churn として読む (0 でも良い。そのファイルは残す)。全ファイルを churn 付きで返せ。何も review するな。この段階はファイルを列挙するだけだ。`,
      ),
      { label: "route", phase: "Route", schema: ROUTE_SCHEMA },
    ),
]);
const preFlight = preFlightRaw || {
  ran: false,
  note: "pre-flight 段階が失敗",
};

const files = ((route && route.files) || []).filter((f) => f.path);
if (!files.length) {
  return {
    findings: [],
    skipped: [],
    why: "指定 scope に audit 対象ファイルが無い。",
  };
}

// 決定論的 routing。reviewer -> 割り当てファイル、その後 focus フィルタ。
const focusSet = FOCUS[focus] === undefined ? null : FOCUS[focus];
const assign = {};
for (const f of files) {
  for (const r of classify(f.path)) {
    if (focusSet && !focusSet.includes(r)) continue;
    (assign[r] = assign[r] || []).push(f.path);
  }
}
const assignments = Object.entries(assign).map(([reviewer, fs]) => ({
  reviewer,
  files: fs,
}));

// ファイル数ポリシー。対話版の /audit は 30 ファイルを超えると scope を絞る prompt を出す。
// headless には prompt が無いので、大きく warn して継続する (ポリシーの決定論的な半分は下の
// batch-split で、per-agent 負荷を有界化する)。--no-limit / 明示的な scope は warn を抑止する。
if (files.length > 30 && !scope && !noLimit) {
  log(
    `ファイル数ポリシー。${files.length} ファイルが soft limit の 30 を超え、scope も無い。headless で継続する (narrow-scope の prompt は無い)。warn を消すには scope か noLimit を渡す。`,
  );
}

// Batch-split。各 agent を 10 ファイルに上限を設け、割り当ての広い reviewer が 1 つの過負荷な
// 呼び出しでなく複数の有界な unit に fan-out するようにする。unit は reviewer ラベルを持ち、
// parallel 結果が flatten された後も skip と raw_findings を帰属可能に保つ。
const BATCH = 10;
const units = [];
for (const a of assignments) {
  if (a.files.length <= BATCH) {
    units.push({ reviewer: a.reviewer, files: a.files, label: a.reviewer });
  } else {
    for (let i = 0; i < a.files.length; i += BATCH) {
      units.push({
        reviewer: a.reviewer,
        files: a.files.slice(i, i + BATCH),
        label: `${a.reviewer}#${i / BATCH + 1}`,
      });
    }
  }
}
const churnMap = files
  .slice()
  .sort((a, b) => b.churn - a.churn)
  .map((f) => `${f.path}: ${f.churn}`)
  .join("\n");
log(
  `${files.length} ファイルを ${assignments.length} reviewer / ${units.length} unit に routing [focus=${focus}]: ${assignments
    .map((a) => a.reviewer)
    .join(", ")}`,
);

// ---- Review。routing された全 reviewer が並行に、sonnet で発火する ----
phase("Review");
const RELIABILITY =
  "advisor tool を呼ぶな。自分の解析だけで autonomous に進めよ。8 分以内に完了せよ。finding に確信が持てなければ、skip せず含めよ (false positive は challenger が刈る)。scope が複数ファイルに跨るときは high-churn の path を追い、最初のファイルで budget を使い切るな。";
const raw = await parallel(
  units.map(
    (u) => () =>
      agent(
        anchor(
          `reviewer-${u.reviewer}。diff からこれらのファイルを review せよ: ${u.files.join(", ")}。` +
            `review は \`git diff ${scope || "HEAD"}\` のそれらの path に基づけ。全 finding に file:line が要る。severity 付きで finding を返せ。\n` +
            `Churn (fix-commit の数。高 = 壊れやすい):\n${churnMap}\n\n${RELIABILITY}`,
        ),
        {
          agentType: `reviewer-${u.reviewer}`,
          phase: "Review",
          label: u.label,
          model: "sonnet",
          schema: FINDINGS_SCHEMA,
        },
      ),
  ),
);
const findings = raw.filter(Boolean).flatMap((r) => r.findings || []);
// raw_findings は snapshot のために reviewer ごとの帰属を保つ。上の flatten がどの unit が何を
// 生んだかを落とす前に取得する。
const rawFindings = [];
units.forEach((u, i) => {
  const res = raw[i];
  if (res && res.findings) {
    for (const f of res.findings) {
      rawFindings.push({
        id: `R-${rawFindings.length + 1}`,
        reviewer: u.reviewer,
        file: f.file,
        line: f.line,
        severity: f.severity,
        message: f.summary,
      });
    }
  }
});
// skip の集計は unit ごとで、reviewer ごとではない。複数 unit に分かれた reviewer は 1 unit が
// stall しても兄弟が返ることがある。skip を reviewer で key にすると、生き残ったどれかの unit
// から "produced" が立ち、stall した unit が review しなかったファイルを隠す。失敗した各 unit を
// ファイル付きで記録し、未 review の gap を snapshot で可視に保つ。
const skipped = units
  .filter((_, i) => !raw[i])
  .map((u) => ({
    reviewer: u.reviewer,
    label: u.label,
    files: u.files,
    reason: "出力なし / stall",
  }));

if (!findings.length) {
  await writeSnapshot({ preFlight, rawFindings, findings: [], skipped });
  return { findings: [], assignments, skipped };
}

// ---- Challenge ∥ Verify -> Integrate (reviewer -> aggregate は禁止) ----
// Challenge と Verify は同じ findings に対する独立した pass で、file:line を key にするため
// 並行に走る。従来の直列では verify は survivor しか見なかった。全集合で走らせると verify の
// コストは prune 率に比例するが、その率が低いうちは許容できる。Integrate は直列の membership を
// 正確に再現する固定規則で reconcile する (その prompt を参照)。よってこれは品質差ゼロの
// latency 改善。素の phase() は parallel() 下で race する。各 thunk は opts.phase で group を
// 名指す。
const findingsJson = JSON.stringify(findings);
const [challenged, verified] = await parallel([
  () =>
    agent(
      anchor(
        `critic-audit。これらの finding を challenge し false positive を刈れ。各 finding は事実でなく、論証されるべき position だ。各 finding は file:line で参照せよ。Findings:\n${findingsJson}`,
      ),
      { agentType: "critic-audit", phase: "Challenge", label: "challenge" },
    ),
  () =>
    agent(
      anchor(
        `critic-evidence。具体的な実行経路を辿って (直感でなく positive evidence) これらの finding を検証せよ。各 finding を file:line で参照し、実行経路の evidence と severity を与えよ。Findings:\n${findingsJson}`,
      ),
      { agentType: "critic-evidence", phase: "Verify", label: "verify" },
    ),
]);

phase("Integrate");
const integrated = await agent(
  anchor(
    `team-integration。同じ findings に対する 2 つの独立した pass を file:line でマッチさせ、cross-domain の root cause と severity 順のリストに reconcile せよ。\n` +
      `Membership 規則。どの finding が生き残るかは challenge pass が決める。challenge pass が false positive として刈った finding は、verification pass がその evidence を見つけても刈られたまま。verification pass は survivor に実行経路の evidence と severity を与えるだけで、刈られた finding を復活させない。\n` +
      `Challenge pass (membership / false-positive の刈り込み):\n${challenged}\n\n` +
      `Verification pass (実行経路の evidence + severity):\n${verified}`,
  ),
  {
    agentType: "team-integration",
    phase: "Integrate",
    label: "integrate",
    schema: FINDINGS_SCHEMA,
  },
);

const finalFindings = (integrated && integrated.findings) || findings;
await writeSnapshot({
  preFlight,
  rawFindings,
  findings: finalFindings,
  skipped,
});
return { findings: finalFindings, assignments, skipped };

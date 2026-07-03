export const meta = {
  name: "polish",
  description:
    'Codex review + cleanup を決定論的に行う workflow。Codex の findings は critic-audit の challenge を必ず通り、triage (confirmed / disputed / downgraded / needs_context) は script が判定するため、fact 扱いの集約や challenge の skip が起きない。単体でも、build から workflow("polish") 経由の入れ子でも呼べる。',
  whenToUse:
    "diff の外部レンズ review と AI slop 除去を headless に行う。args は scope 文字列、または {scope, repo, mode}。mode: full (既定) は review -> fix -> cleanup、review は challenge 済み findings を返すだけ (fix しない)、cleanup は simplify + enhancer-code + テスト検証のみ。内部 reviewer の深い audit は audit workflow を使う。",
  phases: [{ title: "Review" }, { title: "Challenge" }, { title: "Fix" }, { title: "Cleanup" }],
};

// /polish skill の flatten。triage 表を script に置くのは、agent に verdict の解釈を任せると
// disputed を「念のため修正」したり needs_context を黙って落としたりする drift が入るため。
// mode を持つのは build との合成のため。build は audit と並走させたい review (読み取りのみ) と、
// fix 統合後に走らせたい cleanup を別のタイミングで呼ぶ。

const opts = (() => {
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // JSON でない文字列は scope の短縮記法
    }
    return { scope: args };
  }
  return args && typeof args === "object" ? args : {};
})();
const scope = typeof opts.scope === "string" ? opts.scope : "";
const repo = typeof opts.repo === "string" ? opts.repo : "";
const mode = opts.mode === "review" || opts.mode === "cleanup" ? opts.mode : "full";

const anchor = (p) =>
  repo
    ? `git / ファイル / ビルドのコマンドはすべて ${repo} の repository から実行する (各シェルコマンドを \`cd ${repo} && \` で始める)。\n\n${p}`
    : p;
const scopeNote = scope
  ? `対象 scope は ${scope}。scope 外のファイルに触れる fix は落とす。`
  : "対象は git diff HEAD (staged + unstaged)。diff 外のファイルに触れる fix は落とす。";

const CODEX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["available", "has_changes", "findings"],
  properties: {
    available: { type: "boolean", description: "codex CLI が使えたか" },
    has_changes: { type: "boolean", description: "diff に polish 対象の変更があるか" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "detail", "severity"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          file: { type: "string" },
          severity: { type: "string", enum: ["P1", "P2", "P3"] },
        },
      },
    },
    notes: { type: "string" },
  },
};

const VERDICTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdicts"],
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "verdict"],
        properties: {
          id: { type: "string" },
          verdict: {
            type: "string",
            enum: ["confirmed", "disputed", "downgraded", "needs_context"],
          },
          severity: { type: "string", enum: ["P1", "P2", "P3"] },
          why: { type: "string" },
        },
      },
    },
  },
};

const FIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fixed", "stashed", "tests_pass"],
  properties: {
    fixed: { type: "array", items: { type: "string" } },
    stashed: {
      type: "array",
      items: { type: "string" },
      description: "テストを壊したため git stash で巻き戻した fix",
    },
    tests_pass: { type: "boolean" },
    notes: { type: "string" },
  },
};

const CLEANUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["edits", "tests_pass", "stashed"],
  properties: {
    edits: { type: "array", items: { type: "string" }, description: "file:line 付きの編集要約" },
    tests_pass: { type: "boolean" },
    stashed: { type: "boolean", description: "テスト失敗で cleanup 編集を巻き戻したか" },
    notes: { type: "string" },
  },
};

let codex = { available: false, has_changes: true, findings: [] };
let verdicts = [];
let survivors = [];
let needsContext = [];
let fix = null;

if (mode !== "cleanup") {
  // ---- Review: 外部 Codex レンズ ----
  phase("Review");
  codex = (await agent(
    anchor(
      `外部 Codex review stage。まず \`git status\` と \`git diff HEAD\` で polish 対象の変更が存在するか確認する。無ければ has_changes: false で返す。\n` +
        `次に \`which codex\` を確認する。無ければ available: false、findings 空で返す。\n` +
        `あれば \`codex review "Review for logic, architecture, data flow, and code simplicity (flag over-complexity and unnecessary indirection)"\` を実行する。` +
        `codex 0.141.0 では scope flag (--uncommitted / --base / --commit) と PROMPT 引数が排他なので、simplicity レンズの PROMPT を渡すときは scope flag を付けない (Codex 自身が git status を読む)。PROMPT を省くと simplicity レンズが落ちるため必ず渡す。\n` +
        `出力を findings に構造化する。id は F1, F2, ... と振り、severity は Codex の P1/P2/P3 を写す (無ければ影響度から判定する)。${scopeNote}`,
    ),
    { label: "codex", phase: "Review", agentType: "general-purpose", schema: CODEX_SCHEMA },
  )) || { available: false, has_changes: true, findings: [] };
  if (!codex.has_changes) {
    return { mode, polished: false, why: "diff に変更が無く polish 対象なし" };
  }
  log(
    codex.available
      ? `Codex findings ${codex.findings.length} 件。`
      : "codex CLI なし。findings なしで cleanup へ。",
  );

  // ---- Challenge: critic-audit による false positive 除去 ----
  if (codex.findings.length) {
    phase("Challenge");
    const challenged = await agent(
      anchor(
        `critic-audit。外部 Codex review の findings 一式を adversarial に challenge し、finding ごとに verdict を返す。\n` +
          `verdict の基準: confirmed = 実在し severity も妥当 / disputed = false positive / downgraded = 実在するが severity 過大 (下げた severity を severity に入れる) / needs_context = コードだけでは判定できず人間の文脈が要る。\n` +
          `Findings:\n${JSON.stringify(codex.findings)}`,
      ),
      {
        agentType: "critic-audit",
        phase: "Challenge",
        label: "challenge",
        schema: VERDICTS_SCHEMA,
      },
    );
    // challenge が落ちたら全 findings を confirmed 扱いで前進する (skill の Error Handling と同じ)
    verdicts = challenged
      ? challenged.verdicts
      : codex.findings.map((f) => ({ id: f.id, verdict: "confirmed", severity: f.severity }));

    // triage は script が決定論的に行う。confirmed / downgraded が fix 候補、disputed は落とす、
    // needs_context は呼び出し元に表面化する。fix 候補は P1/P2 のみ (P3 は cleanup 領分)。
    const byId = new Map(codex.findings.map((f) => [f.id, f]));
    for (const v of verdicts) {
      const f = byId.get(v.id);
      if (!f) continue;
      if (v.verdict === "needs_context") {
        needsContext.push({ ...f, why: v.why || "" });
        continue;
      }
      if (v.verdict === "disputed") continue;
      const severity = v.verdict === "downgraded" && v.severity ? v.severity : f.severity;
      if (severity === "P1" || severity === "P2") survivors.push({ ...f, severity });
    }
    log(
      `triage: 生存 ${survivors.length} / needs_context ${needsContext.length} / 棄却 ${codex.findings.length - survivors.length - needsContext.length}`,
    );
  }

  if (mode === "review") {
    return { mode, codex_available: codex.available, survivors, needs_context: needsContext };
  }

  // ---- Fix: 生存 findings の修正 ----
  if (survivors.length) {
    phase("Fix");
    fix = await agent(
      anchor(
        `challenge を生き残った findings を severity の高い順に修正する。${scopeNote}\n` +
          `修正後にプロジェクトのテストコマンドを検出して実行し、テストを壊した fix は git stash で巻き戻す。commit しない。\n` +
          `Findings:\n${JSON.stringify(survivors)}`,
      ),
      { label: "fix", phase: "Fix", agentType: "general-purpose", schema: FIX_SCHEMA },
    );
  }
}

// ---- Cleanup: simplify -> enhancer-code -> テスト検証 ----
// どちらも bug 探しではないので critic-audit challenge を通さず直接適用する (skill Phase 3 と同じ)。
phase("Cleanup");
await agent(
  anchor(
    `Skill tool で skill "simplify" を呼び、現在の diff に cleanup 専用パス (reuse / simplification / efficiency / altitude) を適用する。引数なしで拒否されたら diff の scope を渡す。commit しない。`,
  ),
  { label: "simplify", phase: "Cleanup", agentType: "general-purpose" },
);
await agent(
  anchor(
    `現在の diff から AI slop を除去し simplification ルールを適用し、テストを監査する。simplify の編集より preservation ルール (迷ったら残す) を優先する。`,
  ),
  { agentType: "enhancer-code", phase: "Cleanup", label: "enhancer" },
);
const cleanup = (await agent(
  anchor(
    `プロジェクトのテストコマンドを検出して実行する。失敗したら cleanup の編集 (直前の simplify / enhancer-code による変更) を git stash で巻き戻し、stashed: true で報告する。適用された編集の要約を file:line 付きで edits に列挙する。commit しない。`,
  ),
  { label: "validate", phase: "Cleanup", agentType: "general-purpose", schema: CLEANUP_SCHEMA },
)) || {
  edits: [],
  tests_pass: false,
  stashed: false,
  notes: "validate agent が結果を返さなかった",
};

return {
  mode,
  codex_available: codex.available,
  findings: codex.findings.length,
  survivors: survivors.length,
  fixed: fix ? fix.fixed : [],
  stashed_fixes: fix ? fix.stashed : [],
  needs_context: needsContext,
  cleanup,
};

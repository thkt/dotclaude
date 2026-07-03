export const meta = {
  name: "challenge",
  description:
    '提案への GO / NO-GO 判定を決定論的に行うワークフロー。前提検証 → critic-design の 2 並列攻撃 → verdict 統合が script のステージとして必ず発火し、メインループの裁量で攻撃が skip されない。単体でも、build から workflow("challenge") 経由の入れ子でも呼べる。',
  whenToUse:
    "headless に提案を検証したいとき。対話の壁打ちは /challenge skill を使い、このワークフローは、未確定の選択を assumptions フィールドに記録したうえで進行する。ただし不可逆な未確定の選択が 1 件以上、または未確定の選択が 7 件を超えると script が NO-GO に降格して人間に差し戻す。args は提案の説明文字列、または {task, repo}。",
  phases: [{ title: "Premise" }, { title: "Attack" }, { title: "Verdict" }],
};

const task = typeof args === "string" ? args : (args && (args.task || args.proposal)) || "";
if (!task) {
  return {
    stopped: "no-task",
    why: "挑戦対象を args (string または {task}) で渡す。",
  };
}

const repo = typeof args === "object" && args && typeof args.repo === "string" ? args.repo : "";
// cd 複合コマンドは critic-design の Bash(git:*) 等の tool 制約に一致しないため、git -C とパス引数で repository を固定する。
const anchor = (p) =>
  repo
    ? `git / ファイル / ビルドのコマンドはすべて ${repo} の repository を対象に実行する (git は \`git -C ${repo}\`、検索やファイル操作はパス引数で ${repo} 配下を指定する。\`cd\` は使わない)。\n\n${p}`
    : p;

// critic-design のアウトプット定義 (agents/critics/critic-design.md) と同じ粒度で受ける。
const CRITIQUE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "weaknesses"],
  properties: {
    verdict: {
      type: "string",
      enum: ["confirmed", "weakened", "needs_revision"],
    },
    weaknesses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["viewpoint", "severity", "finding", "evidence", "disconfirming_probe"],
        properties: {
          viewpoint: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          finding: { type: "string" },
          evidence: { type: "string", description: "file:line または検索結果" },
          disconfirming_probe: {
            type: "string",
            description: "claim stands / weakened / skipped (budget)",
          },
        },
      },
    },
  },
};

const VERDICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "why", "decisions", "assumptions", "weaknesses", "actions"],
  properties: {
    verdict: { type: "string", enum: ["GO", "NO-GO"] },
    why: { type: "string" },
    decisions: { type: "array", items: { type: "string" } },
    tradeoffs: { type: "array", items: { type: "string" } },
    assumptions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "irreversible", "basis"],
        properties: {
          text: { type: "string" },
          irreversible: {
            type: "boolean",
            description:
              "覆すと実装済み作業の破棄・外部への公開・データ移行のいずれかを伴うなら true",
          },
          basis: {
            type: "string",
            description: "irreversible 判定の根拠 1 行",
          },
        },
      },
      description: "best-guess で前進した未確定の選択。ユーザーの拒否対象",
    },
    weaknesses: {
      type: "array",
      items: { type: "string" },
      description: "GO を覆さないが実在する弱点。呼び出し元の issue 化候補",
    },
    actions: {
      type: "array",
      items: { type: "string" },
      description: "keep / remove / revise の具体アクション上位 3 件",
    },
  },
};

// ---- Premise: 事実検証と fact / preference の仕分け ----
phase("Premise");
const premise = await agent(
  anchor(`autonomous challenge の premise 検証ステージ。挑戦対象: "${task}"\n`) +
    `.claude/OUTCOME.md があれば読み、done state / non-goals / constraints をアウトカム軸とする。` +
    `対象に含まれる open question を列挙し、fact（証拠が一意に決める問い）と preference（選択を要する問い）に仕分ける。` +
    `fact はコードベースと git 履歴に当たってこの場で検証する。preference を fact として扱わない。\n` +
    `アプローチの一行要約、確定した architectural decision、trade-off、本来ユーザーに問うべき未確定の選択（assumption として記録される）を最終テキストで報告する。` +
    `各未確定の選択には後戻りのしやすさを添える（best-guess で進めた後に覆すと、実装済み作業の破棄・外部への公開・データ移行のいずれかを伴うか）。`,
  { agentType: "general-purpose", label: "premise", phase: "Premise" },
);

// ---- Attack: critic-design 2 並列 (internal / outcome) ----
phase("Attack");
const critiques = await parallel([
  () =>
    agent(
      anchor(
        `この premise を、その前提自身の論理に沿って攻撃し、隠れた弱点と失敗パターンを洗い出す。Premise:\n${premise}`,
      ),
      {
        agentType: "critic-design",
        phase: "Attack",
        label: "attack:internal",
        schema: CRITIQUE_SCHEMA,
      },
    ),
  () =>
    agent(
      anchor(
        `.claude/OUTCOME.md を読み、この premise がアウトカムに到達するかを検証する。outcome fit、non-goal からの逸脱、constraint 違反を確認する。Premise:\n${premise}`,
      ),
      {
        agentType: "critic-design",
        phase: "Attack",
        label: "attack:outcome",
        schema: CRITIQUE_SCHEMA,
      },
    ),
]);
const attacks = critiques.filter(Boolean);

// ---- Verdict: GO / NO-GO 統合 ----
phase("Verdict");
const verdict = await agent(
  `前提と critic-design による攻撃 ${attacks.length} 件を、自律実行向けの単一の GO / NO-GO 判定に統合する。\n` +
    `Premise:\n${premise}\n\n攻撃結果:\n${JSON.stringify(attacks)}\n\n` +
    `NO-GO とするのは、fact の証拠が core を覆すときのみ（既に成立している状態を目標にしている、または検証済みの fact と矛盾する）。` +
    `それ以外は GO とし、生き残った部分で前進する。未確定の選択は assumptions に列挙し、` +
    `各件に irreversible と basis を付ける。不可逆性の判定は script gate の入力になるため、迷ったら true 側に倒す。` +
    `GO を覆さないが実在する弱点は weaknesses に残す（呼び出し元が issue 化するか判断する）。` +
    `keep / remove / revise の具体アクション上位 3 件を actions に入れる。`,
  {
    agentType: "general-purpose",
    label: "verdict",
    phase: "Verdict",
    schema: VERDICT_SCHEMA,
  },
);

// ---- Gate: script 強制の残余 gate ----
// LLM の自己申告を gate に使わない。script は GO を NO-GO に降格できるが、昇格はできない。
// 不備な task への NO-GO は望ましい動作であり、完走率を上げる目的で閾値を緩めない。
const GATE_MAX_ASSUMPTIONS = 7;
const assumptions = verdict.assumptions || [];
const irreversibles = assumptions.filter((a) => a && a.irreversible);
let gate = null;
if (verdict.verdict === "GO" && irreversibles.length > 0) {
  gate = {
    rule: "irreversible-assumption",
    detail: irreversibles.map((a) => a.text),
    why:
      `不可逆な未確定の選択が ${irreversibles.length} 件ある。` +
      `best-guess で進めると、後から PR で却下しても取り戻せない。` +
      `対話（/challenge skill）で確定させるか、task の指定で決めてから再実行する。`,
  };
} else if (verdict.verdict === "GO" && assumptions.length > GATE_MAX_ASSUMPTIONS) {
  gate = {
    rule: "underspecified",
    detail: assumptions.map((a) => a.text),
    why:
      `未確定の選択 ${assumptions.length} 件は上限 ${GATE_MAX_ASSUMPTIONS} を超え、task が自律実行に足るほど具体化されていない。` +
      `task の指定を具体化してから再実行する。`,
  };
}
if (gate) {
  gate.llm_verdict = verdict.verdict;
  verdict.verdict = "NO-GO";
  verdict.why = `${gate.why} (LLM verdict は GO、script gate ${gate.rule} が降格)`;
}

log(
  verdict.verdict === "NO-GO"
    ? `NO-GO。${verdict.why}`
    : `GO。未確定の選択 ${assumptions.length} 件 (不可逆 0 件) を best-guess で前進、弱点 ${verdict.weaknesses.length} 件を記録。`,
);

return { ...verdict, gate };

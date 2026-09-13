// focus: "security" のとき reviewer は security -> silence の順で起動し (audit.js の
// ROUTING["*.js"] / FOCUS 絞り込み)、rawFindings の id は R-1 (security) / R-2 (silence)
// に固定される。各 test ファイルの assert はこの採番を前提に書かれている。

const DEFAULT_ROUTE = { files: [{ path: "sample.js", churn: 0 }] };
const DEFAULT_SECURITY = {
  findings: [{ file: "sample.js", line: "1", severity: "high", summary: "security finding" }],
};
const DEFAULT_SILENCE = {
  findings: [{ file: "sample.js", line: "1", severity: "high", summary: "silence finding" }],
};
const DEFAULT_VERIFY = "verify pass output";

// opt にキーを渡すことで既定応答を上書きできる。デフォルト引数 (opt.foo ?? default) は値が
// undefined のときも発動してしまい「キーを渡さなかった」と「undefined を明示的に渡した」を
// 区別できないため、`"key" in opt` でキーの有無を見て既定を分ける。Rows are [predicate on
// label, responder], tried in order and the first match wins, mirroring
// workflows/build/tests/build.behavior.test.js's KIND_RULES.
export const defaultAgentStub = (opt = {}) => {
  const rules = [
    [(label) => label === "route", () => ("route" in opt ? opt.route : DEFAULT_ROUTE)],
    [(label) => label === "security", () => ("security" in opt ? opt.security : DEFAULT_SECURITY)],
    [(label) => label === "silence", () => ("silence" in opt ? opt.silence : DEFAULT_SILENCE)],
    [(label) => label === "challenge", () => opt.challenge],
    [(label) => label === "verify", () => ("verify" in opt ? opt.verify : DEFAULT_VERIFY)],
    [(label) => label === "integrate", () => opt.integrate],
    [(label) => label === "snapshot", () => opt.snapshot],
  ];
  return (prompt, opts) => {
    const label = opts && opts.label;
    const rule = rules.find(([matches]) => matches(label));
    return rule ? rule[1]() : undefined;
  };
};

export const callOf = (calls, label) => calls.agent.find((c) => c.opts && c.opts.label === label);

const FENCE_BEGIN_RE = /^----- BEGIN ([A-Z0-9_ ]+) ([A-Za-z0-9]+) -----$/m;

// 対応する nonce の END が無ければ null を返す。fence が閉じられなかったことと、
// fence がそもそも無いことを、呼び出し側は同じ null として扱う。snapshotPayload 以外に
// も、fence 構造自体 (label / nonce の一致) を確かめるテストが直接この関数を呼ぶため
// export する。
export const extractFenced = (prompt) => {
  const begin = prompt.match(FENCE_BEGIN_RE);
  if (!begin) return null;
  const [, label, nonce] = begin;
  const endRe = new RegExp(
    `^----- BEGIN ${label} ${nonce} -----\\n([\\s\\S]*?)\\n----- END ${label} ${nonce} -----$`,
    "m",
  );
  const body = prompt.match(endRe);
  return body ? { label, nonce, content: body[1] } : null;
};

// payload の埋め込み形式は audit.js の writeSnapshot と fenced が決める。
export const snapshotPayload = (calls) => {
  const call = callOf(calls, "snapshot");
  if (!call) return null;
  const fenced = extractFenced(call.prompt);
  if (!fenced) return null;
  return JSON.parse(fenced.content);
};

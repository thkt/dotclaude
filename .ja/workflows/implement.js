export const meta = {
  name: "implement",
  description:
    "Codex の orchestrator.ts と同じ流れで、合意済み Issue を隔離 worktree 上に 1 回の実装パスで実装し、撮影・check・独立レビュー・修正のループを accepted まで回したあと、1 つの commit にまとめて push し、draft PR を作って同じ head の CI を待つ。check と撮影の合否は終了コードで、媒体は形式を検査してから取り込み、レビューの受理は finding ID ごとの更新を script が検査して算出するので、自己申告の合格や過去指摘の取りこぼしは通らない。最初の書き込みの前に Issue・accepted の tree・実行ユーザー・push 先を script が照合し直し、書き込みのたびに結果を読み戻す。書き込みを再試行せず、PR を ready にもしない。修正ループに回数上限は無く、要求の変更・対象の変更・不正な応答・人の判断待ちで止まる。公開を切ったときは verified_local で終わる。",
  whenToUse:
    "/scoping で合意した Issue を、Codex の implement と同じ流れで headless に実装し、draft PR まで進めたいとき。この workflow が公開した PR を、人が採用した修正依頼で直すときも使える。そのときは PR の URL と修正依頼を渡し、PR は新しく作らず本文を作り直す。実装を伴わない既存差分のレビューは polish か audit を使う。対象の Issue 番号と対象リポジトリの絶対パスを渡す。対象リポジトリのルートには Codex の対象契約どおり repository・remote・baseBranch・setup・check・ciChecks・capture を持つ .dotagents.json が要り、capture の {harness} は Codex のハーネス ~/.agents に展開する。check や撮影がローカルの server の socket を開くので、sandbox が有効なセッションでは sandbox.network.allowLocalBinding を true にしてから起動する。既定で draft PR まで公開する。公開を切ると、検証済みの branch と worktree を人に残して終わる。ready への切り替え・公開本文の照合・人のレビューは /implement スキルと人が持つ。",
  phases: [
    { title: "Target" },
    { title: "Prepare" },
    { title: "Implement" },
    { title: "Verify" },
    { title: "Ship" },
    { title: "CI" },
  ],
};

// 流れの正本は ~/.agents/scripts/implement/ の orchestrator.ts・correction.ts・pr-body.ts・ci.ts
// と ~/.agents/scripts/shared/target.ts。実装とレビューは LLM、合否の算出・ID の照合・要求と対象の
// 同一性確認・撮影の要否判定・公開結果の読み戻し・CI の分類は script が持つ。

// harness は object の args を JSON 文字列で渡すことがある。
let argsValue = args;
if (typeof argsValue === "string" && argsValue.trim().startsWith("{")) {
  try {
    const decoded = JSON.parse(argsValue);
    if (decoded && typeof decoded === "object") argsValue = decoded;
  } catch {
    // 壊れた encoding は届いた文字列のまま args に残す
  }
}
const input = typeof argsValue === "object" && argsValue ? argsValue : {};
const issueRef = String(typeof argsValue === "string" ? argsValue : input.issue || "").trim();
// 数字だけ、#数字、Issue URL だけを受ける。数字を含む自由文を Issue 番号と読まない。
const issueNumber =
  (issueRef.match(/^#?(\d+)$/) || issueRef.match(/\/issues\/(\d+)(?:[/?#]|$)/) || [])[1] || "";
const repo = typeof input.repo === "string" ? input.repo.trim() : "";
// Codex の --no-publish にあたる。明示の false だけが公開を切る。
const publishing = input.publish !== false;

const obj = (required, properties) => ({
  type: "object",
  additionalProperties: false,
  required,
  properties,
});
const closed = (properties) => obj(Object.keys(properties), properties);
const str = { type: "string" };
// 空であってはならない文字列。空文字の拒否は schema でなく blankFields が行う。
const text = { type: "string" };
const int = { type: "integer" };
const bool = { type: "boolean" };
const choice = (values) => ({ type: "string", enum: values });
const list = (items) => ({ type: "array", items });

// Issue や設定由来の文字列は shell 構文でなく 1 つの argv 要素として渡す。
const shq = (value) => `'${String(value).replaceAll("'", `'"'"'`)}'`;
const argvLine = (argv) => argv.map(shq).join(" ");
const bundled = (rel) =>
  `"$(P="$HOME/.claude/${rel}"; [ -e "$P" ] || P="$(find "$HOME/.claude/plugins" -path "*/${rel}" -not -path "*/.ja/*" 2>/dev/null | sort -V | tail -1)"; printf %s "$P")"`;
const anchor = (p) =>
  `すべての git・gh・ファイル操作は ${repo} のリポジトリで行う (各 shell コマンドは \`cd ${repo} && \` で始める)。\n\n${p}`;
const parseJsonText = (value) => {
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

// ---- 実行記録: 開始行と終端行を run_id で結ぶ ----
const counts = { check_runs: 0, review_rounds: 0, repairs: 0, captures: 0, ci_rounds: 0 };
let runId = "";
let recordedBranch = "";
// 公開で分かった commit・PR URL・PR 全体の基点・本文の digest。停止した行にも載せ、人が実際の状態を照合する手掛かりにする。
// 後の修正は published_draft 行の commit と base_sha から、公開した head と PR 全体の基点を取る。
const published = { commit: "", url: "", base_sha: "", body_digest: "" };
const RECORD_SCHEMA = closed({ path: str, run_id: str });
const recordRun = async (reason) => {
  const payload = {
    run_id: runId,
    issue: issueNumber,
    repo,
    branch: recordedBranch,
    publish: publishing,
    // 修正した PR の URL。検証前の停止でも行に残すため、入力から直接読む。
    revision:
      input.revision && typeof input.revision.pr === "string" ? input.revision.pr.trim() : "",
    ...published,
    reason,
    ...counts,
  };
  const written = await agent(
    anchor(
      `implement の 1 実行を記録する。値を判断・要約・編集しない。手順は、(1) この JSON をそのまま一時ファイルへ書く。` +
        `(2) \`node ${bundled("workflows/implement/record.ts")} < <tempfile>\` を実行する。` +
        `(3) script の stdout の path と run_id をそのまま返す。\n入力 JSON は次のとおり。\n${JSON.stringify(payload)}`,
    ),
    {
      label: `record:${reason}`,
      agentType: "general-purpose",
      schema: RECORD_SCHEMA,
      model: "haiku",
    },
  );
  const id = String((written && written.run_id) || "").trim();
  // 記録は実行を止めない。書けなかった行は log に残して先へ進む。
  if (!id) {
    log(
      `"${reason}" 行を書けなかった (recorder が run_id を返さなかった)。この実行は implement-runs.jsonl に欠ける。`,
    );
    return;
  }
  runId = id;
};
// 停止はすべてここを通るので、Issue と repo が揃った実行は終端行を必ず持つ。
// 正本は orchestrator.ts の remaining。停止したときも残る作業を返す。公開の段の停止は shipStop が絞り込む。
const REMAINING_AFTER_PR = ["ci", "published_body_check", "mark_ready", "human_review"];
const stop = async (reason, why, fields = {}) => {
  if (repo && issueNumber) await recordRun(reason);
  return {
    stopped: reason,
    why,
    ...counts,
    run_id: runId,
    remaining: ["local_verification", "publication", ...REMAINING_AFTER_PR],
    ...fields,
  };
};

if (!issueNumber) {
  return await stop("no-issue", "Issue 番号か Issue URL を渡す。");
}
if (!repo) {
  return await stop("no-repo", "対象リポジトリを絶対パスで渡す。");
}
// 開始 commit に固定する参照 (調査報告・wiki・判断記録)。正本は input.ts の assertReportReferences と
// research-handoff.ts。参照があれば開始 commit が要り、参照先は docs/research・wiki・decisions の Markdown に限る。
const startCommit = typeof input.startCommit === "string" ? input.startCommit.trim() : "";
const reports = input.reports === undefined ? [] : input.reports;
const COMMIT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const isReportPath = (p) =>
  typeof p === "string" &&
  /^docs\/(?:research|wiki|decisions)\/.+\.md$/.test(p) &&
  !p.split("/").includes("..");
const referenceProblem = () => {
  if (!Array.isArray(reports)) return "参照は {path, blob} の配列で渡す";
  if (startCommit && !COMMIT_ID.test(startCommit)) return "開始 commit は完全な commit ID で渡す";
  if (reports.length && !startCommit) return "参照を渡すときは開始 commit も渡す";
  const bad = reports.find((r) => !r || !isReportPath(r.path) || !COMMIT_ID.test(String(r.blob)));
  if (bad)
    return `参照は docs/research・docs/wiki・docs/decisions の Markdown と確認済みの blob ID にする: ${JSON.stringify(bad)}`;
  const paths = reports.map((r) => r.path);
  return new Set(paths).size === paths.length ? "" : "参照の path が重複している";
};
const referenceIssue = referenceProblem();
if (referenceIssue) {
  return await stop("invalid-reports", referenceIssue);
}
// 既存 PR の修正。正本は revision.ts と README の既存PRの修正。人が採用した指摘・期待する結果・許可範囲を
// 1 つの文章 (request) で受け取り、この workflow が公開した PR だけを対象にする。args は実行中に変わらないので、
// Codex の修正入力ファイルの hash 照合は要らない。
const revising = input.revision !== undefined;
const revisionUrl = revising && input.revision ? String(input.revision.pr || "").trim() : "";
const revisionRequest =
  revising && input.revision ? String(input.revision.request || "").trim() : "";
const revisionPr = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/([1-9]\d*)$/.exec(
  revisionUrl,
);
const revisionProblem = () => {
  if (!revising) return "";
  if (!revisionPr) return "修正する PR は https://github.com/OWNER/REPO/pull/N の URL で渡す";
  if (!revisionRequest) return "採用した指摘・期待する結果・許可範囲を request に書く";
  return publishing ? "" : "既存 PR の修正は本文の更新と CI まで行うので、公開を切れない";
};
const revisionIssue = revisionProblem();
if (revisionIssue) {
  return await stop("invalid-revision", revisionIssue);
}
await recordRun("started");

// ---- Target: Issue・実効ユーザー・repo・未コミット変更・.dotagents.json を照合する ----
phase("Target");
const BRANCH_NAME_SHAPE = /^[\w][\w./-]*$/;
const isArgv = (v) =>
  Array.isArray(v) && v.length > 0 && v.every((a) => typeof a === "string") && v[0].trim() !== "";
const isNameList = (v) =>
  Array.isArray(v) &&
  v.every((n) => typeof n === "string" && n.trim() !== "") &&
  new Set(v).size === v.length;
// destination は worktree 内の相対パスに限る。install-media.ts も同じ条件を実行時に確かめる。
const isRepoRelative = (p) =>
  typeof p === "string" && p.trim() !== "" && !p.startsWith("/") && !p.split("/").includes("..");
const isCapture = (v) =>
  v === null ||
  (Boolean(v) &&
    isArgv(v.command) &&
    isRepoRelative(v.destination) &&
    typeof v.required === "boolean");
// 正本は ~/.agents/scripts/shared/target.ts の assertTarget。setup と check は shell 文字列も受け、
// 文字列は /bin/sh -c に包んで argv にそろえる。
const CONFIG_KEYS = ["repository", "remote", "baseBranch", "setup", "check", "ciChecks", "capture"];
const isShell = (v) => typeof v === "string" && v.trim() !== "";
const CONFIG_RULES = [
  [
    (c) => Object.keys(c).every((key) => CONFIG_KEYS.includes(key)),
    `使える項目は ${CONFIG_KEYS.join("・")} だけ`,
  ],
  [
    (c) => typeof c.repository === "string" && /^[\w.-]+\/[\w.-]+$/.test(c.repository),
    "repository は owner/name にする",
  ],
  [(c) => typeof c.remote === "string" && /^[\w.-]+$/.test(c.remote), "remote は remote 名にする"],
  [
    (c) => typeof c.baseBranch === "string" && BRANCH_NAME_SHAPE.test(c.baseBranch),
    "baseBranch は branch 名にする",
  ],
  [
    (c) => isShell(c.setup) || (Array.isArray(c.setup) && c.setup.every(isArgv)),
    "setup は shell 文字列か argv 配列の配列にする (不要なら [])",
  ],
  [(c) => isShell(c.check) || isArgv(c.check), "check は shell 文字列か空でない argv 配列にする"],
  [(c) => isNameList(c.ciChecks), "ciChecks は重複の無い空でない check 名の配列にする"],
  [
    (c) => "capture" in c && isCapture(c.capture),
    "capture は null か {command, destination, required} にする (媒体が不要なら null)",
  ],
];
const configErrors = (c) =>
  !c || typeof c !== "object" || Array.isArray(c)
    ? [".dotagents.json が JSON object でない"]
    : CONFIG_RULES.filter(([ok]) => !ok(c)).map(([, message]) => message);

// Issue の同一性は、本文の転記でなく gh の出力の sha256 で比べる。転記の 1 文字の揺れを要求の変更と読まないため。
// 正本は orchestrator.ts の Issue 取得。state と updatedAt も含めるので、途中で閉じられた Issue も変更として検出する。
const issueDigestCommand = (repoFlag = "") =>
  `gh issue view ${issueNumber}${repoFlag} --json title,body,state,updatedAt | shasum -a 256 | cut -d ' ' -f 1`;
const DIGEST_SHAPE = /^[0-9a-f]{64}$/;
const TARGET_SCHEMA = closed({
  issue_exit: int,
  issue_json: str,
  issue_digest: str,
  user: str,
  repo_json: str,
  porcelain: str,
  config_found: bool,
  config_text: str,
  remotes: str,
  gh_host: str,
  head_sha: str,
  report_listing: str,
  revision_pr: str,
  revision_body_sha: str,
  revision_row: str,
});
// 修正する PR の照合項目と本文の sha256。本文は agent に書き写させず、gh の出力を shasum に通す。
const prApiPath = revisionPr ? `repos/${revisionPr[1]}/pulls/${revisionPr[2]}` : "";
const PR_FIELDS_JQ =
  "{state, draft, html_url, user: .user.login, head_sha: .head.sha, head_ref: .head.ref, head_repo: .head.repo.full_name, base_ref: .base.ref, base_repo: .base.repo.full_name}";
const prFieldsCommand = argvLine(["gh", "api", prApiPath, "--jq", PR_FIELDS_JQ]);
const prBodyShaCommand = `${argvLine(["gh", "api", prApiPath, "--jq", ".body"])} | shasum -a 256 | cut -d ' ' -f 1`;
const revisionSteps = revising
  ? `\n11. \`${prFieldsCommand}\`: stdout を revision_pr に入れる。\n` +
    `12. \`${prBodyShaCommand}\`: 出力された 64 桁の hex を revision_body_sha に入れる。\n` +
    `13. \`${argvLine(["jq", "-c", "--arg", "url", revisionUrl, 'select(.reason == "published_draft" and .url == $url)'])} "$HOME/.claude/history/implement-runs.jsonl" | tail -1\`: stdout を revision_row に入れる (無ければ空文字)。`
  : `\n11. 既存 PR の修正ではない。revision_pr・revision_body_sha・revision_row は "" にする。`;
// 正本は orchestrator.ts。worktree は checkout のローカル HEAD から切り、設定はその commit の版を読む。
// 検証した設定と実行する版が食い違わないようにするため。
const target = await agent(
  anchor(
    `次のコマンドを実行し、各出力をそのまま返す。要約・整形・判断をしない。\n` +
      `1. \`gh issue view ${issueNumber} --json number,title,body,state,url\`: 終了コードを issue_exit、stdout を issue_json に入れる。\n` +
      `2. \`gh api user --jq .login\`: stdout を user に入れる (失敗したら空文字)。\n` +
      `3. \`gh repo view --json nameWithOwner,defaultBranchRef,viewerPermission\`: stdout を repo_json に入れる (失敗したら空文字)。\n` +
      `4. \`git status --porcelain --untracked-files=all\`: stdout を porcelain に入れる。\n` +
      `5. \`git show HEAD:.dotagents.json\`: 0 で終わったかを config_found に、stdout をそのまま config_text に入れる (失敗したら空文字)。\n` +
      `6. \`${issueDigestCommand()}\`: 出力された 64 桁の hex を issue_digest に入れる (失敗したら空文字)。\n` +
      `7. \`git remote -v\`: stdout を remotes に入れる。\n` +
      `8. \`printenv GH_HOST\`: stdout を gh_host に入れる (未設定なら空文字)。\n` +
      `9. \`git rev-parse HEAD\`: 出力された sha を head_sha に入れる。\n` +
      (reports.length && !revising
        ? `10. \`${argvLine(["git", "ls-tree", "HEAD", "--", ...reports.map((r) => r.path)])}\`: stdout を report_listing に入れる。`
        : `10. ここでは参照を照合しない。report_listing は "" にする。`) +
      revisionSteps,
  ),
  {
    label: "target",
    phase: "Target",
    agentType: "general-purpose",
    schema: TARGET_SCHEMA,
    model: "haiku",
  },
);
if (!target) {
  return await stop("target-unavailable", "対象を照合する agent が結果を返さなかった。");
}
const issue = target.issue_exit === 0 ? parseJsonText(target.issue_json) : null;
const issueDigest = String(target.issue_digest || "").trim();
if (
  !issue ||
  !String(issue.title || "").trim() ||
  !String(issue.body || "").trim() ||
  !DIGEST_SHAPE.test(issueDigest)
) {
  return await stop(
    "issue-unreadable",
    `Issue #${issueNumber} の title と body を読めなかった。Issue と repo を確かめる。`,
  );
}
if (issue.state !== "OPEN") {
  return await stop(
    "issue-not-open",
    `Issue #${issueNumber} は ${issue.state}。合意済みの OPEN な Issue で再実行する。`,
  );
}
const actor = String(target.user || "").trim();
if (!actor) {
  return await stop(
    "no-actor",
    "gh api user が login を返さなかった。ユーザーの gh 認証を直して再実行する。別の主体には切り替えない。",
  );
}
const repoInfo = parseJsonText(target.repo_json);
if (!repoInfo || !repoInfo.nameWithOwner) {
  return await stop("repo-unreadable", "gh repo view で対象 repo を読めなかった。");
}
// 作業は隔離 worktree で行うので、未コミットであってはならないのは開始入力 (.dotagents.json) だけ。
// 元 checkout の無関係な作業 (/scoping の Issue 下書きなど) は保ち、止める理由にしない。
// 正本は orchestrator.ts の開始入力の照合 ("Required start inputs have uncommitted changes")。
const START_INPUTS = [".dotagents.json", ...reports.map((r) => r.path)];
const uncommittedInputs = String(target.porcelain || "")
  .split("\n")
  .filter((line) => START_INPUTS.includes(line.slice(3).trim()));
if (uncommittedInputs.length) {
  return await stop(
    "uncommitted-start-inputs",
    "開始入力に未コミットの変更がある。合意した .dotagents.json をコミットしてから再実行する。この workflow は stash も持ち越しもしない。",
    { porcelain: uncommittedInputs.join("\n") },
  );
}
if (!target.config_found) {
  return await stop(
    "no-config",
    "対象リポジトリのルートに .dotagents.json が無い。合意した setup・check・ciChecks・capture をコミットしてから再実行する。",
  );
}
const settings = parseJsonText(target.config_text);
const configProblems = configErrors(settings);
if (configProblems.length) {
  return await stop("invalid-config", configProblems.join("; "));
}
const shellArgv = (command) => ["/bin/sh", "-c", command];
const config = {
  ...settings,
  setup: typeof settings.setup === "string" ? [shellArgv(settings.setup)] : settings.setup,
  check: typeof settings.check === "string" ? shellArgv(settings.check) : settings.check,
};
const capture = config.capture;
const { repository, remote, baseBranch } = config;
// 正本は target.ts の readTarget。GH_HOST・remote の取得先と push 先・gh が解決した repo が、すべて repository を指すことを確かめる。
const ghHost = String(target.gh_host || "").trim();
if (ghHost && ghHost !== "github.com") {
  return await stop("gh-host", `GH_HOST が ${ghHost} を指している。github.com の対象だけを扱う。`);
}
const REMOTE_URL =
  /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/;
const remoteUrls = String(target.remotes || "")
  .split("\n")
  .map((line) => /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/.exec(line.trim()))
  .filter((m) => m && m[1] === remote);
const remoteMatches =
  ["fetch", "push"].every((way) => remoteUrls.some((m) => m[3] === way)) &&
  remoteUrls.every((m) => (REMOTE_URL.exec(m[2]) || [])[1] === repository);
if (!remoteMatches) {
  return await stop(
    "remote-mismatch",
    `remote ${remote} の取得先と push 先が ${repository} を指していない。.dotagents.json か remote を直してから再実行する。`,
  );
}
// 正本は target.ts の issueNumber。別の repo の Issue URL を、番号だけ取り出してこの repo に流用しない。
const issueUrlRepo = (/github\.com\/([\w.-]+\/[\w.-]+)\/issues\//.exec(issueRef) || [])[1];
if (issueUrlRepo && issueUrlRepo !== repository) {
  return await stop(
    "issue-repo-mismatch",
    `Issue URL の repo ${issueUrlRepo} が .dotagents.json の repository ${repository} と違う。対象 repo の Issue で再実行する。`,
  );
}
if (repoInfo.nameWithOwner !== repository) {
  return await stop(
    "repository-mismatch",
    `gh が解決した repo ${repoInfo.nameWithOwner} が .dotagents.json の repository ${repository} と違う。`,
  );
}
// 公開の前提は、書き込む前の Target で確かめる。Codex も公開には ciChecks と push 権限を求める。
if (publishing && !config.ciChecks.length) {
  return await stop(
    "no-ci-checks",
    "公開するには、待つ CI の check 名を ciChecks に並べる必要がある。足すか、公開を切って再実行する。",
  );
}
if (publishing && !["ADMIN", "MAINTAIN", "WRITE"].includes(repoInfo.viewerPermission)) {
  return await stop(
    "no-permission",
    `対象 repo への権限が ${repoInfo.viewerPermission || "不明"} で、push できない。別の主体には切り替えない。`,
  );
}
// 正本は revision.ts の previousRun。この workflow が同じ checkout で公開し、行を残した PR だけを直す。
// 公開した head と PR 全体の基点は、GitHub の今の状態でなくその行から取り、公開後に積まれた commit を検出する。
if (revising && revisionPr[1] !== repository) {
  return await stop(
    "invalid-revision",
    `修正する PR の repo ${revisionPr[1]} が .dotagents.json の repository ${repository} と違う。`,
  );
}
const revisionRow = revising ? parseJsonText(target.revision_row) : null;
const rowUsable = (row) =>
  Boolean(row) &&
  row.url === revisionUrl &&
  String(row.issue) === issueNumber &&
  row.repo === repo &&
  COMMIT_ID.test(String(row.commit)) &&
  COMMIT_ID.test(String(row.base_sha)) &&
  typeof row.branch === "string" &&
  row.branch !== "";
if (revising && !rowUsable(revisionRow)) {
  return await stop(
    "revision-no-record",
    `${revisionUrl} を、この checkout と Issue #${issueNumber} で公開した記録 (implement-runs.jsonl の published_draft 行) が無い。この workflow が公開した PR だけを直す。`,
  );
}
// 正本は revision.ts の checkRevision。OPEN・作者・head・base・head の repo が、公開時と同じであることを確かめる。
const prHeld = (fields) =>
  Boolean(fields) &&
  fields.state === "open" &&
  fields.html_url === revisionUrl &&
  fields.user === actor &&
  fields.head_sha === revisionRow.commit &&
  fields.head_ref === revisionRow.branch &&
  fields.head_repo === repository &&
  fields.base_ref === baseBranch &&
  fields.base_repo === repository;
const startBodySha = String(target.revision_body_sha || "").trim();
if (revising && (!prHeld(parseJsonText(target.revision_pr)) || !DIGEST_SHAPE.test(startBodySha))) {
  return await stop(
    "revision-target-changed",
    `${revisionUrl} が、公開したときから変わっている (OPEN・作者・head・base のどれか)。公開後に積まれた変更を照合してから、新しい修正依頼で起動し直す。`,
  );
}

// ---- Prepare: base から隔離 worktree と branch を作り、setup を実行する ----
phase("Prepare");
// branch 名は skills/checkout/references/branch-naming.md の <type>/<scope>-<description>。
// type は Issue title の接頭辞から、description は title の英数字語から決定論的に作る。
const TYPE_BY_PREFIX = { bug: "fix", feature: "feat", docs: "docs", chore: "chore" };
const titlePrefix = (/^\[(\w+)\]/.exec(issue.title) || [])[1] || "";
const branchType = TYPE_BY_PREFIX[titlePrefix.toLowerCase()] || "feat";
const titleWords = issue.title
  .replace(/^\[\w+\]\s*/, "")
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .filter(Boolean)
  .slice(0, 4);
// 英数字の語が 2 語未満のタイトル (日本語のタイトルなど) では 2〜4 語に届かない。そのときだけ agent に
// 英語の説明を 1 度提案させ、形は script が検査する。形が外れたら title の語に戻す。
const isDescription = (value) => {
  const words = String(value).split("-");
  return words.length >= 2 && words.length <= 4 && words.every((w) => /^[a-z0-9]+$/.test(w));
};
const named =
  revising || titleWords.length >= 2
    ? null
    : await agent(
        `Issue のタイトルから branch 名の説明部分を決め、description に入れる。コマンドは実行しない。` +
          `対象と結果を表す 2〜4 語の英小文字の語をハイフンでつなぐ (例: highlight-search-match)。update のような曖昧な語は使わない。\n` +
          `タイトル: ${JSON.stringify(issue.title)}`,
        {
          label: "name",
          phase: "Prepare",
          agentType: "general-purpose",
          schema: closed({ description: str }),
          model: "haiku",
        },
      );
const description =
  named && isDescription(named.description) ? named.description : titleWords.join("-") || "issue";
// 修正では、公開した branch をそのまま使う。
const branch = revising ? revisionRow.branch : `${branchType}/${issueNumber}-${description}`;
const worktree = `${repo}/.claude/worktrees/implement-${issueNumber}`;
const where = { branch, worktree };

const headSha = String(target.head_sha || "").trim();
if (!revising && !/^[0-9a-f]{40}$/.test(headSha)) {
  return await stop("target-unavailable", "checkout の HEAD を読めなかった。", where);
}
// 正本は research-handoff.ts。開始 commit は、新規の実行では checkout の HEAD、修正では PR 全体の基点と一致する。
const expectedStart = revising ? revisionRow.base_sha : headSha;
if (startCommit && startCommit !== expectedStart) {
  return await stop(
    "start-commit-mismatch",
    `開始 commit ${startCommit} が ${revising ? "PR 全体の基点" : "checkout の HEAD"} ${expectedStart} と違う。確認した参照と実行する版を照合し直す。`,
    where,
  );
}
// 各参照は開始 commit の通常ファイルで、blob が確認した版と一致する。一致しない参照の path を返す。
// git ls-tree が出力する path の形。非 ASCII・引用符・バックスラッシュ・制御文字を含む path は、引用符で囲み
// UTF-8 のバイトを 8 進でエスケープする (core.quotePath の既定)。非対話のセッションは `git -c` を権限確認で
// 拒むので、設定を変えずにこの形と照合する。
const gitQuoted = (path) => {
  let quoted = false;
  const escape = (ch) => {
    const simple = { '"': '\\"', "\\": "\\\\", "\t": "\\t", "\n": "\\n" }[ch];
    if (simple) return simple;
    if (ch.charCodeAt(0) < 0x80) return ch;
    return encodeURIComponent(ch)
      .split("%")
      .slice(1)
      .map((hex) => `\\${Number.parseInt(hex, 16).toString(8)}`)
      .join("");
  };
  const body = [...path]
    .map((ch) => {
      const out = escape(ch);
      if (out !== ch) quoted = true;
      return out;
    })
    .join("");
  return quoted ? `"${body}"` : path;
};
const unmatchedReports = (listing) => {
  const pinned = new Map(
    String(listing || "")
      .split("\n")
      .map((line) => /^(\d{6}) blob ([0-9a-f]+)\s+(.+)$/.exec(line.trim()))
      .filter((m) => m && /^100(644|755)$/.test(m[1]))
      .map((m) => [m[3], m[2]]),
  );
  return reports.filter((r) => pinned.get(gitQuoted(r.path)) !== r.blob).map((r) => r.path);
};
const reportStop = (listing) => {
  const unmatched = unmatchedReports(listing);
  return unmatched.length
    ? stop(
        "report-mismatch",
        `開始 commit の版と一致しない参照がある (未 commit・通常ファイルでない・確認後に変わった): ${unmatched.join(", ")}`,
        where,
      )
    : null;
};
const earlyReportStop = revising ? null : reportStop(target.report_listing);
if (earlyReportStop) return await earlyReportStop;
const PREPARE_SCHEMA = closed({
  existing: bool,
  created: bool,
  base_sha: str,
  config_blob: str,
  checkout_head: str,
  setup_exits: list(int),
  setup_tail: str,
});
const REPREPARE_SCHEMA = closed({
  existing: bool,
  created: bool,
  wt_status: str,
  wt_branch: str,
  head: str,
  config_blob: str,
  base_config_blob: str,
  report_listing: str,
  setup_exits: list(int),
  setup_tail: str,
});
const setupStep = config.setup.length
  ? `4. 次の setup コマンドを順に実行し、最初の非 0 終了で止める。Bash tool の timeout parameter は 600000 にする。実行したコマンドの終了コードを setup_exits に、最後に実行したコマンドの出力末尾 40 行を setup_tail に入れる。\n` +
    config.setup
      .map((argv, i) => `   ${i + 1}. \`cd ${shq(worktree)} && ${argvLine(argv)}\``)
      .join("\n")
  : `4. setup コマンドは無い。setup_exits は []、setup_tail は "" にする。`;
const freshPrompt =
  `Issue #${issueNumber} 用の隔離 worktree を用意する。各値をそのまま返す。\n` +
  `1. \`git show-ref --verify --quiet ${shq(`refs/heads/${branch}`)}\` が 0 で終わるか、${worktree} が存在するなら、existing: true・created: false にして何も変えずに終える。\n` +
  `2. \`git worktree add -b ${shq(branch)} ${shq(worktree)} ${shq(headSha)}\` を実行し、0 で終わったかを created に入れる。\n` +
  `3. \`git -C ${shq(worktree)} rev-parse HEAD\` の出力を base_sha に、\`git -C ${shq(worktree)} rev-parse HEAD:.dotagents.json\` の出力を config_blob に入れる。\n` +
  setupStep +
  `\n5. 最後に \`git rev-parse HEAD\` を実行し、出力を checkout_head に入れる。`;
// 正本は README の既存PRの修正。前回の checkout (worktree) を、公開した head で追跡・未追跡の差分が無い状態で再利用する。
// stash・reset・rebase・作業差分の移植はしない。
const revisionBase = revising ? revisionRow.base_sha : "";
const revisionPrompt =
  `既存 PR ${revisionUrl} を直すため、前回の worktree を用意する。各値をそのまま返す。何も削除・reset・stash しない。\n` +
  `1. ${worktree} が存在すれば existing: true・created: false にする。無ければ existing: false にし、\`git worktree add ${shq(worktree)} ${shq(branch)}\` を実行して 0 で終わったかを created に入れる。\n` +
  `2. \`git -C ${shq(worktree)} status --porcelain --untracked-files=all\` の stdout を wt_status に、\`git -C ${shq(worktree)} rev-parse --abbrev-ref HEAD\` の出力を wt_branch に、\`git -C ${shq(worktree)} rev-parse HEAD\` の出力を head に入れる。\n` +
  `3. \`git -C ${shq(worktree)} rev-parse HEAD:.dotagents.json\` の出力を config_blob に、\`git -C ${shq(worktree)} rev-parse ${shq(`${revisionBase}:.dotagents.json`)}\` の出力を base_config_blob に入れる。` +
  (reports.length
    ? `\`${argvLine(["git", "-C", worktree, "ls-tree", revisionBase, "--", ...reports.map((r) => r.path)])}\` の stdout を report_listing に入れる。\n`
    : ` report_listing は "" にする。\n`) +
  setupStep;
const prepared = await agent(anchor(revising ? revisionPrompt : freshPrompt), {
  label: revising ? "reprepare" : "prepare",
  phase: "Prepare",
  agentType: "general-purpose",
  schema: revising ? REPREPARE_SCHEMA : PREPARE_SCHEMA,
  model: "haiku",
});
if (!prepared) {
  return await stop(
    "prepare-unavailable",
    "worktree を用意する agent が結果を返さなかった。",
    where,
  );
}
if (!revising && prepared.existing) {
  return await stop(
    "branch-exists",
    "同名の branch か worktree が既にある。以前の実行を照合する。この workflow は再利用も削除もしない。",
    where,
  );
}
const worktreeReady = revising
  ? prepared.existing || prepared.created
  : prepared.created && /^[0-9a-f]{40}$/.test(prepared.base_sha);
if (!worktreeReady) {
  return await stop("worktree-failed", "worktree と branch を作れなかった。", where);
}
recordedBranch = branch;
// 正本は orchestrator.ts の "Start HEAD changed during preparation"。
if (
  !revising &&
  (prepared.base_sha !== headSha || String(prepared.checkout_head).trim() !== headSha)
) {
  return await stop(
    "start-head-changed",
    "準備の途中で checkout の HEAD が動いた。検証した設定と実行する版が一致しないので、HEAD を確かめてから再実行する。",
    where,
  );
}
const reusedHeld =
  !String(prepared.wt_status || "").trim() &&
  String(prepared.wt_branch || "").trim() === branch &&
  String(prepared.head || "").trim() === (revising ? revisionRow.commit : "");
if (revising && !reusedHeld) {
  return await stop(
    "revision-worktree-mismatch",
    `前回の worktree ${worktree} が、公開した head ${revisionRow.commit} の ${branch} で差分の無い状態ではない。worktree を照合してから起動し直す。この workflow は差分を移さない。`,
    where,
  );
}
if (revising && String(prepared.config_blob).trim() !== String(prepared.base_config_blob).trim()) {
  return await stop(
    "config-changed",
    "PR の中で .dotagents.json が基点から変わっている。対象の setup・check・capture の契約を確かめてから起動し直す。",
    where,
  );
}
const lateReportStop = revising ? reportStop(prepared.report_listing) : null;
if (lateReportStop) return await lateReportStop;
// PR 全体の基点 (レビューの差分と撮影の基準)。修正では前回の開始 commit で、公開した head は新しい commit の親になる。
const baseSha = revising ? revisionRow.base_sha : prepared.base_sha;
published.base_sha = baseSha;
const setupExits = prepared.setup_exits || [];
if (setupExits.length !== config.setup.length || setupExits.some((code) => code !== 0)) {
  return await stop(
    "setup-failed",
    `setup が完了しなかった (終了コード ${JSON.stringify(setupExits)})。`,
    {
      ...where,
      setup_tail: prepared.setup_tail,
    },
  );
}

// ---- Implement: 合意済み Issue 全体を 1 回の実装パスで実装する ----
phase("Implement");
const requirements = `Title: ${issue.title}\n\n${issue.body}`;
const inTree = (p) =>
  `作業は ${worktree} の worktree の中だけで行う。各 shell コマンドは \`cd ${worktree} && \` で始め、この path の下のファイルだけを編集する。\n\n${p}`;
// 正本は ~/.agents/scripts/implement/repair.ts の repairInstructions。撮影の行は capture の有無で分かれる。
const CAPTURE_RULES = capture
  ? [
      `設定された撮影コマンドと、この Issue に必要な媒体を準備する。最終的な媒体は ${capture.destination}/ で参照する。`,
      "host は撮影を通常のテストと分けて実行する。撮影コマンドは絶対パスの出力ディレクトリを最後の引数として受け取る。そのディレクトリ直下に PNG/JPEG/WebP/MP4/WebM だけを保存する (browser 定義では CAPTURE_OUTPUT)。動画 context を閉じてから保存する。撮影中に媒体やレポートを checkout へ書き込まない。",
    ]
  : [
      "この対象は撮影を宣言していない。合意した Issue が媒体を必要とするなら、実行前に撮影を設定するため needs_human を返す。",
    ];
const REPAIR_RULES = [
  "テストを作成・更新する前に、対象の test 方針があればそれと次の共通基準を適用する。各テストを削除したら見逃す現実的なバグは何かを問う。追加の担保を実行時間・不安定さ・保守コストと比べ、コストに見合わないテストは削除か統合する。安心感・テスト数・カバレッジ指標のためだけにテストを残さない。失われる検出条件と残る検証を説明する。",
  "findings では、この変更が影響する検証が防ぐ具体的なバグ、既存の検証に加えるもの、テストを追加・維持・統合・削除した理由を説明する。失われる検出条件、残る検証、未検証の限界を書く。十分な既存テストは再利用し、テストごとの台帳は作らない。",
  "文書のみの変更と付随する更新には、対象の文書方針があれば適用する。現行の運用手順を正確に保ち、過去の結果は証拠に残す。文書の事実・数量・条件・範囲・権限・未確認の主張・参照を元の資料と照合する。",
  "commit・push・公開をしない。設定された全体の検証は変更後に host に任せる。sandbox の中で browser や server を起動しない。",
  ...CAPTURE_RULES,
  "実装とテスト・撮影の定義の準備が整ったら repaired を返す。host の実行待ちだけでは needs_human にしない。要求・範囲・権限・実行上限を変える必要があるなら、それらを変えずに needs_human を返し、答えに依存する作業を止める。",
  "status (repaired か needs_human) と findings を持つ JSON を返す。findings には変更内容か、必要な人の判断を説明する。needs_human の findings は空にせず、問い・人が選ぶ選択肢・その影響を書く。指示ファイルが停止の理由なら、実際に読んだファイルと該当する指示を引用し、明示された要求と自分の解釈を分ける。",
].join("\n");
const REPLY_SCHEMA = closed({ status: choice(["repaired", "needs_human"]), findings: str });
// 実装と修正の応答を検査する。正本は repair.ts の parseRepairReply。
const replyProblem = (reply) => {
  if (!reply || typeof reply.findings !== "string") return "invalid-repair";
  if (reply.status === "repaired") return "";
  if (reply.status === "needs_human")
    return reply.findings.trim() ? "human-decision-required" : "invalid-repair";
  return "invalid-repair";
};
const actorRun = (role, prompt, label) =>
  agent(inTree(prompt), {
    label,
    phase: role === "implement" ? "Implement" : "Verify",
    agentType: "general-purpose",
    schema: REPLY_SCHEMA,
    model: "opus",
    effort: "high",
  });

// 正本は research-handoff.ts の researchContext。実装・修正・独立レビューに同じ開始 commit と参照一覧を渡す。
const referenceContext = [
  `Implementation references: ${JSON.stringify({ startCommit: baseSha, reports })}`,
  "要求と合意の記録が正本であり、参照は証拠を与えるが追加の許可ではない。選ばれた参照と Issue が参照する関連資料を読み、リポジトリの全文書は読まない。参照の blob は startCommit での引き継ぎ版を示すので、現在のファイルと比べ、変わった根拠は頼る前に説明する。",
  "判断に関わる規則や所見は、出典・版・適用範囲・合意状態まで辿る。観測した事実・合意済みの規則・仮説を区別する。別の範囲の証拠を当てはめず、未合意の提案を要求に格上げしない。",
  "欠けた・古い・矛盾する参照が判断に影響するなら、出典・影響する判断・調べ直すか合意し直すべきことを示す。事実不足は調査で解き、要求・範囲・許可の変更は人へ戻す。確認済みの参照を新しい ID に黙って置き換えない。",
].join("\n");
// 正本は skills/implement/SKILL.md の文書の更新。wiki と判断記録への影響は、差分が揃ったときに DOCUMENTS.md で確かめる。
const DOCUMENTS_RULE = `差分が揃ったら \`cat ${bundled("rules/conventions/DOCUMENTS.md")}\` を実行して Read and retain の節に従い、次の作業でも使う説明と既存の wiki・判断記録への影響を確かめる。必要な更新は今回の変更に含め、独立レビューの対象にする。毎回新しいページを作らない。`;
// 正本は revision.ts の revisionContext。修正依頼は合意済み Issue と並ぶ正本で、PR 全体をその両方に合わせる。
const revisionContext = revising
  ? [
      `この実行は、公開済みの PR ${revisionUrl} を直す。公開した head は ${revisionRow.commit}、PR 全体の基点は ${baseSha}。`,
      `人が採用した修正依頼 (合意済み Issue と並ぶ正本。範囲・期待する結果・許可範囲を含む):\n${revisionRequest}`,
      `今の PR 本文は \`gh pr view ${revisionUrl} --json body --jq .body\` で読める。本文の説明・未確認事項・添付リンクのうち、今も必要なものを確かめる。`,
    ].join("\n")
  : "";
const implemented = await actorRun(
  "implement",
  [
    revising
      ? "採用した修正依頼の範囲で、公開済みの PR を直す。PR 全体が合意済みの Issue と修正依頼の両方を満たすようにする。適用されるリポジトリの指示に従い、対象の README と開発方針はこの変更に関係する節を参照する。"
      : "既存のコードと検証資産を使って、合意済みの Issue 全体を実装する。適用されるリポジトリの指示に従い、対象の README と開発方針はこの変更に関係する節を参照する。",
    revisionContext,
    referenceContext,
    DOCUMENTS_RULE,
    "合意した実装、必要なテストと文書、host の検証に備える的を絞った check までを、範囲内の定型的な選択について承認を待たずに完了する。十分な既存の検証は再利用する。Issue を変えたり受け入れ条件を弱めたりしない。",
    "文書のみの Issue も同じ流れで扱う。テストやコードは合意した要求が必要とするときだけ追加する。変更した文書は既存の独立レビューに含める。",
    REPAIR_RULES,
    `対象の setup/check/capture 契約 (弱めも置き換えもしない): ${JSON.stringify({ setup: config.setup, check: config.check, capture })}`,
    "この worktree の外の制御 script や資格情報を編集しない。",
    `Requirements:\n${requirements}`,
    `Issue: ${issue.url}`,
  ].join("\n"),
  "implement",
);
const implementProblem = replyProblem(implemented);
if (implementProblem) {
  return await stop(
    implementProblem,
    (implemented && implemented.findings) || "実装 agent が有効な応答を返さなかった。",
    where,
  );
}

// ---- Verify: 撮影 → check → 独立レビュー → 修正を accepted まで回す (回数上限なし、dotagents #155) ----
phase("Verify");
const TREE_SHAPE = /^[0-9a-f]{40}$/;
const stageTree = `git -C ${shq(worktree)} add -A && git -C ${shq(worktree)} write-tree`;
const SNAPSHOT_SCHEMA = closed({ issue_digest: str, tree: str, config_blob: str });
// 開始時の worktree の .dotagents.json。正本は orchestrator.ts の unchangedTarget で、agent が設定を書き換えても検出する。
const baseConfigBlob = String(prepared.config_blob || "").trim();
// 要求 (Issue の digest)、成果物 (worktree の tree id)、設定 (stage 済みの .dotagents.json の blob) を 1 度に観測する。
const snapshot = async (label, stage = "Verify") => {
  const snap = await agent(
    anchor(
      `次のコマンドを実行し、各出力をそのまま返す。要約・判断をしない。\n` +
        `1. \`${issueDigestCommand(` --repo ${shq(repository)}`)}\`: 出力された 64 桁の hex を issue_digest に入れる (失敗したら空文字)。\n` +
        `2. \`${stageTree}\`: 出力された tree id を tree に入れる (失敗したら空文字)。\n` +
        `3. \`git -C ${shq(worktree)} rev-parse :.dotagents.json\`: 出力された blob id を config_blob に入れる (失敗したら空文字)。`,
    ),
    {
      label,
      phase: stage,
      agentType: "general-purpose",
      schema: SNAPSHOT_SCHEMA,
      model: "haiku",
    },
  );
  return snap && { ...snap, configHeld: String(snap.config_blob).trim() === baseConfigBlob };
};
const requirementsHeld = (snap) => Boolean(snap) && snap.issue_digest === issueDigest;
const history = [];
// host の check や撮影の失敗を修正担当へ渡す証拠にする。過去のレビューがあれば履歴として添える。
const hostFailure = (message) =>
  [
    message,
    history.length
      ? `過去の独立レビュー (履歴。現在の成果物で確かめる):\n${reviewSummary(history)}`
      : "",
  ].join("\n");

// ---- 撮影: 正本は correction.ts の verifyHost と captureDecision ----
// {harness} は Codex のハーネス ~/.agents に展開する。ハーネスは版ごとにアダプターの位置を動かすので、その中のパスは対象の capture コマンドだけから決める。
const captureArg = (arg) => arg.split("{harness}").map(shq).join('"$H"');
const captureLine = (argv) => argv.map(captureArg).join(" ");
// 撮影コマンドの引数が直接指す checkout 内の定義ファイル。文書の拡張子でも撮り直しの対象にする。
const captureDefinitions = capture
  ? capture.command
      .filter((arg) => !arg.includes("{harness}"))
      .map((arg) =>
        arg.startsWith("-") && arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : arg,
      )
      .filter((arg) => arg && !arg.startsWith("-"))
      .map((arg) => arg.replace(/^\.\//, ""))
  : [];
const destinationDir = capture ? capture.destination.replace(/\/+$/, "") : "";
const recordPrefix = destinationDir.includes("/")
  ? `${destinationDir.slice(0, destinationDir.lastIndexOf("/"))}/`
  : "";
// destination の親ディレクトリ内 (destination を除く) の保存記録。撮影の入力に使わない配置として扱う。
// repo 直下の destination には親ディレクトリが無い。Codex の dirname(destination) が "." になるのと同じ扱い。
const isRecordFile = (path) =>
  recordPrefix !== "" &&
  /\.(json|txt|log|stdout|stderr|diff)$/.test(path) &&
  path.startsWith(recordPrefix) &&
  !path.startsWith(`${destinationDir}/`);
const DIFF_LINE = /^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ [A-Z]\d*\t(.+)$/;
const PLAIN_MODE = /^(000000|100644)$/;
// 変更が撮影の入力にならない通常ファイル (Markdown と、初回撮影の後は保存記録) だけかを判定する。
// symlink・実行属性・撮影定義の変更、判定できない行があれば撮り直す。
const onlyNonRendering = (raw, allowRecords) => {
  const lines = String(raw).split("\n").filter(Boolean);
  return (
    lines.length > 0 &&
    lines.every((line) => {
      const m = DIFF_LINE.exec(line);
      if (!m || !PLAIN_MODE.test(m[1]) || !PLAIN_MODE.test(m[2])) return false;
      if (captureDefinitions.includes(m[3])) return false;
      return m[3].endsWith(".md") || (allowRecords && isRecordFile(m[3]));
    })
  );
};
const DIFF_SCHEMA = closed({ exit_code: int, raw: str });
const treeDiff = (from, to, label) =>
  agent(
    anchor(
      `次のコマンドを実行し、出力をそのまま返す。要約・判断をしない。\n` +
        `\`git -C ${shq(worktree)} diff-tree -r --no-renames ${shq(from)} ${shq(to)}\`: 終了コードを exit_code、stdout を raw に入れる。`,
    ),
    { label, phase: "Verify", agentType: "general-purpose", schema: DIFF_SCHEMA, model: "haiku" },
  );
let lastCaptureTree = "";
let lastCapture = null;
// 撮影の要否を決める。同じ tree なら再利用、required: false で文書だけの変更なら不要か再利用、他は実行。
const captureDecision = async (tree) => {
  if (lastCaptureTree === tree) return "reused";
  if (capture.required) return "execute";
  const from = lastCaptureTree || `${baseSha}^{tree}`;
  const diff = await treeDiff(from, tree, `capture-diff:${counts.check_runs + 1}`);
  if (!diff || diff.exit_code !== 0 || !onlyNonRendering(diff.raw, Boolean(lastCaptureTree)))
    return "execute";
  return lastCaptureTree ? "reused" : "not_required";
};
const CAPTURE_SCHEMA = closed({
  started: bool,
  timed_out: bool,
  exit_code: int,
  log_tail: str,
  tree: str,
});
const runCapture = (output, label) =>
  agent(
    `撮影を 1 回実行し、結果をそのまま返す。何も直さない。\n` +
      `1. \`test -d "$HOME/.agents/scripts" && mkdir ${shq(output)}\` を実行する。0 以外で終わったら started: false・timed_out: false・exit_code: -1 にし、その出力を log_tail に入れて手順 3 へ進む。\n` +
      `2. \`cd ${shq(worktree)} && H="$HOME/.agents" && ${captureLine([...capture.command, output])}\` を、Bash tool の timeout parameter を 600000 にして実行し、started: true にする。時間切れなら timed_out: true・exit_code: -1 に、そうでなければ timed_out: false にして終了コードを exit_code に入れる。結合出力の末尾 80 行を log_tail に入れる。\n` +
      `3. \`${stageTree}\` を実行し、tree id を tree に入れる (失敗したら空文字)。`,
    {
      label,
      phase: "Verify",
      agentType: "general-purpose",
      schema: CAPTURE_SCHEMA,
      model: "haiku",
    },
  );
const INSTALL_SCHEMA = closed({ stdout: str, tree: str });
const installMedia = (output, label) =>
  agent(
    anchor(
      `撮影した媒体を取り込み、結果をそのまま返す。要約・判断をしない。\n` +
        `1. \`node ${bundled("workflows/implement/install-media.ts")} ${shq(output)} ${shq(worktree)} ${shq(capture.destination)}\`: stdout をそのまま stdout に入れる。\n` +
        `2. \`${stageTree}\`: 出力された tree id を tree に入れる (失敗したら空文字)。`,
    ),
    {
      label,
      phase: "Verify",
      agentType: "general-purpose",
      schema: INSTALL_SCHEMA,
      model: "haiku",
    },
  );
// 撮影の実行結果から停止理由を決める。終了コード 78 は Codex の撮影アダプターが起動不能を示す値。
const shotStop = (shot, tree) => {
  if (!shot)
    return { stop: "capture-unavailable", why: "撮影を実行する agent が結果を返さなかった。" };
  if (shot.timed_out)
    return { stop: "capture-timeout", why: `撮影が時間切れになった。\n${shot.log_tail}` };
  if (!shot.started || shot.exit_code === 78)
    return { stop: "capture-unavailable", why: `撮影を起動できなかった。\n${shot.log_tail}` };
  if (shot.tree !== tree)
    return {
      stop: "source-changed",
      why: "撮影中に worktree が変わった。撮影は checkout に書き込まない。",
    };
  return null;
};
const captureStep = async (tree) => {
  if (!capture) return {};
  if (!TREE_SHAPE.test(String(tree)))
    return { stop: "check-unavailable", why: "tree id を得られなかった。" };
  const decision = await captureDecision(tree);
  if (decision !== "execute") {
    lastCapture = { ...lastCapture, decision };
    return {};
  }
  lastCaptureTree = "";
  counts.captures += 1;
  const output = `${worktree}-capture-${counts.captures}`;
  const shot = await runCapture(output, `capture:${counts.captures}`);
  const stopped = shotStop(shot, tree);
  if (stopped) return stopped;
  if (shot.exit_code !== 0)
    return {
      evidence: hostFailure(
        `host の撮影が終了コード ${shot.exit_code} で失敗した。出力の末尾:\n${shot.log_tail}`,
      ),
    };
  const installed = await installMedia(output, `install:${counts.captures}`);
  const result = installed ? parseJsonText(installed.stdout) : null;
  if (!result || !result.ok) {
    const reason = (result && result.reason) || "媒体の取り込み結果を得られなかった。";
    return {
      stop: reason === "ignored" ? "capture-media-ignored" : "invalid-capture",
      why: reason,
    };
  }
  if (!TREE_SHAPE.test(String(installed.tree)))
    return { stop: "check-unavailable", why: "取り込み後の tree id を得られなかった。" };
  lastCaptureTree = installed.tree;
  lastCapture = { decision, files: result.files, output };
  return {};
};

const CHECK_SCHEMA = closed({ exit_code: int, log_tail: str, tree: str });
const runCheck = (label) =>
  agent(
    `対象の check を 1 回実行し、結果をそのまま返す。何も直さない。\n` +
      `1. \`cd ${shq(worktree)} && ${argvLine(config.check)}\` を、Bash tool の timeout parameter を 600000 にして実行する (macOS には timeout binary が無い)。終了コードを exit_code に入れる (起動できないか時間切れなら -1)。結合出力の末尾 80 行を log_tail に入れる。\n` +
      `2. 続けて \`${stageTree}\` を実行し、tree id を tree に入れる (失敗したら空文字)。`,
    { label, phase: "Verify", agentType: "general-purpose", schema: CHECK_SCHEMA, model: "haiku" },
  );

// 正本は ~/.agents/scripts/implement/review.ts の reviewSchema。host が ID・初出・disposition を割り当てる。
const REVIEW_SCHEMA = closed({
  findings: text,
  targetId: text,
  assessments: closed({ code: text, requirements: text, tests: text, documentation: text }),
  updates: list(
    closed({ id: text, disposition: choice(["open", "fixed", "not_applicable"]), reason: text }),
  ),
  newItems: list(
    closed({
      kind: choice(["defect", "concern"]),
      area: choice(["code", "requirements", "tests", "documentation"]),
      required: bool,
      location: closed({
        path: { type: ["string", "null"] },
        line: { type: ["integer", "null"] },
      }),
      condition: text,
      impact: text,
      evidence: text,
      action: text,
      reason: text,
    }),
  ),
  documents: list(
    closed({ path: text, role: choice(["current", "historical", "proposal"]), reason: text }),
  ),
  handoff: list(text),
});
// 正本は review.ts の reviewInstructions。knowledge node と PR 公開の分担に関する行は、この workflow が
// 扱わないので移していない。
const REVIEW_RULES = [
  "初回レビューと再評価のたびに、現在の成果物を独立にレビューする。現在の差分に加え、影響する呼び出し元と呼び出し先、共有型、状態遷移、エラー処理、関連テストを読む。過去の指摘を判定しながら、現在の関連経路に再発や新しい具体的な問題が無いかも確かめる。過去の指摘を直しただけでは受理の根拠にならない。無関係なコードの監査、範囲外の機能、書き方の好みは求めない。",
  "4 つの観点を分けて評価する。コードの正しさ (入力境界、状態更新、非同期の振る舞い、失敗時の副作用) と具体的な冗長、合意した Issue の要求と範囲、テストの現実的な検出力、必要な文書と証拠が実装版と整合しているか。",
  "Issue が明示していない振る舞いでも、コードの欠陥は報告する。実証された欠陥 (defect) と未検証の懸念 (concern) を分ける。指摘が無いことも check の成功も、欠陥が無いことを保証しない。",
  "変更に関係する冗長は、影響する helper 呼び出しを、それが行う読み取りと確認まで展開して辿る。繰り返される観測ごとに、もう 1 度新しい結果を要する間の操作か別の保証を特定する。似た見た目・短さ・行数・好みだけでは指摘にしない。指摘 0 件も正当な結果である。",
  "対象・条件・無駄が確かめられ、合意した範囲内の局所的な修正で必要な保証を保てる冗長は、実証された冗長として required にし、公開の前に修正ループで解消させる。規模や重大度の割り当ては使わない。利点が不明なもの、好みだけのもの、範囲外の再設計は required の冗長修正にしない。",
  "対象の test 方針を読む。各テストを削除したら見逃す現実的なバグは何かを問い、担保を実行時間・不安定さ・保守コストと比べる。実装からコピーした期待値や、別の理由で成功する失敗テストを検出する。正当な削除や統合は、数が減ったことだけで欠陥にしない。",
  "対象の文書方針を、文書のみの変更も含めて適用する。変更した文書を Issue・元の資料・コード・check 結果と、事実・数量・条件・範囲・権限・未確認の主張・参照について照合する。現行方針、過去の証拠、未採用の提案を区別する。撮影した媒体があれば、その撮影対象と現在のコードの対応も確かめる。",
  "判断を妨げる欠落や矛盾は、影響する判断と戻り先を action に書いた required な open 指摘にする。人の判断はレビュー担当が解決できない。",
  "実装の前提を、host が渡した Issue と参照 (Implementation references) の引き継ぎ版と照合する。requirements と documentation の assessments で、関係する適用範囲・合意・変わった根拠を説明する。矛盾する観測は出典を辿って影響する前提と Issue の判断まで結ぶ。判断を妨げる欠落や矛盾は required な open 指摘にし、引き継ぎの作業にして accepted にしない。",
  "ファイルを編集しない。全体の check も実行しない。host の check 結果は host context にある。現在の成果物と必要な的を絞った検証で判定し、修正担当の自己申告を信用しない。",
  "host context の repairsSinceReview を順に読む。前回の独立レビューから後 (初回レビューなら実行開始から後) に完了した追加の修正で、check の失敗が続いた修正も含む。各 findings の証拠・変更・成果物を変えなかった理由を辿る。修正の説明は調べるべき主張であり、fixed や accepted の自動の判定にしない。過去のすべての項目を現在の証拠で独立に判定し直す。空の repairsSinceReview は初回レビューでは正当である。",
  "PR 本文は assessments・現在の項目の reason (open の項目は condition・impact・action も)・文書の reason・handoff を公開する。説明ごとに置き場所を 1 つにする。code は具体的な変更と理由、requirements は合意した振る舞いとの対応、tests は実際の検証と限界、documentation は出典の適用・版・合意・前提の変化を担う。同じ変更・結論・注意を複数の assessments で繰り返さない。fixed か not_applicable の項目では reason を完全な公開の回答にし、該当する問題と条件、現在の解決か非該当とその根拠を書く。",
  "レビューの JSON schema で返す。targetId は host context の値をそのまま返す。4 つの assessments それぞれに適用範囲を含む実質的な理由を書く。findings は全体の要約にする。status と items は返さない。host が required かつ open の指摘から status を算出する。",
  "newItems の各要素には kind・area・required・location・condition・impact・evidence・action・reason を入れる。id・introducedIn・disposition は入れない。実在するコード位置が無ければ path と line を null にする。位置や再現を作り上げない。",
  "過去のすべての項目 ID について、解決済みのものも含め、updates にちょうど 1 件ずつ id・disposition (open / fixed / not_applicable)・reason を返す。初回レビューの updates は空配列にする。修正や非該当は、実装担当の主張でなく具体的な証拠で説明する。必要なら open に戻す。未解決の required 項目は open のままにする。",
  "実際に参照した主要なリポジトリ内の文書を、リポジトリ相対の path、役割 (current / historical / proposal)、参照理由と共に documents に並べる。path はレビューした tree にある通常のファイルに限り、host が照合する。",
  "公開・添付・CI の定型作業、担当 AI による公開本文の照合と媒体の表示確認、人のレビュー・承認・マージは、host が実行条件に合わせて PR 本文に足す。handoff や他の公開欄で繰り返さない。公開前にそれらが未完了であることは実装の欠陥ではない。handoff には Issue 固有の未確認事項・必要な対応・担当だけを書き、無ければ [] にする。",
].join("\n");

const blankText = (value) => typeof value !== "string" || !value.trim();
const badLocation = (loc) =>
  !loc ||
  (loc.line !== null && (blankText(loc.path) || !Number.isInteger(loc.line) || loc.line < 1));
// 空文字と行番号の範囲は schema でなくここで検査する。既存の workflow が agent() に渡した前例の無い
// minLength と minimum に、受理の判定を預けないため。
const blankFields = (value) => {
  const problems = [];
  if (blankText(value.findings)) problems.push("findings");
  for (const key of ["code", "requirements", "tests", "documentation"]) {
    if (blankText(value.assessments && value.assessments[key])) problems.push(`assessments.${key}`);
  }
  for (const u of value.updates) if (blankText(u.reason)) problems.push(`updates[${u.id}].reason`);
  for (const [n, f] of value.newItems.entries()) {
    const missing = ["condition", "impact", "evidence", "action", "reason"].filter((k) =>
      blankText(f[k]),
    );
    if (missing.length) problems.push(`newItems[${n}].${missing.join("/")}`);
    if (badLocation(f.location)) problems.push(`newItems[${n}].location`);
  }
  return problems;
};
const idProblem = (prior, value) => {
  const ids = new Set(prior.map((item) => item.id));
  const updateIds = value.updates.map((u) => u.id);
  if (new Set(updateIds).size !== updateIds.length) return "同じ finding ID の更新が重複している";
  const unknown = updateIds.filter((id) => !ids.has(id));
  if (unknown.length) return `未知の finding ID を更新している: ${unknown.join(", ")}`;
  const omitted = prior.filter((item) => !updateIds.includes(item.id)).map((item) => item.id);
  if (omitted.length) return `過去の finding を省いている: ${omitted.join(", ")}`;
  const paths = value.documents.map((d) => d.path);
  return new Set(paths).size === paths.length ? "" : "同じ文書の参照が重複している";
};
// 正本は review.ts の parseReview。status は reviewer の申告でなく required かつ open の有無から算出する。
const mergeReview = (value, targetId, attempt, previous) => {
  if (
    !value ||
    !Array.isArray(value.updates) ||
    !Array.isArray(value.newItems) ||
    !Array.isArray(value.documents)
  ) {
    return { error: "レビュー応答が無いか、必須の配列を欠いている" };
  }
  if (value.targetId !== targetId)
    return { error: `レビュー対象が一致しない: ${targetId} を期待したが ${value.targetId} だった` };
  const prior = previous ? previous.items : [];
  const problem = idProblem(prior, value) || blankFields(value).join(", ");
  if (problem) return { error: problem };
  const updates = new Map(value.updates.map((u) => [u.id, u]));
  const items = [
    ...prior.map((item) => ({
      ...item,
      disposition: updates.get(item.id).disposition,
      reason: updates.get(item.id).reason,
    })),
    ...value.newItems.map((f, n) => ({
      ...f,
      id: `R${attempt}-${n + 1}`,
      introducedIn: targetId,
      disposition: "open",
    })),
  ];
  const open = items.some((item) => item.required && item.disposition === "open");
  const { findings, assessments, documents, handoff } = value;
  return {
    review: {
      status: open ? "needs_changes" : "accepted",
      findings,
      targetId,
      assessments,
      items,
      documents,
      handoff,
    },
  };
};
// 正本は review.ts の reviewSummary。
const reviewSummary = (entries) => {
  const current = entries.at(-1);
  if (!current) return "";
  const place = (item) =>
    `${item.location.path || "ファイル位置なし"}${item.location.line === null ? "" : `:${item.location.line}`}`;
  return [
    current.findings,
    `Review target: ${current.targetId}`,
    ...Object.entries(current.assessments).map(([key, value]) => `${key}: ${value}`),
    ...current.documents.map((doc) => `Source: ${doc.path} (${doc.role}): ${doc.reason}`),
    ...current.items.map(
      (item) =>
        `${item.id} (${item.area}/${item.kind}, ${item.disposition}, required=${item.required}, target=${item.introducedIn}): ${place(item)}: ${item.condition}; impact: ${item.impact}; evidence: ${item.evidence}; action: ${item.action}; judgment: ${item.reason}`,
    ),
    ...current.handoff.map((action) => `Handoff: ${action}`),
    "構造の検査と check の成功は、欠陥が無いことを保証しない。",
  ].join("\n\n");
};

// 前回の独立レビューから後に完了した修正の説明。check の失敗を挟んだ修正も含め、レビューが終わると空にする。
// 正本は correction.ts の repairsSinceReview。直さなかった理由や反証も、次のレビューが自分で確かめる材料にする。
let repairsSinceReview = [];
const CONFIG_CHANGED = {
  stop: "config-changed",
  why: "worktree の .dotagents.json が開始時の版から変わった。実行中の agent は対象の setup・check・capture の契約を変えない。",
};
const DOCUMENTS_SCHEMA = closed({ exit_code: int, listing: str });
const TREE_ENTRY = /^(\d{6}) (\w+) [0-9a-f]+\s+(.+)$/;
// 正本は correction.ts の文書参照の照合。レビューが挙げた文書は、レビューした tree にある通常のファイルに限る。
// PR 本文はこの参照へ link を張るので、存在しない文書を公開しない。
const missingDocuments = async (review, tree, attempt) => {
  const paths = review.documents.map((doc) => doc.path);
  if (!paths.length) return [];
  const listed = await agent(
    anchor(
      `次のコマンドを実行し、出力をそのまま返す。要約・判断をしない。\n` +
        `1. \`${argvLine(["git", "-C", worktree, "ls-tree", tree, "--", ...paths])}\`: 終了コードを exit_code、stdout を listing に入れる。`,
    ),
    {
      label: `documents:${attempt}`,
      phase: "Verify",
      agentType: "general-purpose",
      schema: DOCUMENTS_SCHEMA,
      model: "haiku",
    },
  );
  if (!listed || listed.exit_code !== 0) return paths;
  const files = new Set(
    String(listed.listing)
      .split("\n")
      .map((line) => TREE_ENTRY.exec(line.trim()))
      .filter((m) => m && /^100(644|755)$/.test(m[1]))
      .map((m) => m[3]),
  );
  return paths.filter((path) => !files.has(gitQuoted(path)));
};
const reviewRound = async (checked) => {
  counts.review_rounds += 1;
  const attempt = counts.review_rounds;
  const previous = history.at(-1) || null;
  const hostContext = {
    targetId: checked.tree,
    attempt,
    worktree,
    baseCommit: baseSha,
    diff: `git -C ${worktree} diff --cached ${baseSha} (host が変更をすべて stage 済み)`,
    check: { command: config.check, exit_code: checked.exit_code },
    capture: lastCapture,
    previous,
    repairsSinceReview,
    revision: revising ? { pr: revisionUrl, publishedHead: revisionRow.commit } : null,
  };
  const response = await agent(
    inTree(
      [
        REVIEW_RULES,
        // 正本は revision.ts:236。accepted の評価が新しい公開本文になるので、前回の本文で今も要る内容を残させる。
        revising
          ? "この実行は既存 PR を直す。baseCommit からの PR 全体を、合意済みの Issue と修正依頼の両方に対してレビューする。accepted の assessments と handoff が新しい公開本文になる。前回の本文を現在の成果物と比べ、今も当てはまる変更の説明・未解決の限界・公開済みの添付リンクを、それらの欄に明示して残す。古い成功の主張や過去に生成した節は写さない。必要な文脈の欠落は needs_changes にする。"
          : "",
        `Host context: ${JSON.stringify(hostContext)}`,
        `Requirements:\n${requirements}`,
        revisionContext,
        referenceContext,
      ].join("\n"),
    ),
    {
      label: `review:${attempt}`,
      phase: "Verify",
      agentType: "general-purpose",
      schema: REVIEW_SCHEMA,
      model: "opus",
      effort: "high",
    },
  );
  const after = await snapshot(`source:${attempt}`);
  if (!requirementsHeld(after))
    return {
      stop: "requirements-changed",
      why: "レビュー中に Issue (title・body・state、またはコメントでも動く updatedAt) が変わった。変更後の要求を人が合意してから新しく実行する。",
    };
  if (!after.configHeld) return CONFIG_CHANGED;
  if (after.tree !== checked.tree)
    return {
      stop: "source-changed",
      why: "レビュー中に worktree が変わった。レビュー担当はファイルを編集しない。",
    };
  const merged = mergeReview(response, checked.tree, attempt, previous);
  if (merged.error) return { stop: "invalid-review", why: merged.error };
  const missing = await missingDocuments(merged.review, checked.tree, attempt);
  if (missing.length)
    return {
      stop: "invalid-review",
      why: `レビューした tree に無い文書を参照している: ${missing.join(", ")}`,
    };
  // 完了したレビューが、ここまでの修正の説明を読み終えた。check の失敗は読み終えたことにならない。
  repairsSinceReview = [];
  return { review: merged.review };
};
// check を実行し、通ればレビューまで進める。停止・修正の証拠・受理のどれか 1 つを返す。
const checkAndReview = async () => {
  counts.check_runs += 1;
  const checked = await runCheck(`check:${counts.check_runs}`);
  if (!checked || !Number.isInteger(checked.exit_code) || !TREE_SHAPE.test(checked.tree)) {
    return {
      stop: "check-unavailable",
      why: "check の結果か tree id を得られなかった。実行環境を確かめる。",
    };
  }
  if (checked.exit_code !== 0) {
    return {
      evidence: hostFailure(
        `host の check \`${argvLine(config.check)}\` が終了コード ${checked.exit_code} で失敗した。出力の末尾:\n${checked.log_tail}`,
      ),
    };
  }
  const round = await reviewRound(checked);
  if (round.stop) return round;
  history.push(round.review);
  if (round.review.status === "accepted")
    return { accepted: { review: round.review, tree: checked.tree } };
  return { evidence: reviewSummary(history) };
};
const repairPrompt = (evidence) =>
  [
    "合意した要求の範囲内でだけ修正する。現在のファイルを読み、根本原因を直す。",
    "指摘が再発したら、既存のレビュー記録と過去の修正結果を現在の成果物と比べ、原因と修正方針を見直し、合意した範囲内で必要な修正を続ける。範囲外の改善や好みを完了条件にしない。",
    "文書の内容の欠陥も修正に戻し、影響する check と独立レビューを更新する。",
    "合意した受け入れ条件と必要な振る舞いの検証を保つ。check を通すために現実的な回帰を隠さない。",
    "診断や修正の確認に必要な的を絞った check だけを実行する。",
    REPAIR_RULES,
    `Requirements:\n${requirements}\nFailure evidence:\n${evidence}`,
    revisionContext,
    referenceContext,
  ].join("\n");

let accepted = null;
while (!accepted) {
  const before = await snapshot(`requirements:${counts.check_runs + 1}`);
  if (!requirementsHeld(before)) {
    return await stop(
      "requirements-changed",
      "実行中に Issue (title・body・state、またはコメントでも動く updatedAt) が変わった。変更後の要求を人が合意してから新しく実行する。",
      where,
    );
  }
  if (!before.configHeld) return await stop(CONFIG_CHANGED.stop, CONFIG_CHANGED.why, where);
  const shot = await captureStep(before.tree);
  const step = shot.stop || shot.evidence ? shot : await checkAndReview();
  if (step.stop) {
    return await stop(step.stop, step.why, { ...where, review: history.at(-1) || null });
  }
  if (step.accepted) {
    accepted = step.accepted;
    break;
  }
  // 正本は correction.ts の beforeRepair。check に数分かかる間に Issue が変わっていないかを、修正の直前にも確かめる。
  const beforeRepair = await snapshot(`before-repair:${counts.repairs + 1}`);
  if (!requirementsHeld(beforeRepair)) {
    return await stop(
      "requirements-changed",
      "修正の直前に Issue (title・body・state、またはコメントでも動く updatedAt) が変わっていた。変更後の要求を人が合意してから新しく実行する。",
      { ...where, review: history.at(-1) || null },
    );
  }
  counts.repairs += 1;
  const repaired = await actorRun(
    "repair",
    repairPrompt(step.evidence),
    `repair:${counts.repairs}`,
  );
  const repairProblem = replyProblem(repaired);
  if (repairProblem) {
    return await stop(
      repairProblem,
      (repaired && repaired.findings) || "修正 agent が有効な応答を返さなかった。",
      // 人が判断する open の指摘を戻り値に残す。
      { ...where, review: history.at(-1) || null },
    );
  }
  repairsSinceReview.push({ attempt: counts.repairs, findings: repaired.findings });
}

const verified = {
  issue: issue.url,
  actor,
  ...where,
  base_sha: baseSha,
  tree: accepted.tree,
  review: accepted.review,
  capture: lastCapture,
  summary: reviewSummary(history),
};
if (!publishing) {
  await recordRun("verified_local");
  return {
    status: "verified_local",
    why: "ローカルの撮影・check・独立レビューが現在の成果物を accepted にした。公開は切られている。",
    ...verified,
    ...counts,
    run_id: runId,
    // 正本は orchestrator.ts の remaining。公開と人の判断は、この workflow の外に残る。
    remaining: [
      "commit",
      "publication",
      "ci",
      "published_body_check",
      "mark_ready",
      "human_review",
    ],
  };
}

// ---- Ship: 正本は orchestrator.ts の ship と publish.ts。書き込みの前に照合し、書き込みのたびに読み戻す ----
phase("Ship");
// 公開後の停止は、分かっている commit と URL を返す。人が GitHub の実際の状態と照合するため。
const shipStop = (reason, why, fields = {}) =>
  stop(reason, why, {
    ...where,
    ...published,
    review: accepted.review,
    // ローカルの検証は済んでいる。PR の URL が分かる前なら公開も残る。
    remaining: [...(published.url ? [] : ["publication"]), ...REMAINING_AFTER_PR],
    ...fields,
  });
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// 本文は LLM に書き写させず、digest (UTF-16 の code unit に対する FNV-1a と長さ) で照合する。
// agent は半角カナを全角にするなど、数 KB の転記で文字を書き換えるため。
// 末尾の空白は意味を持たないので比べない。GitHub の保存で末尾の改行が揺れるため。
// node -e にもこの関数の source を埋め込むので、template literal を使わない。
const digest = (text) => {
  const t = String(text).trimEnd();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i += 1) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + ":" + t.length;
};
const sameBody = (reported, text) => String(reported || "").trim() === digest(text);

const gate = await snapshot("ship", "Ship");
if (!requirementsHeld(gate)) {
  return await shipStop(
    "requirements-changed",
    "accepted の後に Issue (title・body・state、またはコメントでも動く updatedAt) が変わった。変わった要求に人が合意してから新しく実行する。",
  );
}
if (!gate.configHeld) return await shipStop(CONFIG_CHANGED.stop, CONFIG_CHANGED.why);
if (gate.tree !== accepted.tree) {
  return await shipStop(
    "source-changed",
    "accepted の後に worktree が変わった。公開には新しい check と独立レビューが要る。",
  );
}

const PULLS_SCHEMA = closed({ actor: str, pulls_exit: int, pulls_json: str });
const owner = repository.split("/")[0];
const pulls = await agent(
  anchor(
    `次のコマンドを実行し、各出力をそのまま返す。要約・判断をしない。\n` +
      `1. \`gh api user --jq .login\`: stdout を actor に入れる (失敗したら空文字)。\n` +
      `2. \`gh api ${shq(`repos/${repository}/pulls`)} --method GET -f state=open -f ${shq(`head=${owner}:${branch}`)} --paginate --slurp\`: 終了コードを pulls_exit、stdout を pulls_json に入れる。`,
  ),
  {
    label: "pulls",
    phase: "Ship",
    agentType: "general-purpose",
    schema: PULLS_SCHEMA,
    model: "haiku",
  },
);
if (!pulls || String(pulls.actor || "").trim() !== actor) {
  return await shipStop(
    "actor-changed",
    `gh の実行ユーザーが ${actor} から変わった。別の主体では公開しない。gh 認証を確かめる。`,
  );
}
const pages = pulls.pulls_exit === 0 ? parseJsonText(pulls.pulls_json) : null;
if (!Array.isArray(pages) || !pages.every(Array.isArray)) {
  return await shipStop("pulls-unreadable", "この branch の open PR を読めなかった。");
}
const clash = pages.flat().find(
  (pr) =>
    pr &&
    pr.head &&
    pr.head.ref === branch &&
    pr.head.repo &&
    pr.head.repo.full_name === repository &&
    // 修正では、直す PR 自身がこの branch を使う。
    !(revising && pr.html_url === revisionUrl),
);
if (clash) {
  return await shipStop(
    "branch-pr-exists",
    `この branch を使う open PR が既にある (${clash.html_url})。公開の前に照合する。`,
  );
}

// 正本は revision.ts の checkRevision。修正では、書き込みの前に PR が開始時から変わっていないことを確かめ、
// ready なら draft に戻して読み戻す。ready を元に戻すことはしない。
if (revising) {
  const current = await agent(
    anchor(
      `次のコマンドを実行し、各出力をそのまま返す。要約・判断をしない。\n` +
        `1. \`${prFieldsCommand}\`: stdout を pr_fields に入れる。\n` +
        `2. \`${prBodyShaCommand}\`: 出力された 64 桁の hex を body_sha に入れる。`,
    ),
    {
      label: "revision-pr",
      phase: "Ship",
      agentType: "general-purpose",
      schema: closed({ pr_fields: str, body_sha: str }),
      model: "haiku",
    },
  );
  const fields = current ? parseJsonText(current.pr_fields) : null;
  if (!current || !prHeld(fields) || String(current.body_sha).trim() !== startBodySha) {
    return await shipStop(
      "revision-target-changed",
      `${revisionUrl} の head・base・作者・本文が、この実行の開始時から変わった。他者の変更を上書きしないので、取り込み方を人が決める。`,
    );
  }
  if (fields.draft !== true) {
    const undone = await agent(
      anchor(
        `PR を draft に戻し、結果をそのまま返す。失敗しても再試行しない。要約・判断をしない。\n` +
          `1. \`${argvLine(["gh", "pr", "ready", revisionUrl, "--undo", "--repo", repository])}\`: 終了コードを undo_exit に入れる。\n` +
          `2. \`${argvLine(["gh", "api", prApiPath, "--jq", ".draft"])}\`: 出力が true なら is_draft を true に、それ以外なら false にする。`,
      ),
      {
        label: "undo-ready",
        phase: "Ship",
        agentType: "general-purpose",
        schema: closed({ undo_exit: int, is_draft: bool }),
        model: "haiku",
      },
    );
    if (!undone || undone.undo_exit !== 0 || undone.is_draft !== true) {
      return await shipStop(
        "publication-unconfirmed",
        `${revisionUrl} を draft に戻せたか確かめられなかった。次の書き込みの前に GitHub で PR の状態を確かめる。ready には戻さない。`,
      );
    }
  }
}

const COMMIT_SCHEMA = closed({ commit_exit: int, commit: str, parent: str, tree: str, files: str });
const inWorktree = (...argv) => argvLine(["git", "-C", worktree, ...argv]);
const committed = await agent(
  anchor(
    `accepted の worktree を 1 つの commit にまとめ、各出力をそのまま返す。要約・修正・判断をしない。\n` +
      `1. \`${inWorktree("add", "-A")} && ${inWorktree("commit", "-m", `${issue.title} (#${issueNumber})`)}\`: 終了コードを commit_exit に入れる。\n` +
      `2. \`${inWorktree("rev-parse", "HEAD")}\`: 出力された sha を commit に入れる。\n` +
      `3. \`${inWorktree("rev-parse", "HEAD^")}\`: 出力された sha を parent に入れる。\n` +
      `4. \`${inWorktree("rev-parse", "HEAD^{tree}")}\`: 出力された tree id を tree に入れる。\n` +
      `5. \`${inWorktree("diff-tree", "--no-commit-id", "--name-only", "--diff-filter=AM", "-r", "HEAD")}\`: stdout を files に入れる。`,
  ),
  {
    label: "commit",
    phase: "Ship",
    agentType: "general-purpose",
    schema: COMMIT_SCHEMA,
    model: "haiku",
  },
);
if (!committed || committed.commit_exit !== 0 || !TREE_SHAPE.test(String(committed.commit))) {
  return await shipStop(
    "commit-failed",
    "commit を作れなかった。worktree と hook の出力を確かめる。",
  );
}
published.commit = committed.commit;
// commit hook が内容を書き換えた場合や、base の上に 1 つだけ積まれていない場合を、accepted との不一致として止める。
// 修正では、新しい commit の親は PR 全体の基点でなく公開した head になる。
if (
  committed.tree !== accepted.tree ||
  committed.parent !== (revising ? revisionRow.commit : baseSha)
) {
  return await shipStop(
    "commit-mismatch",
    "commit の tree か親が、base の上の accepted の tree と違う。この実行は branch を書き換えないので、公開の前に照合する。",
  );
}
const MEDIA_FILE = /\.(png|jpe?g|webp|mp4|webm)$/i;
const media = capture
  ? String(committed.files)
      .split("\n")
      .map((file) => file.trim())
      .filter((file) => file.startsWith(`${destinationDir}/`) && MEDIA_FILE.test(file))
  : [];

// 正本は pr-body.ts の publicText。既知のローカル root の下のパスと、それ以外の明示的なファイルシステム表記を伏せる。
const PATH_SUFFIX = /[A-Za-z0-9_./\\:@%+~=-]*/.source;
const OMITTED = "(内部パス省略)";
const publicText = (value) => {
  let result = String(value);
  for (const root of [worktree, repo]) {
    result = result.replace(
      new RegExp(`(?<![\\w/:])${escapeRegExp(root)}(?![\\w.-])${PATH_SUFFIX}`, "g"),
      OMITTED,
    );
  }
  return result.replace(
    new RegExp(`(?<![\\w/:])(?:file:///|~/|[A-Za-z]:\\\\)${PATH_SUFFIX}`, "g"),
    OMITTED,
  );
};
const docLink = (doc) =>
  `https://github.com/${repository}/blob/${published.commit}/${doc.path.split("/").map(encodeURIComponent).join("/")}`;
const itemLine = (item) =>
  item.disposition === "open"
    ? `- ${item.kind} / open: ${publicText(item.condition)} 影響: ${publicText(item.impact)} 判断・対応: ${publicText(item.reason)} 必要な対応: ${publicText(item.action)}`
    : `- ${item.kind} / ${item.disposition}: ${publicText(item.reason)}`;
const MEDIA_TASKS = [
  `- workflow: 対象 commit の媒体を添付する (${media.join("、")})。`,
  "- 担当 AI: 添付後の実際の PR 画面で、媒体の表示・再生と、説明・配置との対応を確かめる (rendered_media_check)。",
];
// 正本は pr-body.ts の prBody。accepted の評価から公開してよい事実だけを選び、内部の要約と履歴は載せない。
const prBody = (review) =>
  [
    `Closes #${issueNumber}`,
    "## 変更と理由",
    publicText(review.assessments.code),
    "## 要求との対応",
    publicText(review.assessments.requirements),
    "## 検証と未確認事項",
    `対象 commit: ${published.commit}`,
    `workflow: 検証済みの成果物と同一であることを照合した。ローカルの check (${publicText(JSON.stringify(config.check))}) は成功。独立レビュー: accepted。`,
    publicText(review.assessments.tests),
    ...(review.items.length ? ["## 指摘への対応", ...review.items.map(itemLine)] : []),
    "## 文書と根拠",
    publicText(review.assessments.documentation),
    ...review.documents.map(
      (doc) => `- [${doc.path}](${docLink(doc)}) (${doc.role}): ${publicText(doc.reason)}`,
    ),
    "## 残作業と担当",
    "本文を書いた時点では、draft の公開・CI・本文と媒体の確認・ready への切り替え・人の承認は済んでいない。",
    `- workflow: この PR を draft で公開し、同じ head の CI (${config.ciChecks.join("・")}) が登録されて成功することを確かめる。`,
    ...(media.length ? MEDIA_TASKS : []),
    ...review.handoff.map((action) => `- ${publicText(action)}`),
    "- 担当 AI: 最新の公開本文を、Issue・対象 commit・accepted の評価・検証結果と照合する (published_body_check)。本文・必要な媒体・同じ head の CI を確かめたあと、照合し直して ready に切り替え、読み戻す (mark_ready)。未確認のものがあれば draft のまま保つ。",
    "- 人: 要求や権限の変更を判断し、レビュー・承認・マージを判断する。",
  ].join("\n\n") + "\n";
const body = prBody(accepted.review);
// 後の修正が、公開した本文の版を行から照合できるようにする。
published.body_digest = digest(body);
// 本文は worktree の外 (撮影の出力と同じ兄弟の位置) に置き、commit 済みの tree を汚さない。
const bodyFile = `${worktree}-pr.md`;
// agent には本文を UTF-8 の base64 で渡す。\uXXXX のエスケープは agent が書き写す途中で元の文字に戻し、
// shell の引用を壊したため、agent が解釈できない形にする。変換は実行環境に頼らず script の中で行う。
const utf8Bytes = (text) => {
  const bytes = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000)
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
  }
  return bytes;
};
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
// 1 行 76 文字に折り返す。長い 1 行より、短い行の並びのほうが agent は崩さずに写せる。
const base64Lines = (text) => {
  const bytes = utf8Bytes(text);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[n >> 18] + B64[(n >> 12) & 63];
    out += b === undefined ? "=" : B64[(n >> 6) & 63];
    out += c === undefined ? "=" : B64[n & 63];
  }
  return out.match(/.{1,76}/g) || [];
};
// agent に渡すコマンドを 1 行に保つため、関数の source の改行をつぶして埋め込む。
const DIGEST_SRC = String(digest).replace(/\s*\n\s*/g, " ");
const DIGEST_JS = `const digest = ${DIGEST_SRC}; console.log(digest(require("fs").readFileSync(process.argv[1], "utf8")))`;
const writeBlock = [
  `base64 -d > ${shq(bodyFile)} <<'PR_BODY_B64'`,
  ...base64Lines(body),
  "PR_BODY_B64",
].join("\n");
const written = await agent(
  `PR 本文をファイルに書き、その digest を返す。base64 の行は解読・折り返し・編集をせず、そのまま写す。要約・判断をしない。\n` +
    `1. 次のブロックを 1 回の Bash 呼び出しとしてそのまま実行し、終了コードを write_exit に入れる。\n` +
    "```sh\n" +
    writeBlock +
    "\n```\n" +
    `2. \`node -e ${shq(DIGEST_JS)} ${shq(bodyFile)}\`: stdout を body_digest に入れる。`,
  {
    label: "body",
    phase: "Ship",
    agentType: "general-purpose",
    schema: closed({ write_exit: int, body_digest: str }),
    // 数 KB の base64 を一字も落とさずに写す役なので、haiku でなく sonnet に任せる。
    model: "sonnet",
  },
);
if (!written || written.write_exit !== 0 || !sameBody(written.body_digest, body)) {
  return await shipStop(
    "pr-body-mismatch",
    `書いた PR 本文が生成した本文と違う (${bodyFile})。何も公開していない。`,
  );
}

// Codex の target.ts の pushArguments は、コマンド内で一時 remote の URL と credential helper を差し替えて push する。
// Claude Code の auto mode はその形を remote の付け替えとして拒否するので、Target で検証した設定の remote に push する。
// 代わりに push の直前で、insteadOf と pushInsteadOf を適用した後の実際の push 先がすべて repository を指すことを照合する。
const probe = await agent(
  anchor(
    `次のコマンドを実行し、各出力をそのまま返す。要約・判断をしない。\n` +
      `1. \`${inWorktree("remote", "get-url", "--push", "--all", remote)}\`: stdout を push_url に入れる。\n` +
      `2. \`${inWorktree("ls-remote", "--get-url", remote)}\`: stdout を effective_url に入れる。`,
  ),
  {
    label: "push-target",
    phase: "Ship",
    agentType: "general-purpose",
    schema: closed({ push_url: str, effective_url: str }),
    model: "haiku",
  },
);
const pointsAtRepository = (url) => (REMOTE_URL.exec(url.trim()) || [])[1] === repository;
const pushUrls = String((probe && probe.push_url) || "")
  .split("\n")
  .filter((line) => line.trim());
if (
  !probe ||
  !pushUrls.length ||
  !pushUrls.every(pointsAtRepository) ||
  !pointsAtRepository(String(probe.effective_url))
) {
  return await shipStop(
    "push-target-mismatch",
    `remote ${remote} の実際の push 先が ${repository} を指していない。git の insteadOf 系の設定を確かめる。何も push していない。`,
  );
}
const pushed = await agent(
  anchor(
    `1 回だけ push し、各出力をそのまま返す。失敗しても再試行しない。要約・判断をしない。\n` +
      `1. \`${inWorktree("push", "--no-follow-tags", remote, `${branch}:refs/heads/${branch}`)}\`: 終了コードを push_exit、出力の末尾 20 行を push_tail に入れる。\n` +
      `2. \`${inWorktree("ls-remote", remote, `refs/heads/${branch}`)}\`: stdout を remote_sha に入れる。`,
  ),
  {
    label: "push",
    phase: "Ship",
    agentType: "general-purpose",
    schema: closed({ push_exit: int, push_tail: str, remote_sha: str }),
    model: "haiku",
  },
);
const remoteSha = String((pushed && pushed.remote_sha) || "")
  .trim()
  .split(/\s/)[0];
if (!pushed || pushed.push_exit !== 0 || remoteSha !== published.commit) {
  return await shipStop(
    "push-unconfirmed",
    `remote の ${branch} が commit ${published.commit} を指していることを確かめられなかった。次の書き込みの前に remote の branch を確かめる。自動では push し直さない。`,
    { push_tail: (pushed && pushed.push_tail) || "" },
  );
}

const PR_URL_SHAPE = new RegExp(
  `^https://github\\.com/${escapeRegExp(repository)}/pull/[1-9]\\d*$`,
);
// 新規の実行は draft PR を 1 回だけ作る。修正は PR を作らず、正本は publish.ts の revision 経路で、本文だけを書き換える。
const openPr = async () => {
  const created = await agent(
    anchor(
      `draft PR を 1 回だけ作り、出力をそのまま返す。失敗しても再試行しない。要約・判断をしない。\n` +
        `1. \`${argvLine(["gh", "pr", "create", "--draft", "--repo", repository, "--base", baseBranch, "--head", branch, "--title", issue.title, "--body-file", bodyFile])}\`: 終了コードを create_exit、stdout の最後の行を url、出力の末尾 20 行を create_tail に入れる。`,
    ),
    {
      label: "create",
      phase: "Ship",
      agentType: "general-purpose",
      schema: closed({ create_exit: int, url: str, create_tail: str }),
      model: "haiku",
    },
  );
  const url = String((created && created.url) || "").trim();
  return created && created.create_exit === 0 && PR_URL_SHAPE.test(url)
    ? { url }
    : {
        stop: "publication-unconfirmed",
        why: "PR 作成の結果が分からない。次の書き込みの前に GitHub の実際の PR を確かめる。自動では作り直さない。",
        fields: { url, create_tail: (created && created.create_tail) || "" },
      };
};
const rewriteBody = async () => {
  const edited = await agent(
    anchor(
      `PR 本文を 1 回だけ書き換え、出力をそのまま返す。失敗しても再試行しない。要約・判断をしない。\n` +
        `1. \`${argvLine(["gh", "pr", "edit", revisionUrl, "--repo", repository, "--body-file", bodyFile])}\`: 終了コードを edit_exit、出力の末尾 20 行を edit_tail に入れる。`,
    ),
    {
      label: "edit-body",
      phase: "Ship",
      agentType: "general-purpose",
      schema: closed({ edit_exit: int, edit_tail: str }),
      model: "haiku",
    },
  );
  return edited && edited.edit_exit === 0
    ? { url: revisionUrl }
    : {
        stop: "publication-unconfirmed",
        why: "PR 本文を書き換えられたか分からない。次の書き込みの前に GitHub で本文を確かめる。自動では書き直さない。",
        fields: { url: revisionUrl, edit_tail: (edited && edited.edit_tail) || "" },
      };
};
const opened = revising ? await rewriteBody() : await openPr();
if (opened.stop) return await shipStop(opened.stop, opened.why, opened.fields);
published.url = opened.url;

// 正本は publish.ts の checkPublishedPr と pr-identity.ts の matchPrPublication。
// 照合する項目だけに絞り、本文は digest に置き換えてから agent に返させる。
const PROJECT_JS =
  `const digest = ${DIGEST_SRC}; const p = JSON.parse(require("fs").readFileSync(0, "utf8")); ` +
  `const at = (o, k) => (o && typeof o === "object" ? o[k] : undefined); ` +
  `console.log(JSON.stringify({ state: p.state, draft: p.draft, html_url: p.html_url, user: { login: at(p.user, "login") }, ` +
  `head: { sha: at(p.head, "sha"), ref: at(p.head, "ref"), repo: { full_name: at(at(p.head, "repo"), "full_name") } }, ` +
  `base: { ref: at(p.base, "ref"), repo: { full_name: at(at(p.base, "repo"), "full_name") } }, ` +
  `body: typeof p.body === "string" ? digest(p.body) : null }))`;
const readback = await agent(
  anchor(
    `次のコマンドを一字一句そのまま実行し、出力をそのまま返す。要約・判断をしない。\n` +
      `1. \`gh api ${shq(`repos/${repository}/pulls/${published.url.split("/").at(-1)}`)} | node -e ${shq(PROJECT_JS)}\`: 終了コードを readback_exit、stdout を pr_json に入れる。`,
  ),
  {
    label: "readback",
    phase: "Ship",
    agentType: "general-purpose",
    schema: closed({ readback_exit: int, pr_json: str }),
    model: "haiku",
  },
);
const pr = readback && readback.readback_exit === 0 ? parseJsonText(readback.pr_json) : null;
const pick = (value, ...keys) =>
  keys.reduce((v, key) => (v && typeof v === "object" ? v[key] : undefined), value);
const PUBLICATION_CHECKS = [
  ["state", (p) => p.state === "open"],
  ["draft", (p) => p.draft === true],
  ["url", (p) => p.html_url === published.url],
  ["author", (p) => pick(p, "user", "login") === actor],
  ["head", (p) => pick(p, "head", "sha") === published.commit && pick(p, "head", "ref") === branch],
  ["head repository", (p) => pick(p, "head", "repo", "full_name") === repository],
  [
    "base",
    (p) =>
      pick(p, "base", "ref") === baseBranch && pick(p, "base", "repo", "full_name") === repository,
  ],
  ["body", (p) => sameBody(p.body, body)],
];
const differing =
  pr && typeof pr === "object"
    ? PUBLICATION_CHECKS.filter(([, ok]) => !ok(pr)).map(([name]) => name)
    : ["readback"];
if (differing.length) {
  return await shipStop(
    "publication-unconfirmed",
    `公開した PR が、この実行の作ったものと一致しない (${differing.join("・")})。次の書き込みの前に GitHub で照合する。`,
  );
}

if (media.length) {
  const attached = await agent(
    anchor(
      `媒体を 1 回だけ添付し、出力をそのまま返す。失敗しても再試行しない。要約・判断をしない。\n` +
        `1. \`${argvLine(["gh", "pr", "edit", published.url, "--repo", repository, ...media.flatMap((file) => ["--attach", `${worktree}/${file}`])])}\`: 終了コードを attach_exit、出力の末尾 20 行を attach_tail に入れる。`,
    ),
    {
      label: "attach",
      phase: "Ship",
      agentType: "general-purpose",
      schema: closed({ attach_exit: int, attach_tail: str }),
      model: "haiku",
    },
  );
  if (!attached || attached.attach_exit !== 0) {
    return await shipStop(
      "attach-failed",
      "媒体の添付を確かめられなかった。次の書き込みの前に PR の添付を確かめる。自動では添付し直さない。",
      { attach_tail: (attached && attached.attach_tail) || "" },
    );
  }
}

// ---- CI: 正本は ci.ts の waitForCi。同じ head の CI を待ち、分類は script が行う ----
phase("CI");
// Codex は 540 秒の予算で待つ。ここでは 1 回の待ちを Bash tool の上限内の 540 秒に収め、
// 登録前に待ちが空振りした場合に備えて回数で区切る。
const CI_WAIT_ROUNDS = 6;
// --jq は本文を Issue 参照を保っているかの真偽値に置き換える。本文そのものを書き写させないため。
const CI_FIELDS = "url,headRefOid,baseRefName,state,isDraft,body,statusCheckRollup";
const checkState = (value) => {
  if (!value) return undefined;
  if (value.status === undefined) return value.state;
  return value.status === "COMPLETED" ? value.conclusion : "PENDING";
};
// 正本は ci.ts の checkStatus。required の SKIPPED と NEUTRAL は成功と数えない。
const checkStatus = (values) => {
  const checks = values.map((value) => ({
    name: value && (value.name ?? value.context),
    state: checkState(value),
  }));
  if (checks.some((c) => typeof c.name !== "string" || typeof c.state !== "string")) return null;
  const required = config.ciChecks;
  const failed = checks.filter(
    ({ name, state }) =>
      !["SUCCESS", "SKIPPED", "NEUTRAL", "PENDING"].includes(state) ||
      (required.includes(name) && ["SKIPPED", "NEUTRAL"].includes(state)),
  );
  const missing = required.filter((name) => !checks.some((c) => c.name === name));
  const running = checks.filter((c) => c.state === "PENDING");
  const status = failed.length
    ? "failed"
    : missing.length
      ? "missing"
      : running.length
        ? "running"
        : "passed";
  return {
    status,
    checks,
    missing,
    running: running.map((c) => c.name),
    failed: failed.map((c) => c.name),
  };
};
// 正本は ci.ts の parseTarget。別の head・base・非 draft・Issue 参照の欠けた PR では、この commit の CI を確かめられない。
const ciTargetHeld = (view) =>
  view.headRefOid === published.commit &&
  view.baseRefName === baseBranch &&
  view.state === "OPEN" &&
  view.isDraft === true &&
  view.url === published.url &&
  view.body === true;
const observeCi = (viewed) => {
  if (!viewed || viewed.view_exit !== 0) return { status: "unavailable" };
  const view = parseJsonText(viewed.view_json);
  if (!view || typeof view !== "object") return { status: "invalid_response" };
  if (!ciTargetHeld(view)) return { status: "target_changed", head: view.headRefOid };
  const observed = Array.isArray(view.statusCheckRollup)
    ? checkStatus(view.statusCheckRollup)
    : null;
  return observed || { status: "invalid_response" };
};
const CI_STOPS = {
  failed: [
    "ci-failed",
    "CI が失敗したか、required の check が SUCCESS で終わらなかった。draft のまま保つ。失敗した check のログを見て原因を直す。",
  ],
  target_changed: [
    "ci-target-changed",
    "PR の head・base・OPEN と draft の状態・Issue 参照のどれかが、公開したものから変わった。CI を判断する前に照合する。",
  ],
  unavailable: [
    "ci-unavailable",
    "PR と CI を読めなかった。gh の認証・権限・接続を確かめる。CI は未確認で、コードの失敗ではない。",
  ],
  invalid_response: [
    "ci-invalid-response",
    "PR と CI の応答の形が想定と違う。生の応答を確かめてから、この commit を判断し直す。",
  ],
};
let ci = null;
while (counts.ci_rounds < CI_WAIT_ROUNDS) {
  counts.ci_rounds += 1;
  const viewed = await agent(
    anchor(
      `draft PR の CI を 1 回待ち、PR の状態をそのまま返す。要約・修正・判断をしない。\n` +
        `1. \`${argvLine(["gh", "pr", "checks", published.url, "--repo", repository, "--watch", "--interval", "10"])}\` を Bash tool の timeout parameter を 540000 にして実行する。待つためだけに実行するので、終了コードと出力は返さない。\n` +
        `2. \`${argvLine(["gh", "pr", "view", published.url, "--repo", repository, "--json", CI_FIELDS, "--jq", `.body |= test("Closes #${issueNumber}([^0-9]|$)")`])}\`: 終了コードを view_exit、stdout を view_json に入れる。`,
    ),
    {
      label: `ci:${counts.ci_rounds}`,
      phase: "CI",
      agentType: "general-purpose",
      schema: closed({ view_exit: int, view_json: str }),
      model: "haiku",
    },
  );
  ci = observeCi(viewed);
  if (CI_STOPS[ci.status]) {
    const [reason, why] = CI_STOPS[ci.status];
    return await shipStop(reason, why, { ci });
  }
  if (ci.status === "passed") break;
}
if (!ci || ci.status !== "passed") {
  return await shipStop(
    "ci-timed-out",
    `${CI_WAIT_ROUNDS} 回待っても、required の check がそろって成功しなかった。draft のまま保つ。この実行を再開せず、登録と実行中の check を確かめる。`,
    { ci },
  );
}

await recordRun("published_draft");
return {
  status: "published_draft",
  why: "検証済みの commit を draft PR として公開し、同じ head の CI が成功した。",
  ...verified,
  ...published,
  media,
  ci,
  ...counts,
  run_id: runId,
  // 正本は orchestrator.ts の remaining。ready への切り替えと人の判断は、この workflow の外に残る。
  remaining: [
    ...(media.length ? ["rendered_media_check"] : []),
    "published_body_check",
    "mark_ready",
    "human_review",
  ],
};

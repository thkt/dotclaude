/// <reference types="node" />
// 1つの skill-reference harness element について、wiped と wiped+1 の fixture ディレクトリを
// 組み立て、その fixture に対して reviewer agent を起動する claude コマンドを返す。
//
// skills/ablate/scripts/arms.ts の arm_command の形をなぞる: reference_arm_command は
// arm_command と同じ順で (arm, element) を取る。claude には自分専用の working directory を渡す
// フラグが無いので、戻り値は argv 単体ではなく {argv, cwd} の組にする -- 呼び出し側は cwd を
// argv に乗せる代わりに、その cwd から子プロセスを起動する。
//
// この分類が回す arm は wiped と wiped+1 の2つだけ: full-harness は制限フラグ無しの無改変で
// 実行するので (arms.ts 自身の arm_command のコメント参照)、fixture を組む必要が無く、
// build_reference_fixture はそれ以外の arm 名を、arm_command の WIPED_PLUS_ONE 分岐が
// element 未指定を拒否するのと同じ形で拒否する。
//
// 定数名と関数名は snake_case のまま保つ。同じディレクトリの arms.ts と verdict.ts が持つ
// 規約と同じ形。
import {
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { _frontmatter_lines } from "../../_lib/harness_elements.ts";
import { WIPED, WIPED_PLUS_ONE } from "./arms.ts";

export interface FixtureCommand {
  argv: string[];
  cwd: string;
}

/** 1つの agent ファイルの識別情報: そのリポジトリ相対パスと、その `skills:` frontmatter が
 * 名指す skill 名(frontmatter が並べる順のまま)。 */
interface ReviewerAgent {
  path: string;
  skills: string[];
}

/** agent の単一行 `skills: [a, b]` frontmatter フィールドの項目。agents/ 配下の全ファイルが
 * この形で保持している(skill 自身の `paths:` frontmatter と違い、複数行のダッシュ列挙形は
 * agents/ には出てこない)。そのため harness_elements.ts の `_read_array` を再利用せず、この
 * 1形だけを読む: `_read_array` は JSON で引用された項目を前提とするため、引用の無いこれらの
 * bareword 名を1つもパースできない。フィールドが無いか角括弧のリストでない場合は空。 */
function agentSkillNames(lines: string[]): string[] {
  const fieldLine = lines.find((line) => line.startsWith("skills:"));
  if (fieldLine === undefined) {
    return [];
  }
  const match = fieldLine
    .slice("skills:".length)
    .trim()
    .match(/^\[(.*)\]$/);
  if (match === null) {
    return [];
  }
  return match[1]
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/** agents/reviewers/*.md のうち、`skills:` frontmatter が `skillName` を名指す reviewer
 * agent と、その同じ frontmatter が名指す全ての skill 名。あらゆる agents/**\/*.md ではなく
 * agents/reviewers/ に絞る理由: ある skill は reviewer 以外の agent の `skills:` フィールドに
 * も現れうる(agents/enhancers/enhancer-code.md も use-context-reviewer-readability を名指す)
 * ため、この分類が起動するのは reviewer agent であって、たまたま先にその skill を名指した
 * agent ではない。どの reviewer agent もそれを名指さない場合は throw する: 自分の skill を
 * 名指す reviewer agent の無い skill-reference element は、build_reference_fixture が何として
 * 起動すればよいか持たないため。 */
function findReviewerAgent(skillName: string, root: string): ReviewerAgent {
  for (const relPath of globSync("agents/reviewers/*.md", { cwd: root }).sort()) {
    const absPath = join(root, relPath);
    if (!statSync(absPath).isFile()) {
      continue;
    }
    const lines = _frontmatter_lines(absPath);
    if (lines === null) {
      continue;
    }
    const skills = agentSkillNames(lines);
    if (skills.includes(skillName)) {
      return { path: relPath, skills };
    }
  }
  throw new Error(
    `no agent under agents/ names skill ${JSON.stringify(skillName)} in its skills: frontmatter`,
  );
}

const FIXTURE_CONFIG_DIR = ".claude";

/** リポジトリ相対の skill や agent のファイルが fixture の中で置かれる場所。
 * `--setting-sources project` は cwd の `.claude/skills/` から skill を、`.claude/agents/` から
 * agent を探すので、skills/<name>/... のパスには `.claude/` を前に付け、
 * agents/<group>/<name>.md のパスは `.claude/agents/<name>.md` に平たく置く。exposure.ts も
 * 同じ対応で fixture 内の対象 reference を探す。 */
export function fixture_relpath(repoRelPath: string): string {
  if (repoRelPath.startsWith("agents/")) {
    return join(FIXTURE_CONFIG_DIR, "agents", basename(repoRelPath));
  }
  return join(FIXTURE_CONFIG_DIR, repoRelPath);
}

/** root 配下のリポジトリ相対ファイル1つを、fixture_relpath の位置で fixtureRoot 配下へコピーする。
 * まず宛先の親ディレクトリを作る。コピー元が存在しないか通常ファイルでない場合は何もしない
 * (名指された skill の SKILL.md は fixture の project-scope discovery にとってのベストエフォ
 * ートな文脈であり、測定対象の element そのものではないため)。 */
function copyFileInto(root: string, relPath: string, fixtureRoot: string): void {
  const source = join(root, relPath);
  if (!existsSync(source) || !statSync(source).isFile()) {
    return;
  }
  const destination = join(fixtureRoot, fixture_relpath(relPath));
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination);
}

/** root 配下の skills/<name> ディレクトリを、fixture_relpath の位置で fixtureRoot 配下へコピーする。
 * ドットファイル(macOS の .DS_Store など、prompt 内容を持たないもの)を除く全ての通常
 * ファイルを含める。 */
function copySkillDir(root: string, skillDir: string, fixtureRoot: string): void {
  cpSync(join(root, skillDir), join(fixtureRoot, fixture_relpath(skillDir)), {
    recursive: true,
    filter: (source) => !basename(source).startsWith("."),
  });
}

/** element 自身の skill ディレクトリ(skills/<name>)と skill 名。element の
 * skills/<name>/references/<file>.md という形(classify() が skill-reference に解決する
 * その1形、harness_elements.ts の `_is_skill_reference`)から読み取る。 */
function ownSkill(element: string): { dir: string; name: string } {
  const dir = dirname(dirname(element));
  return { dir, name: basename(dir) };
}

// この arm の起点となる headless 起動コマンド: --print で非対話モードに入り、
// --output-format stream-json で単一の JSON ブロックではなくパース可能なイベント streamを得る
// (https://docs.claude.com/en/docs/claude-code/cli-reference で確認済み)。--print と stream-json
// の組は --verbose が無いと即座に終了する ("--output-format=stream-json requires --verbose")。
export const BASE_COMMAND: readonly string[] = [
  "claude",
  "--print",
  "--output-format",
  "stream-json",
  "--verbose",
];

/** arm を検証し、element 自身の skill dir/名前とその reviewer agent を解決する -- この
 * findReviewerAgent の走査(agents/reviewers/*.md への glob と、候補それぞれの frontmatter
 * 読み取り)は build_reference_fixture と reference_arm_command の両方が、互いの処理が分かれる
 * 前に必要とする1回分。ここに共有することで、agent 自身のパスを --agent フラグ用に別途
 * 必要とする reference_arm_command が、build_reference_fixture の分に重ねてもう一度この走査を
 * 繰り返さずに済む。 */
function resolveFixtureInputs(
  arm: string,
  element: string,
  root: string,
): { ownSkillDir: string; ownSkillName: string; agent: ReviewerAgent } {
  if (arm !== WIPED && arm !== WIPED_PLUS_ONE) {
    throw new Error(
      `reference arm classification only supports ${JSON.stringify(WIPED)} and ` +
        `${JSON.stringify(WIPED_PLUS_ONE)}, got ${JSON.stringify(arm)}`,
    );
  }
  const { dir: ownSkillDir, name: ownSkillName } = ownSkill(element);
  return { ownSkillDir, ownSkillName, agent: findReviewerAgent(ownSkillName, root) };
}

/** build_reference_fixture の fixture 組み立て部分。すでに解決済みの
 * ownSkillDir/ownSkillName/agent(resolveFixtureInputs)を受け取ることで、
 * reference_arm_command が agent 解決をもう一度行わずに再利用できるようにする。
 *
 * wiped は element 自身の skill が持つ全ファイルを、対象の reference だけを空にした状態で
 * そのまま保持する。wiped+1 は同じツリーを、対象の reference だけ元の内容のまま保持する。
 * どちらの arm も、element 自身の skill を `skills:` frontmatter に名指す reviewer agent と、
 * その frontmatter が名指す全ての skill を fixture に保持する。実リポジトリの中と同じ形で
 * project-scope の discovery がその agent を解決できるようにするため -- element 自身の
 * skill は丸ごと(element 自体がそのツリーの中にあるため、SKILL.md と全ての references/
 * ページ)、それ以外の名指された skill はその SKILL.md だけ(project-scope discovery が
 * skill の存在を解決する際に読むファイル)。 */
function assembleFixture(
  arm: string,
  element: string,
  root: string,
  ownSkillDir: string,
  ownSkillName: string,
  agent: ReviewerAgent,
): string {
  const fixtureRoot = realpathSync(mkdtempSync(join(tmpdir(), "reference-arm-")));

  copySkillDir(root, ownSkillDir, fixtureRoot);
  for (const skillName of agent.skills) {
    if (skillName === ownSkillName) {
      continue;
    }
    copyFileInto(root, join("skills", skillName, "SKILL.md"), fixtureRoot);
  }
  copyFileInto(root, agent.path, fixtureRoot);

  if (arm === WIPED) {
    writeFileSync(join(fixtureRoot, fixture_relpath(element)), "");
  }

  return fixtureRoot;
}

/** 1つの arm と1つの skill-reference element について fixture ディレクトリを組み立て、その
 * 絶対パスを返す。fixture が保持する内容は assembleFixture を参照。 */
export function build_reference_fixture(arm: string, element: string, root: string): string {
  const { ownSkillDir, ownSkillName, agent } = resolveFixtureInputs(arm, element, root);
  return assembleFixture(arm, element, root, ownSkillDir, ownSkillName, agent);
}

/** 1つの arm と1つの skill-reference element について claude の起動コマンドを返す:
 * BASE_COMMAND を project 設定に制限し、fixture が保持する reviewer agent として、その
 * fixture 自身のディレクトリを cwd として起動する。claude には working directory 用の
 * フラグが無いので、この組が arm_command の返す argv 単体の代わりになる。 */
export function reference_arm_command(arm: string, element: string, root: string): FixtureCommand {
  const { ownSkillDir, ownSkillName, agent } = resolveFixtureInputs(arm, element, root);
  const cwd = assembleFixture(arm, element, root, ownSkillDir, ownSkillName, agent);
  const argv = [
    ...BASE_COMMAND,
    "--setting-sources",
    "project",
    "--agent",
    basename(agent.path, ".md"),
  ];
  return { argv, cwd };
}

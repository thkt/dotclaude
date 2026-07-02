import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const targets = {
  ja: join(root, ".ja", "skills", "issue", "SKILL.md"),
  en: join(root, "skills", "issue", "SKILL.md"),
};
const planSectionRefs = {
  ja: join(root, ".ja", "skills", "issue", "references", "plan-section.md"),
  en: join(root, "skills", "issue", "references", "plan-section.md"),
};

function read(path) {
  assert.ok(existsSync(path), `${path} が存在する`);
  return readFileSync(path, "utf8");
}

function executionSection(doc, heading) {
  const start = doc.indexOf(`\n${heading}\n`);
  assert.ok(start >= 0, `${heading} 節がある`);
  const rest = doc.slice(start + heading.length + 2);
  const end = rest.indexOf("\n## ");
  return end >= 0 ? rest.slice(0, end) : rest;
}

function countSteps(section) {
  return section.split("\n").filter((line) => /^\d+\.\s/.test(line)).length;
}

test("フロー順が challenge → research → think → plan 書き下ろし → preview → 起票 の順である", () => {
  const exec = executionSection(read(targets.ja), "## 実行");
  const order = ["challenge", "research", "think", "書き下ろし", "プレビュー", "起票"];
  const indexes = order.map((keyword) => exec.indexOf(keyword));
  order.forEach((keyword, i) => {
    assert.ok(indexes[i] >= 0, `実行リストに ${keyword} がある`);
  });
  for (let i = 1; i < order.length; i++) {
    assert.ok(indexes[i - 1] < indexes[i], `${order[i - 1]} が ${order[i]} より先に現れる`);
  }
});

test("research / think のループ上限 2 回と上限到達時の扱いが明記されている", () => {
  const ja = read(targets.ja);
  assert.match(ja, /unresearchable[\s\S]{0,160}最大 2 回/, "ja: unresearchable 壁打ち最大 2 回");
  assert.match(ja, /ready\s*=\s*false[\s\S]{0,160}最大 2 回/, "ja: ready=false 決着最大 2 回");
  assert.match(ja, /仮マーク[^。]{0,20}残/, "ja: 上限到達時の仮マーク残置");
  assert.match(ja, /ユーザー[^。]{0,20}委ね/, "ja: 上限到達時のユーザー委任");
});

test("skip 分岐が基準・該当例・非該当例・/fix フッター注記付きで定義されている", () => {
  const ja = read(targets.ja);
  assert.match(
    ja,
    /docs[\s\S]{0,60}chore[\s\S]{0,200}(飛ばす|飛ばし|スキップ)/,
    "ja: docs / chore スキップ",
  );
  assert.match(
    ja,
    /research[^。]{0,20}think[^。]{0,60}(飛ばす|飛ばし|スキップ)/,
    "ja: research / think を飛ばす",
  );
  assert.match(ja, /1 ファイル/, "ja: 軽微 bug 基準 1 ファイル");
  assert.match(ja, /再現[^。]{0,10}確定/, "ja: 軽微 bug 基準 再現確定");
  assert.match(ja, /横断調査[^。]{0,10}不要/, "ja: 軽微 bug 基準 横断調査不要");
  assert.match(ja, /typo/, "ja: 該当例 typo 修正");
  assert.match(ja, /(intermittent|間欠)/, "ja: 非該当例 intermittent bug");
  assert.match(ja, /原因未特定/, "ja: 非該当例 原因未特定");
  assert.match(ja, /\/fix で処理/, "ja: /fix で処理 注記");
  assert.match(ja, /フッター/, "ja: フッター注記");
});

test("round-trip fidelity check が突合フィールドと書き直し上限付きで手順化されている", () => {
  const ja = read(targets.ja);
  assert.match(ja, /突合/, "ja: think plan との突合");
  assert.match(ja, /unit id/, "ja: 突合フィールド unit id 集合");
  assert.match(ja, /depends_on/, "ja: 突合フィールド depends_on");
  assert.match(ja, /test id/, "ja: 突合フィールド test id 集合");
  assert.match(ja, /(test name|テスト名)/, "ja: 突合フィールド test name");
  assert.match(ja, /test_command/, "ja: 突合フィールド test_command");
  assert.match(
    ja,
    /(書き直し[^。]{0,40}最大 2 回|最大 2 回[^。]{0,40}書き直)/,
    "ja: 不一致時の書き直し最大 2 回",
  );
  assert.match(ja, /ユーザーに提示/, "ja: 解消しなければユーザーに提示");
});

test("EN ミラーが JA と構造 parity を保つ", () => {
  const jaSteps = countSteps(executionSection(read(targets.ja), "## 実行"));
  const enSteps = countSteps(executionSection(read(targets.en), "## Execution"));
  assert.equal(jaSteps, 15, "ja: 実行 step が 15");
  assert.equal(enSteps, jaSteps, "en: 実行 step 数が JA と同数");
  const en = read(targets.en);
  assert.match(en, /Plan/, "en: Plan 節への言及");
  assert.match(en, /Backlog candidates/, "en: Backlog candidates 節への言及");
  assert.match(en, /plan-section\.md/, "en: plan-section.md 参照");
  assert.ok(existsSync(planSectionRefs.ja), "ja: references/plan-section.md が存在");
  assert.ok(existsSync(planSectionRefs.en), "en: references/plan-section.md が存在");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const targets = {
  ja: join(root, ".ja", "skills", "issue", "references", "plan-section.md"),
  en: join(root, "skills", "issue", "references", "plan-section.md"),
};

function read(path) {
  assert.ok(existsSync(path), `${path} が存在する`);
  return readFileSync(path, "utf8");
}

test("plan-section.md が Plan 節の構成 (id 記法・前提小節・受け入れテスト・test_command・Backlog candidates) を定義している", () => {
  for (const [lang, path] of Object.entries(targets)) {
    const doc = read(path);
    assert.match(doc, /### U-/, `${lang}: ### U- 記法`);
    assert.match(doc, /T-NNN/, `${lang}: T-NNN 記法`);
    if (lang === "ja") {
      assert.match(doc, /^### 前提/m, "ja: 前提小節");
    } else {
      assert.match(doc, /^### Preconditions/m, "en: Preconditions 小節");
    }
    assert.match(doc, /given/i, `${lang}: given`);
    assert.match(doc, /when/i, `${lang}: when`);
    assert.match(doc, /then/i, `${lang}: then`);
    assert.match(doc, /test_command/, `${lang}: test_command の置き場`);
    assert.match(doc, /^## Backlog candidates/m, `${lang}: ## Backlog candidates`);
  }
});

test("precondition の authoring 規則が stable anchor と投稿前実在検証を含む", () => {
  const ja = read(targets.ja);
  assert.match(ja, /既存.{0,10}依存先のみ/, "ja: 既存依存先のみ");
  assert.match(ja, /新規作成ファイル.{0,20}載せない/, "ja: 新規作成ファイルは載せない");
  assert.match(ja, /stable anchor/, "ja: stable anchor");
  assert.match(ja, /(exported|公開シンボル)/, "ja: exported / 公開シンボル名");
  assert.match(
    ja,
    /安定.{0,10}シンボルが無ければ.{0,10}path のみ/,
    "ja: 安定シンボルが無ければ path のみ",
  );
  assert.match(ja, /test -f/, "ja: test -f 実在検証");
  assert.match(ja, /ugrep -F/, "ja: ugrep -F 実在検証");

  const en = read(targets.en);
  assert.match(en, /existing dependenc/i, "en: existing dependencies only");
  assert.match(en, /newly created/i, "en: do not list newly created files");
  assert.match(en, /stable anchor/i, "en: stable anchor");
  assert.match(en, /exported/i, "en: exported / public symbol");
  assert.match(en, /path only/i, "en: path only fallback");
  assert.match(en, /test -f/, "en: test -f existence check");
  assert.match(en, /ugrep -F/, "en: ugrep -F existence check");
});

test("抽出 contract が共有可能で machine block の残骸が無い", () => {
  const fields = [
    /\bdir\b/,
    /\boutcome\b/,
    /\bdecisions\b/,
    /\bassumptions\b/,
    /\bnon_goals\b/,
    /\bconstraints\b/,
    /\bunits\b/,
    /\bid\b/,
    /\bgoal\b/,
    /\bfiles\b/,
    /\bcontract\b/,
    /\btests\b/,
    /\bname\b/,
    /\bgiven\b/,
    /\bwhen\b/,
    /\bthen\b/,
    /\bdepends_on\b/,
    /\btest_command\b/,
    /\bpreconditions\b/,
    /\bpath\b/,
    /\bpattern\b/,
    /\bbacklog_candidates\b/,
  ];
  for (const [lang, path] of Object.entries(targets)) {
    const doc = read(path);
    for (const field of fields) {
      assert.match(doc, field, `${lang}: 抽出 contract フィールド ${field}`);
    }
    assert.ok(!doc.includes("build-plan:v1"), `${lang}: build-plan:v1 残骸なし`);
    assert.ok(!doc.includes("<details>"), `${lang}: <details> 残骸なし`);
    assert.ok(!doc.includes("```json"), `${lang}: json fence 指定なし`);
  }
});

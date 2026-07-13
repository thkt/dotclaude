import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const targets = {
  ja: join(root, ".ja", "skills", "think", "references", "plan-section.md"),
  en: join(root, "skills", "think", "references", "plan-section.md"),
};

function read(path) {
  assert.ok(existsSync(path), `${path} が存在する`);
  return readFileSync(path, "utf8");
}

test("plan-section.md が Plan 節の構成 (id 記法・実装順・前提小節・1 行言明テスト・test_command・Backlog candidates) を定義している", () => {
  for (const [lang, path] of Object.entries(targets)) {
    const doc = read(path);
    assert.match(doc, /### U-/, `${lang}: ### U- 記法`);
    assert.match(doc, /T-NNN/, `${lang}: T-NNN 記法`);
    if (lang === "ja") {
      assert.match(doc, /^### 前提/m, "ja: 前提小節");
      assert.match(doc, /並び順がそのまま実装順/, "ja: 並び順 = 実装順");
      assert.match(doc, /条件と期待結果を 1 行で言い切る/, "ja: テストは 1 行言明");
    } else {
      assert.match(doc, /^### Preconditions/m, "en: Preconditions 小節");
      assert.match(doc, /listed order is the implementation order/, "en: 並び順 = 実装順");
      assert.match(doc, /condition \+ expected result/, "en: テストは 1 行言明");
    }
    assert.ok(!/given/i.test(doc), `${lang}: given/when/then の詳述形式が残っていない`);
    assert.ok(!doc.includes("depends_on"), `${lang}: depends_on が残っていない`);
    assert.match(doc, /test_command/, `${lang}: test_command の置き場`);
    assert.match(doc, /^## Backlog candidates/m, `${lang}: ## Backlog candidates`);
  }
});

test("precondition の authoring 規則が stable anchor と書き出し前実在検証を含む", () => {
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

test("contract の authoring 規則が選択 (引用ラダー) を強制し、行数規則が形式で簡潔性を縛る", () => {
  const ja = read(targets.ja);
  assert.match(ja, /生成でなく選択/, "ja: 選択 > 生成の原則");
  assert.match(ja, /コード片を新造/, "ja: コード片の新造禁止");
  assert.match(ja, /docs\/wiki/, "ja: wiki 引用");
  assert.match(ja, /公式 docs/, "ja: 公式 docs 引用");
  assert.match(ja, /SOURCING/, "ja: SOURCING.md の規律参照");
  assert.match(ja, /引用 1 行 \+ やりたいこと 1 行/, "ja: contract の行数形式");
  assert.match(ja, /^## 行数規則/m, "ja: 行数規則の節");
  assert.match(ja, /分割.{0,40}で解消/, "ja: 超過は分割で解消");

  const en = read(targets.en);
  assert.match(en, /Select, do not generate/, "en: selection over generation");
  assert.match(en, /invent new code fragments/i, "en: no invented code fragments");
  assert.match(en, /docs\/wiki/, "en: wiki citation");
  assert.match(en, /official docs/i, "en: official docs citation");
  assert.match(en, /SOURCING/, "en: SOURCING.md discipline");
  assert.match(en, /one citation line \+ one intent line/i, "en: contract line format");
  assert.match(en, /^## Line-count rules/m, "en: line-count rules section");
  assert.match(en, /splitting/i, "en: resolve overflow by splitting");
});

test("抽出は骨格依存 (schema は build.js 所有) と明記され、machine block の残骸が無い", () => {
  for (const [lang, path] of Object.entries(targets)) {
    const doc = read(path);
    assert.match(doc, /EXTRACT_SCHEMA/, `${lang}: schema の所有者は build.js と明記`);
    assert.match(doc, /クロスチェック|cross-check/, `${lang}: 決定論クロスチェックへの言及`);
    assert.ok(!doc.includes("build-plan:v1"), `${lang}: build-plan:v1 残骸なし`);
    assert.ok(!doc.includes("<details>"), `${lang}: <details> 残骸なし`);
    assert.ok(!doc.includes("```json"), `${lang}: json fence 指定なし`);
  }
});

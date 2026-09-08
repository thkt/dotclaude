/// <reference types="node" />
// history を記録する CLI (workflows/build/record.ts、workflows/assert/record.ts) が共有する、
// stdin payload の parse/guard の組と history-path/timestamp の helper。それぞれの script は
// この流れを自前でコピーして持っていた。この module はそれに 1 つの置き場所を与える。
// workflows/_lib/entry-point.ts と同じ形 (小さく、独立してテストでき、named export) で。
//
// parsePayload は生の stdin テキストを受け取り、parse できた object か、呼び出し側が stderr に
// 書き込む message のどちらかを返す -- stdin や stderr そのものには一切触れない。fd 0 を読み、
// parsePayload を呼び、失敗時に stderr へ message を書く薄い関数は、この CLI が後続の unit で
// この module に移植されたときに workflows/build/record.ts の `main` が呼ぶ wrapper になる。
// ここではまだ export していない。ここから import する側が無いためで、import されない export は
// このリポジトリが書き込み時に強制する knip の失敗になる。
//
// historyPath は `home` を process.env.HOME や node:os から読む代わりに明示引数として受け取る。
// そうすることでテスト (や U-006 のような harness) が process.env.HOME に触れずに temp
// directory を指せる。CLI 側は `homedir()` をここに渡す。
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/** stdin payload を parse した結果: 成功なら object、失敗なら呼び出し側が stderr に書く
 * message を null と組で返す。2 つのうちどちらか一方だけが non-null になる。 */
export interface PayloadResult {
  payload: Record<string, unknown> | null;
  message: string | null;
}

/** `text` を JSON として parse する純関数。成功なら `{ value }`、失敗なら parser の message を
 * 積んだ `{ error }` を返す -- stdin にも stderr にも触れない。parsePayload 自身の JSON.parse
 * 試行は今やここに住む。parsePayload はこれを呼び、自分の message 接頭辞と object 形状検査を
 * その上に重ねる。 */
export function parseJson(text: string): { value: unknown } | { error: string } {
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** `text` を JSON object として parse する。workflows/build/record.ts の `main` が置き換え元の
 * Python recorder から移植した 2 つの検査をそのまま踏襲する: parse できないテキスト、次に
 * parse はできるが plain object でない値 (array, スカラー, null)。message の文言と接頭辞は
 * Python 版 recorder のものと一致させ、この module へ切り替える呼び出し側の stderr 契約を
 * 変えない。JSON.parse を試みること自体は parseJson の役目で、この関数が重ねるのは message
 * 接頭辞と object 形状検査だけ。
 *
 * hooks/_lib/hook_payload.ts の `parse` はここでは再利用しない: あちらは `{}` へ fail open する
 * ため、壊れた payload が exit 1 で何も書かないこの CLI の呼び出し側の挙動ではなく、
 * 静かに空の行になってしまう。 */
export function parsePayload(text: string): PayloadResult {
  const parsed = parseJson(text);
  if ("error" in parsed) {
    return { payload: null, message: `Error: unparseable payload: ${parsed.error}` };
  }
  const loaded = parsed.value;
  if (typeof loaded !== "object" || loaded === null || Array.isArray(loaded)) {
    return { payload: null, message: "Error: payload must be a JSON object" };
  }
  return { payload: loaded as Record<string, unknown>, message: null };
}

/** `home` の下で `name` という名前の history file が置かれる path。含む directory が
 * 存在することを保証する。`home` は `homedir()` や `process.env.HOME` を読む代わりに明示引数と
 * して渡す。そうすることで呼び出し側 (テスト、あるいは U-006 の harness) が process state に
 * 触れずに temp directory を指せる。CLI 自身の entry point は `homedir()` を渡す。 */
export function historyPath(home: string, name: string): string {
  const dir = join(home, ".claude", "history");
  mkdirSync(dir, { recursive: true });
  return join(dir, name);
}

/** `date` を秒精度 (ミリ秒なし) の UTC ISO-8601 timestamp にする。既定値は現在時刻で、
 * workflows/build/record.ts と workflows/assert/record.ts の両方が書く `generated_at`
 * フィールドと一致する。 */
export function isoTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

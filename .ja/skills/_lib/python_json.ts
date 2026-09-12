// skills/_lib/harness_elements.ts、skills/ablate/scripts/enforcer_map.ts、
// skills/ablate/scripts/usage_counts.ts の main() が使う wire format から共有される。Python の
// json.dumps(value, ensure_ascii=False) の既定の区切り文字は ", " と ": " (カンマとコロンの
// 後にそれぞれ空白 1 つ) であり、indent を渡さない JSON.stringify はどちらの空白も付けない。
// この 3 つの CLI それぞれの凍結したフィクスチャは実際の python3 CLI の stdout をバイト単位で
// 記録しているため、wire format は JSON.stringify の既定ではなく json.dumps のこの区切り方に
// 合わせる必要がある。
//
// 各呼び出し側が自分の形の波かっこを手で組む代わりに、値そのもの (string / number / boolean /
// null / array / plain object) を再帰的にたどる。そうすることで、新しくバイト単位一致が必要な
// CLI が4つ目のフィールド単位のビルダーを書く代わりにこれを再利用できる。`undefined` の
// object 値は親から落とされシリアライズされない -- これは、一度も代入されなかった TS の
// optional フィールド (enforcer_map.ts の EnforcerMapEntry.enforcer) がキーとして一切現れない
// のと同じ形である。
export function pythonJsonStringify(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(pythonJsonStringify).join(", ")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, entryValue]) => entryValue !== undefined,
    );
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}: ${pythonJsonStringify(entryValue)}`)
      .join(", ")}}`;
  }
  throw new Error(`pythonJsonStringify: unsupported value type ${typeof value}`);
}

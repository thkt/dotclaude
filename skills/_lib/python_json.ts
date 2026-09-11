// Shared by skills/_lib/harness_elements.ts's, skills/ablate/scripts/enforcer_map.ts's and
// skills/ablate/scripts/usage_counts.ts's main() wire format. Python's
// json.dumps(value, ensure_ascii=False) defaults to ", " and ": " as its separators (a space
// after each comma and colon), where JSON.stringify with no indent argument omits both. Each of
// those three CLIs' frozen fixtures recorded the real python3 CLI's stdout byte-for-byte, so the
// wire format has to follow json.dumps' spacing rather than JSON.stringify's default.
//
// Recurses over the value itself (string / number / boolean / null / array / plain object)
// instead of each caller hand-building its own shape's braces, so a new byte-exact CLI reuses
// this rather than writing a fourth field-by-field builder. An `undefined` object value is
// dropped from its parent rather than serialized, matching how a TS optional field that was
// never assigned (enforcer_map.ts's EnforcerMapEntry.enforcer) never appears as a key at all.
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

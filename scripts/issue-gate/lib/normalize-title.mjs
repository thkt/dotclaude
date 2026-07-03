// Title normalization shared by verdict-gate / plan-gate and (later) the hook gate.
// Trim surrounding whitespace and collapse internal runs of whitespace to a single space,
// so titles that differ only in incidental spacing bind to the same evidence bundle.
export const normalizeTitle = (title) =>
  String(title ?? "")
    .trim()
    .replace(/\s+/g, " ");

// Extract the value of `--title <value>` from an argv array. Returns "" when absent.
export const titleArg = (argv) => {
  const i = argv.indexOf("--title");
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : "";
};

// Read all of stdin as a UTF-8 string.
export const readStdin = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
};

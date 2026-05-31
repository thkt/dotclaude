import { readFile } from "node:fs/promises";
import { llm } from "./anthropic";

export async function summarizeDoc(path: string) {
  const content = await readFile(path, "utf8");
  return llm.complete(`Summarize the following document:\n\n${content}`);
}

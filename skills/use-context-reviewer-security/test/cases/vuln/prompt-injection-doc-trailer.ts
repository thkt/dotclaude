import { llm } from "./anthropic";
import { getLatestComment } from "./comments";

export async function summarizeLatestComment() {
  const comment = await getLatestComment();
  return llm.complete(`Summarize the following document:\n\n${comment.body}`);
}

import { searchKnowledge } from "./vector-store";
import { llm } from "./anthropic";

export async function answerWithRAG(question: string) {
  const docs = await searchKnowledge(question);
  const prompt = `Context:\n${docs.join("\n")}\n\nQuestion: ${question}`;
  return llm.complete(prompt);
}

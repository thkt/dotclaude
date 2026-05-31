import { searchKnowledge } from "./vector-store";
import { llm } from "./anthropic";

export async function answerAsRole(question: string, role: string) {
  const docs = await searchKnowledge(question);
  const messages = [
    {
      role: "system",
      content: `You are a helpful assistant. Current user role: ${role}.`,
    },
    {
      role: "user",
      content: `Reference docs:\n${docs.join("\n\n")}\n\nQuestion: ${question}`,
    },
  ];
  return llm.chat(messages);
}

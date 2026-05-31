import { searchKnowledge } from "./vector-store";
import { llmWithTools } from "./anthropic";

const tools = [
  {
    name: "fetch_url",
    description: "Fetch any URL and return the response body",
    parameters: { url: "string" },
  },
];

export async function ragWithTools(question: string, history: string[]) {
  const docs = await searchKnowledge(question);
  const prompt = [
    `Conversation history:\n${history.join("\n")}`,
    `Context:\n${docs.join("\n")}`,
    `Question: ${question}`,
  ].join("\n\n");
  return llmWithTools.complete(prompt, tools);
}

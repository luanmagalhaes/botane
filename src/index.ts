import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: process.argv[2] || "Hello, world" }],
  });

  console.log("Resposta:", message.content[0].type === "text" ? message.content[0].text : "");
  console.log("Tokens usados:", message.usage);
}

main();

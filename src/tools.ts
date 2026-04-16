import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// --- Step 4: define the tools ---
const tools: Anthropic.Tool[] = [
  {
    name: "get_weather",
    description:
      "Get the current weather for a given city. Use this when the user asks about weather conditions, temperature, or whether they need an umbrella.",
    input_schema: {
      type: "object" as const,
      properties: {
        city: {
          type: "string",
          description: "The city name, e.g. 'Salvador' or 'New York'",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "calculate",
    description:
      "Perform a basic arithmetic calculation. Use this when the user asks you to calculate, add, subtract, multiply or divide numbers.",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: {
          type: "string",
          description: "The math expression to evaluate, e.g. '42 * 7 + 10'",
        },
      },
      required: ["expression"],
    },
  },
];

// --- The actual functions ---
async function getWeather(city: string): Promise<string> {
  // Step 1: geocode city name to coordinates
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  );
  const geoData = await geoRes.json();

  if (!geoData.results?.length) {
    return `No location found for "${city}"`;
  }

  const { latitude, longitude, name, country } = geoData.results[0];

  // Step 2: get current weather using coordinates
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m`
  );
  const weather = await weatherRes.json();
  const current = weather.current;

  return `${name}, ${country}: ${current.temperature_2m}°C, wind ${current.wind_speed_10m} km/h, weather code ${current.weather_code}`;
}

function calculate(expression: string): string {
  try {
    // eval for learning purposes only — never in production with real user input
    const result = Function(`"use strict"; return (${expression})`)();
    return String(result);
  } catch {
    return `Error: invalid expression`;
  }
}

// --- Dispatcher: maps tool name to function ---
async function runTool(name: string, input: Record<string, string>): Promise<string> {
  if (name === "get_weather") return await getWeather(input.city);
  if (name === "calculate") return calculate(input.expression);
  return `Unknown tool: ${name}`;
}

// --- Steps 5-9: the full loop ---
async function chat(userMessage: string) {
  console.log(`\nUser: ${userMessage}\n`);

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    tools,
    messages,
  });

  // Loop: keep going while Claude wants to call tools
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    console.log(
      `[Tool call]: ${toolUseBlocks.map((b) => `${b.name}(${JSON.stringify(b.input)})`).join(", ")}`
    );

    // Add Claude's response to the conversation history
    messages.push({ role: "assistant", content: response.content });

    // Run each tool and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const result = await runTool(
        block.name,
        block.input as Record<string, string>
      );
      console.log(`[Result]: ${result}`);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }

    // Send results back to Claude
    messages.push({ role: "user", content: toolResults });

    // New call — Claude may request more tools or give a final answer
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools,
      messages,
    });
  }

  // Loop exited — Claude finished with stop_reason: "end_turn"
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  console.log(`\nClaude: ${text?.text ?? "(no text response)"}`);
}

// Get the question from the terminal or use a default
const question = process.argv[2] || "What's the weather like in Salvador?";
chat(question);

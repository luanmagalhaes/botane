import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { runOrchestrator } from "./botane/pipeline.js";
import type { SSEEvent } from "./botane/types.js";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// Map of sessionId → SSE Response
const clients = new Map<string, Response>();

// SSE connection endpoint
app.get("/api/stream", (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: "sessionId required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Keep connection alive
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  clients.set(sessionId, res);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(sessionId);
  });
});

// Emit SSE event to a specific session
function emitToClient(sessionId: string, event: SSEEvent): void {
  const client = clients.get(sessionId);
  if (client) {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

// Chat endpoint
app.post("/api/chat", async (req: Request, res: Response) => {
  const { message, sessionId } = req.body as {
    message: string;
    sessionId: string;
  };

  if (!message || !sessionId) {
    res.status(400).json({ error: "message and sessionId required" });
    return;
  }

  if (!clients.has(sessionId)) {
    res.status(400).json({ error: "No active SSE connection for this session" });
    return;
  }

  res.json({ ok: true });

  // Run orchestrator async, stream events to SSE client
  try {
    await runOrchestrator(message, (event) => {
      emitToClient(sessionId, event);
    });
  } catch (err) {
    emitToClient(sessionId, {
      type: "error",
      content: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Botané Operations Platform running at http://localhost:${PORT}`);
});

"use client";

import { useState, useRef, useCallback } from "react";
import type { ChatMessage, AgentStep, SSEEvent } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const AGENT_LABELS: Record<string, string> = {
  read_inbox: "Reading inbox",
  get_email: "Reading email",
  parse_purchase_order: "Parsing purchase order",
  check_stock: "Checking stock",
  create_shopify_draft: "Creating Shopify draft",
  verify_order_total: "Verifying order total",
  inbox_reader: "Reading inbox",
  classifier: "Classifying email",
  po_parser: "Parsing order",
  stock_checker: "Checking stock",
  order_builder: "Building order",
  extract_structured_order_data: "Order extraction",
};

function makeId() {
  return Math.random().toString(36).substring(2, 11);
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const sessionId = useRef(makeId());
  const sseRef = useRef<EventSource | null>(null);

  const connectSSE = useCallback(() => {
    if (sseRef.current) return;

    const sse = new EventSource(
      `${API_BASE}/api/stream?sessionId=${sessionId.current}`
    );

    sse.onmessage = (e) => {
      const event: SSEEvent = JSON.parse(e.data);

      setMessages((prev) => {
        const msgs = [...prev];
        const last = msgs[msgs.length - 1];
        if (!last || last.role !== "assistant") return prev;

        const updated: ChatMessage = { ...last, steps: [...last.steps] };

        switch (event.type) {
          case "agent_start": {
            const step: AgentStep = {
              agent: event.agent!,
              label: AGENT_LABELS[event.agent!] ?? event.agent!,
              status: "running",
              logs: [],
            };
            updated.steps = [...updated.steps, step];
            break;
          }
          case "agent_log": {
            updated.steps = updated.steps.map((s) =>
              s.agent === event.agent && s.status === "running"
                ? { ...s, logs: [...s.logs, event.content!] }
                : s
            );
            break;
          }
          case "agent_done": {
            updated.steps = updated.steps.map((s) =>
              s.agent === event.agent && s.status === "running"
                ? { ...s, status: "done" }
                : s
            );
            break;
          }
          case "message_chunk": {
            updated.content += event.content;
            break;
          }
          case "message_done": {
            updated.streaming = false;
            setIsProcessing(false);
            break;
          }
          case "error": {
            updated.content = `Error: ${event.content}`;
            updated.streaming = false;
            setIsProcessing(false);
            break;
          }
        }

        msgs[msgs.length - 1] = updated;
        return msgs;
      });
    };

    sse.onerror = () => {
      sseRef.current?.close();
      sseRef.current = null;
      setTimeout(connectSSE, 2000);
    };

    sseRef.current = sse;
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isProcessing || !text.trim()) return;

      connectSSE();
      setIsProcessing(true);

      const userMsg: ChatMessage = {
        id: makeId(),
        role: "user",
        content: text,
        steps: [],
        streaming: false,
      };

      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: "",
        steps: [],
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId.current,
        }),
      });
    },
    [isProcessing, connectSSE]
  );

  return { messages, isProcessing, sendMessage, connectSSE };
}

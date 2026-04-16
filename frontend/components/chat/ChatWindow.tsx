"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { FlowerIcon } from "./FlowerIcon";
import { useChat } from "@/lib/useChat";

const SUGGESTIONS_WELCOME = [
  "Do we have any orders today?",
  "Process the De Bijenkorf purchase order",
  "Check stock for the Westwing order",
  "Create a Shopify draft for Royal Design",
];

export function ChatWindow() {
  const { messages, isProcessing, sendMessage, connectSSE } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { connectSSE(); }, [connectSSE]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "#F5F3EF", overflow: "hidden" }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          bgcolor: "#fff",
          borderBottom: "1px solid #E4DFD7",
          px: 3,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <FlowerIcon size={28} />
          <Box sx={{ fontWeight: 600, fontSize: 15, color: "#1A1916" }}>
            Botané Operations
          </Box>
        </Box>
        <Box
          sx={{
            fontSize: 11,
            fontWeight: 500,
            color: "#3D6B4F",
            bgcolor: "#EBF2EE",
            px: 1.25,
            py: 0.4,
            borderRadius: "20px",
            letterSpacing: "0.3px",
          }}
        >
          B2B Agent
        </Box>
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 3,
          py: 4,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          scrollBehavior: "smooth",
        }}
      >
        {isEmpty ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              textAlign: "center",
              py: 6,
            }}
          >
            <Box sx={{ opacity: 0.7 }}>
              <FlowerIcon size={64} />
            </Box>
            <Box>
              <Box sx={{ fontSize: 20, fontWeight: 500, color: "#1A1916" }}>
                Botané Operations Agent
              </Box>
              <Box sx={{ fontSize: 14, color: "#7A766E", mt: 0.5, maxWidth: 360, lineHeight: 1.6 }}>
                Ask about orders, stock levels, or wholesale partners
              </Box>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", mt: 1 }}>
              {SUGGESTIONS_WELCOME.map((s) => (
                <Box
                  key={s}
                  component="button"
                  onClick={() => sendMessage(s)}
                  sx={{
                    background: "#fff",
                    border: "1px solid #E4DFD7",
                    borderRadius: "20px",
                    px: 1.75,
                    py: 0.75,
                    fontSize: 13,
                    color: "#7A766E",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": { borderColor: "#3D6B4F", color: "#3D6B4F", bgcolor: "#EBF2EE" },
                  }}
                >
                  {s}
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </Box>

      {/* Input */}
      <Box
        sx={{
          bgcolor: "#F5F3EF",
          px: 3,
          pt: 2,
          pb: 3,
          flexShrink: 0,
        }}
      >
        <ChatInput onSend={sendMessage} disabled={isProcessing} />
      </Box>
    </Box>
  );
}

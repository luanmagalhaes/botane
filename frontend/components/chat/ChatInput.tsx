"use client";

import { useState, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

const SUGGESTIONS = [
  "Do we have any orders today?",
  "Process the De Bijenkorf purchase order",
  "Check stock for the Westwing order",
  "Create a Shopify draft for Royal Design",
];

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      {/* Suggestion chips */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
        {SUGGESTIONS.map((s) => (
          <Box
            key={s}
            component="button"
            onClick={() => !disabled && onSend(s)}
            disabled={disabled}
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
              "&:hover:not(:disabled)": {
                borderColor: "#3D6B4F",
                color: "#3D6B4F",
                background: "#EBF2EE",
              },
              "&:disabled": { opacity: 0.4, cursor: "not-allowed" },
            }}
          >
            {s}
          </Box>
        ))}
      </Box>

      {/* Input box */}
      <Box
        sx={{
          background: "#fff",
          border: "1px solid #E4DFD7",
          borderRadius: "16px",
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          px: 2,
          py: 1.25,
          transition: "border-color 0.15s",
          "&:focus-within": { borderColor: "#3D6B4F" },
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask about orders, stock, or partners..."
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: "inherit",
            fontSize: 14,
            color: "#1A1916",
            background: "transparent",
            lineHeight: 1.5,
            minHeight: 22,
          }}
        />
        <IconButton
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          size="small"
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            bgcolor: value.trim() && !disabled ? "#3D6B4F" : "#E4DFD7",
            color: "#fff",
            flexShrink: 0,
            transition: "background 0.15s",
            "&:hover": { bgcolor: "#2D5039" },
            "&:disabled": { bgcolor: "#E4DFD7" },
          }}
        >
          <ArrowUpwardIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

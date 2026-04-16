"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { AgentStep } from "@/lib/types";

interface AgentLogProps {
  steps: AgentStep[];
}

export function AgentLog({ steps }: AgentLogProps) {
  if (steps.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", px: "4px", mb: 1 }}>
      {steps.map((step, i) => (
        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Pulsing dot */}
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor:
                step.status === "running"
                  ? "#C9A96E"
                  : step.status === "done"
                  ? "#3D6B4F"
                  : "#E4DFD7",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.3 },
              },
              animation:
                step.status === "running" ? "pulse 1s ease-in-out infinite" : "none",
            }}
          />
          <Typography
            variant="caption"
            sx={{ fontWeight: 500, color: "text.primary", minWidth: 120 }}
          >
            {step.label}
          </Typography>
          {step.logs.length > 0 && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {step.logs[step.logs.length - 1]}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

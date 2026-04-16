"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { AgentLog } from "./AgentLog";
import { FlowerIcon } from "./FlowerIcon";
import type { ChatMessage } from "@/lib/types";

function escape(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(str: string) {
  return escape(str)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:#F0EDE8;padding:1px 5px;border-radius:4px;font-size:12px">$1</code>');
}

function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (
      /^\|.+\|$/.test(line.trim()) &&
      lines[i + 1] &&
      /^\|[-| :]+\|$/.test(lines[i + 1].trim())
    ) {
      const headers = line.trim().slice(1, -1).split("|").map((h) => h.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
        rows.push(lines[i].trim().slice(1, -1).split("|").map((c) => c.trim()));
        i++;
      }
      let table =
        '<table style="border-collapse:collapse;width:100%;font-size:13px;margin:8px 0"><thead><tr>';
      headers.forEach(
        (h) =>
          (table += `<th style="text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#7A766E;padding:8px 12px;border-bottom:2px solid #E4DFD7;background:#F5F3EF">${inline(h)}</th>`)
      );
      table += "</tr></thead><tbody>";
      rows.forEach((row) => {
        table += '<tr style="transition:background 0.1s" onmouseover="this.style.background=\'#F5F3EF\'" onmouseout="this.style.background=\'\'">';
        row.forEach(
          (cell) =>
            (table += `<td style="padding:8px 12px;border-bottom:1px solid #E4DFD7;color:#1A1916;vertical-align:top">${inline(cell)}</td>`)
        );
        table += "</tr>";
      });
      table += "</tbody></table>";
      output.push(table);
      continue;
    }

    output.push(inline(escape(line)));
    i++;
  }

  return output.join("<br>");
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Box
          sx={{
            maxWidth: "75%",
            bgcolor: "#3D6B4F",
            color: "#fff",
            borderRadius: "16px",
            borderBottomRightRadius: "4px",
            px: 2,
            py: 1.5,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {message.content}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-start", flexDirection: "column", alignItems: "flex-start", maxWidth: 680 }}>
      <AgentLog steps={message.steps} />

      {message.streaming && message.content === "" ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
          <FlowerIcon size={32} spinning />
          <Box sx={{ fontSize: 13, color: "text.secondary" }}>Processing...</Box>
        </Box>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            borderColor: "#E4DFD7",
            borderRadius: "16px",
            borderBottomLeftRadius: "4px",
            px: 2,
            py: 1.5,
            fontSize: 14,
            lineHeight: 1.6,
            color: "text.primary",
            bgcolor: "#fff",
            boxShadow: "none",
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
        </Paper>
      )}
    </Box>
  );
}

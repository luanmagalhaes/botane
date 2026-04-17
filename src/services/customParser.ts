// src/services/customParser.ts
import Anthropic from "@anthropic-ai/sdk";
import * as xlsx from "xlsx";
import type { SSEEmitter } from "../botane/types.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_SYSTEM_PROMPT = `You are a system that extracts structured data from emails and their attachments.

Your task is to extract:
- client_name (string)
- items (list of products)

Each item must contain:
- price (number, use dot as decimal separator, no currency symbols)
- currency (ISO 4217 format: EUR, USD, DKK, SEK, NOK, GBP, PLN only)
- ean_or_sku (string, preserve exactly as found)

The input may contain multiple languages and multiple sources:
- email body
- PDF attachments
- XLSX attachments

STRICT RULES:
- Always analyze ALL provided content, including attachments
- Always prioritize structured data from attachments over email body
- Extract ALL products found (do not limit to one)
- Each product must be a separate item in the "items" array
- If price or currency is shared across multiple products, apply it to all relevant items
- Do not guess or infer missing values
- If a field is not explicitly found, return null
- Do not translate values, extract as-is (except currency normalization)
- price must always be a number (e.g. 120.50, not "120,50" or "£120")
- currency must be one of: EUR, USD, DKK, SEK, NOK, GBP, PLN — otherwise return null

CLIENT IDENTIFICATION RULE:
- The client_name must represent the sender or the company placing the order
- The client_name must NEVER be "Botané"
- Ignore any references to Botané, as it is the receiving company
- Prefer names found in signatures, headers, or order context that indicate the sender/customer

OUTPUT RULES:
- Return ONLY valid JSON
- Do not include any explanation, text, or comments
- Do not include markdown
- Ensure the JSON is parseable

Output format:
{
  "client_name": string | null,
  "items": [
    {
      "price": number | null,
      "currency": string | null,
      "ean_or_sku": string | null
    }
  ]
}`;

/**
 * Parses raw Buffers to extract text from PDFs, Excel sheets, and plain text
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<{ text: string; rawBuffer?: Buffer; isPdf: boolean }> {
  const name = filename.toLowerCase();

  if (name.endsWith(".pdf")) {
    // Não extrai texto — retorna o buffer para envio direto à API
    return { text: "", rawBuffer: buffer, isPdf: true };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    try {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheetsData: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const sheetCsv = xlsx.utils.sheet_to_csv(sheet);
        sheetsData.push(`--- Sheet: ${sheetName} ---\n${sheetCsv}`);
      }
      return { text: sheetsData.join("\n\n").trim(), isPdf: false };
    } catch (e) {
      return { text: "", isPdf: false };
    }
  }

  return { text: buffer.toString("utf-8"), isPdf: false };
}

/**
 * Custom Extraction Tool
 */
export async function toolExtractCustomData(
  emailId: string,
  fetchEmailFn: (id: string) => Promise<any>,
  emit: SSEEmitter
): Promise<string> {
  emit({ type: "agent_log", agent: "po_parser", content: "Extracting specific items using custom rules..." });

  try {
    const email = await fetchEmailFn(emailId);
    if (!email) return JSON.stringify({ error: `Email ${emailId} not found` });
    const emailText = [
      `From: ${email.from}`,
      `Subject: ${email.subject}`,
      `Body:\n${email.body}`,
    ].join("\n");

    const userContent: any[] = [
      {
        type: "text",
        text: `
          You must extract structured order data from the following sources:

          1. Email content
          2. Attachments (VERY IMPORTANT — prioritize these)

          If an attachment (PDF or Excel) contains structured data, you MUST use it as the primary source.

          Return ONLY valid JSON.

          --- EMAIL CONTENT ---
          ${emailText}
          `,
      },
    ];

    const attachmentData = email.attachment?.rawBuffer || email.attachment?.content || email.attachment?.data;

    if (attachmentData) {
      const { name, rawBuffer } = email.attachment;
      emit({ type: "agent_log", agent: "po_parser", content: `Reading attachment: ${name}...` });

      const nameLower = name.trim().toLowerCase();
      if (nameLower.endsWith(".pdf")) {
        try {
          emit({ type: "agent_log", agent: "po_parser", content: "Sending PDF directly to Claude..." });
          userContent.push({
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: email.attachment.content.rawBuffer.toString("base64"),
            },
          });
        } catch (e) {
          emit({ type: "agent_log", agent: "po_parser", content: `Error reading PDF text: ${name}` });
        }
      } else if (
        nameLower.endsWith(".xlsx") ||
        nameLower.endsWith(".xls") ||
        nameLower.endsWith(".csv")
      ) {
        try {
          const workbook = xlsx.read(rawBuffer, { type: "buffer" });
          const sheetsData = workbook.SheetNames.map((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            return `--- Sheet: ${sheetName} ---\n${xlsx.utils.sheet_to_csv(sheet)}`;
          });
          userContent.push({
            type: "text",
            text: `
              --- ATTACHMENT (${name}) - EXCEL DATA ---
              This file contains structured rows of products.

              Each row represents a product.

              Extract ALL items from this data.

              ${sheetsData.join("\n\n")}
              `,
          });
        } catch (e) {
          emit({ type: "agent_log", agent: "po_parser", content: `Warning: could not parse Excel file: ${name}` });
        }
      } else {
        userContent.push({
          type: "text",
          text: `\n--- ATTACHMENT CONTENT (${name}) ---\n${rawBuffer.toString("utf-8")}`,
        });
      }
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = response.content.find(b => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";
    let orderData;
    try {
      orderData = JSON.parse(text);
    } catch {
      return JSON.stringify({ error: "Invalid JSON returned", raw: text });
    }

    emit({
      type: "agent_log",
      agent: "po_parser",
      content: `Custom Parse Success: found ${orderData.items?.length || 0} items for client ${orderData.client_name || "Unknown"}`,
    });

    return JSON.stringify(orderData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    emit({ type: "agent_log", agent: "po_parser", content: `Custom parse error: ${msg}` });
    return JSON.stringify({ error: msg });
  }
}
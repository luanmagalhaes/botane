import Anthropic from "@anthropic-ai/sdk";
import * as xlsx from "xlsx";
import type { SSEEmitter, EmailAttachment } from "../botane/types.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_SYSTEM_PROMPT = `You are a system that extracts structured data from emails and their attachments.

Your task is to extract:
- client_name (string)
- items (list of products)

Each item must contain:
- price (number, use dot as decimal separator, no currency symbols)
- currency (ISO 4217 format: EUR, USD, DKK, SEK, NOK, GBP, PLN only)
- quantity (number)
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
      "quantity": number | null,
      "ean_or_sku": string | null
    }
  ]
}`;

/**
 * Parses raw Buffers to extract text from PDFs, Excel sheets, and plain text.
 * For PDFs, returns empty text + rawBuffer so the caller can send it to the API directly.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<{ text: string; rawBuffer?: Buffer; isPdf: boolean }> {
  const name = filename.toLowerCase();

  if (name.endsWith(".pdf")) {
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
    } catch {
      return { text: "", isPdf: false };
    }
  }

  return { text: buffer.toString("utf-8"), isPdf: false };
}

function buildAttachmentContent(
  attachment: EmailAttachment,
  emit: SSEEmitter
): Anthropic.ContentBlockParam | null {
  const name = attachment.name.toLowerCase();

  if (name.endsWith(".pdf") && attachment.rawBuffer) {
    emit({ type: "agent_log", agent: "po_parser", content: `Sending PDF to Claude: ${attachment.name}` });
    return {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: attachment.rawBuffer.toString("base64"),
      },
    };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    if (attachment.content) {
      emit({ type: "agent_log", agent: "po_parser", content: `Reading Excel: ${attachment.name}` });
      return {
        type: "text",
        text: `--- ATTACHMENT (${attachment.name}) - SPREADSHEET DATA ---\nExtract ALL items from this data.\n\n${attachment.content}`,
      };
    }
    return null;
  }

  if (attachment.content) {
    return {
      type: "text",
      text: `--- ATTACHMENT (${attachment.name}) ---\n${attachment.content}`,
    };
  }

  return null;
}

/**
 * Custom extraction tool — reads email + attachment and extracts structured order data.
 */
export async function toolExtractCustomData(
  emailId: string,
  fetchEmailFn: (id: string) => Promise<any>,
  emit: SSEEmitter
): Promise<string> {
  emit({ type: "agent_log", agent: "po_parser", content: "Extracting structured order data..." });

  try {
    const email = await fetchEmailFn(emailId);
    if (!email) return JSON.stringify({ error: `Email ${emailId} not found` });

    const userContent: Anthropic.ContentBlockParam[] = [
      {
        type: "text",
        text: `Extract structured order data from the following sources:

1. Email content
2. Attachments (prioritize these if present)

Return ONLY valid JSON.

--- EMAIL CONTENT ---
From: ${email.from}
Subject: ${email.subject}
Body:
${email.body}`,
      },
    ];

    if (email.attachment) {
      const block = buildAttachmentContent(email.attachment, emit);
      if (block) userContent.push(block);
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      temperature: 0,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const text = textBlock?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return JSON.stringify({ error: "Invalid JSON returned", raw: text });

    const orderData = JSON.parse(jsonMatch[0]);

    emit({
      type: "agent_log",
      agent: "po_parser",
      content: `Extracted ${orderData.items?.length ?? 0} items for client ${orderData.client_name ?? "Unknown"}`,
    });

    return JSON.stringify(orderData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    emit({ type: "agent_log", agent: "po_parser", content: `Custom parse error: ${msg}` });
    return JSON.stringify({ error: msg });
  }
}

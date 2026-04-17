import Anthropic from "@anthropic-ai/sdk";
import { STOCK_DATA } from "./mock-data.js";
import { fetchInbox, fetchEmail } from "./gmail.js";
import type {
  SSEEmitter,
  ShopifyDraft,
  ShopifyDraftItem,
  ParsedOrder,
} from "./types.js";
import { toolExtractCustomData } from "../services/customParser.js";
import { createShopifyDraftOrder } from "../services/shopify.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory cache for parsed orders during a session
const parsedOrderCache = new Map<string, ParsedOrder>();

const SYSTEM_PROMPT = `You are the B2B Operations Agent for Botané Studios, a premium botanical design brand based in Copenhagen, Denmark.

Your job is to help the operations team manage incoming wholesale purchase orders from retail partners:
- De Bijenkorf (Netherlands) — sends PDF purchase orders in Dutch, EUR currency
- Westwing (Germany) — sends multi-page PDF purchase orders, EUR currency
- Royal Design (Sweden) — sends PDF purchase orders, SEK currency
- Gant (Sweden/International) — sends Excel files, multi-store deliveries, SEK currency

When the user asks a question:
1. Always call read_inbox first when asked about orders or emails
2. Use get_email to read a specific email's full content
3. Use parse_purchase_order to extract structured data from a PO email
4. Use check_stock to verify availability before creating any order
5. Use create_shopify_draft to build the draft order
6. Use verify_order_total to confirm the draft matches the original PO

IMPORTANT: This inbox is connected to a real Gmail account. When listing emails, always show the REAL sender email address (the "from" field) in your response. Do not hide or replace sender addresses. Show the actual data from the inbox.

Be concise, professional, and business-focused. Format currency values clearly.
When something is out of stock, clearly flag it. Never create an order without checking stock first.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "read_inbox",
    description:
      "Read all emails in the Botané B2B inbox. Returns a list of emails with sender, subject, date, partner, and type (new_order, tracking_request, complaint, etc). Always call this first when the user asks about orders or emails.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_email",
    description:
      "Get the full content of a specific email including attachment data. Use this after read_inbox to inspect a specific email in detail.",
    input_schema: {
      type: "object" as const,
      properties: {
        email_id: {
          type: "string",
          description: "The email ID from read_inbox results",
        },
      },
      required: ["email_id"],
    },
  },
  {
    name: "parse_purchase_order",
    description:
      "Extract structured order data from a purchase order email. Returns items with SKU, name, quantity, price, PO number, currency, and order total.",
    input_schema: {
      type: "object" as const,
      properties: {
        email_id: {
          type: "string",
          description: "The email ID containing the purchase order",
        },
      },
      required: ["email_id"],
    },
  },
  {
    name: "check_stock",
    description:
      "Check current stock availability for all items in a parsed order. Returns in-stock status and restock dates for out-of-stock items.",
    input_schema: {
      type: "object" as const,
      properties: {
        email_id: {
          type: "string",
          description: "The email ID of the order to check stock for",
        },
      },
      required: ["email_id"],
    },
  },
  {
    name: "create_shopify_draft",
    description:
      "Create a draft order in Shopify from a parsed and stock-verified purchase order. Returns the draft order details ready for human review.",
    input_schema: {
      type: "object" as const,
      properties: {
        email_id: {
          type: "string",
          description: "The email ID of the order to process into a Shopify draft",
        },
      },
      required: ["email_id"],
    },
  },
  {
    name: "verify_order_total",
    description:
      "Verify that the Shopify draft order total matches the original purchase order total exactly. Returns match status and any discrepancy.",
    input_schema: {
      type: "object" as const,
      properties: {
        email_id: {
          type: "string",
          description: "The email ID of the order to verify",
        },
      },
      required: ["email_id"],
    },
  },
  {
    name: "extract_structured_order_data",
    description:
      "A custom extraction tool to extract complex order items from emails and Excel/PDF files. Use this ONLY when you need items with exact ean_or_sku, strict currency standard, prices, and the correct client_name. Returns a strict JSON dictionary.",
    input_schema: {
      type: "object" as const,
      properties: {
        email_id: {
          type: "string",
          description: "The email ID from read_inbox results",
        },
      },
      required: ["email_id"],
    },
  },
];

// --- Tool implementations ---

async function toolReadInbox(emit: SSEEmitter): Promise<string> {
  emit({ type: "agent_log", agent: "inbox_reader", content: "Connecting to Gmail..." });

  try {
    const emails = await fetchInbox();

    const summary = emails.map((email) => ({
      id: email.id,
      from: email.from,
      subject: email.subject,
      date: email.date,
      partner: email.partner,
      type: email.type,
      has_attachment: !!email.attachment,
    }));

    emit({ type: "agent_log", agent: "inbox_reader", content: `Found ${emails.length} emails` });
    return JSON.stringify(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    emit({ type: "agent_log", agent: "inbox_reader", content: `Gmail error: ${msg}` });
    return JSON.stringify({ error: msg });
  }
}

async function toolGetEmail(emailId: string, emit: SSEEmitter): Promise<string> {
  emit({ type: "agent_log", agent: "classifier", content: `Reading email ${emailId}...` });

  try {
    const email = await fetchEmail(emailId);
    if (!email) return JSON.stringify({ error: `Email ${emailId} not found` });

    emit({ type: "agent_log", agent: "classifier", content: `From: ${email.from}` });
    return JSON.stringify(email);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    emit({ type: "agent_log", agent: "classifier", content: `Error: ${msg}` });
    return JSON.stringify({ error: msg });
  }
}

async function toolParsePurchaseOrder(emailId: string, emit: SSEEmitter): Promise<string> {
  emit({ type: "agent_log", agent: "po_parser", content: "Reading purchase order..." });

  // Return from cache if already parsed
  const cached = parsedOrderCache.get(emailId);
  if (cached) {
    emit({ type: "agent_log", agent: "po_parser", content: `PO ${cached.po_number} (from cache)` });
    return JSON.stringify(cached);
  }

  try {
    const email = await fetchEmail(emailId);
    if (!email) return JSON.stringify({ error: `Email ${emailId} not found` });

    if (email.type !== "new_order") {
      return JSON.stringify({ error: "This email does not contain a purchase order" });
    }

    // Build the text content to parse
    const content = [
      `From: ${email.from}`,
      `Subject: ${email.subject}`,
      `Body:\n${email.body}`,
      email.attachment ? `\nAttachment (${email.attachment.name}):\n${email.attachment.content}` : "",
    ].join("\n");

    emit({ type: "agent_log", agent: "po_parser", content: "Extracting line items with AI..." });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Extract the purchase order data from this email and return ONLY a valid JSON object with this exact structure:
{
  "po_number": "string",
  "partner": "de_bijenkorf" | "westwing" | "royal_design" | "gant" | "unknown",
  "currency": "EUR" | "SEK" | "USD" | "GBP",
  "delivery_date": "string",
  "total": number,
  "items": [
    {
      "sku": "string",
      "name": "string",
      "quantity": number,
      "unit_price": number,
      "currency": "string"
    }
  ]
}

EMAIL CONTENT:
${content}

Return ONLY the JSON, no explanation.`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";

    // Extract JSON from the response (strip markdown code fences if present)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return JSON.stringify({ error: "Could not parse order data from email" });

    const order: ParsedOrder = JSON.parse(jsonMatch[0]);

    // Store in cache
    parsedOrderCache.set(emailId, order);

    emit({ type: "agent_log", agent: "po_parser", content: `PO ${order.po_number} — ${order.items.length} line items — ${order.currency} ${order.total.toLocaleString()}` });
    return JSON.stringify(order);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    emit({ type: "agent_log", agent: "po_parser", content: `Parse error: ${msg}` });
    return JSON.stringify({ error: msg });
  }
}

function toolCheckStock(emailId: string, emit: SSEEmitter): string {
  emit({ type: "agent_log", agent: "stock_checker", content: "Checking stock availability..." });

  const order = parsedOrderCache.get(emailId);
  if (!order) return JSON.stringify({ error: "Order not found. Call parse_purchase_order first." });

  const results = order.items.map((item) => {
    const stock = STOCK_DATA[item.sku];
    const available = stock?.available ?? 0;
    const in_stock = available >= item.quantity;

    if (!in_stock) {
      emit({ type: "agent_log", agent: "stock_checker", content: `Out of stock: ${item.name} (need ${item.quantity}, have ${available})` });
    }

    return {
      sku: item.sku,
      name: item.name,
      quantity_requested: item.quantity,
      available,
      in_stock,
      restock_date: in_stock ? undefined : stock?.restock_date,
    };
  });

  const oos = results.filter((r) => !r.in_stock);
  if (oos.length === 0) {
    emit({ type: "agent_log", agent: "stock_checker", content: "All items in stock ✓" });
  } else {
    emit({ type: "agent_log", agent: "stock_checker", content: `${oos.length} item(s) out of stock` });
  }

  return JSON.stringify(results);
}

// function toolCreateShopifyDraft(emailId: string, emit: SSEEmitter): string {
//   emit({ type: "agent_log", agent: "order_builder", content: "Building Shopify draft order..." });

//   const order: ParsedOrder | undefined = parsedOrderCache.get(emailId);
//   if (!order) return JSON.stringify({ error: "Order not found. Call parse_purchase_order first." });

//   const draftItems: ShopifyDraftItem[] = order.items.map((item) => {
//     const stock = STOCK_DATA[item.sku];
//     const available = stock?.available ?? 0;
//     const in_stock = available >= item.quantity;
//     return {
//       ...item,
//       in_stock,
//       available,
//       restock_date: in_stock ? undefined : stock?.restock_date,
//     };
//   });

//   const inStock = draftItems.filter((i) => i.in_stock);
//   const oos = draftItems.filter((i) => !i.in_stock);
//   const draftTotal = inStock.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

//   const draft: ShopifyDraft = {
//     draft_id: `DRAFT-${order.po_number}-${Date.now()}`,
//     partner: order.partner,
//     po_number: order.po_number,
//     items: draftItems,
//     items_in_stock: inStock,
//     items_oos: oos,
//     total: Math.round(draftTotal * 100) / 100,
//     currency: order.currency,
//     verified: false,
//     created_at: new Date().toISOString(),
//   };

//   emit({ type: "agent_log", agent: "order_builder", content: `Draft created: ${inStock.length} items, ${order.currency} ${draft.total.toLocaleString()}` });
//   if (oos.length > 0) {
//     emit({ type: "agent_log", agent: "order_builder", content: `${oos.length} item(s) excluded (out of stock)` });
//   }

//   return JSON.stringify(draft);
// }

async function toolCreateShopifyDraft(emailId: string, emit: SSEEmitter): Promise<string> {
  emit({ type: "agent_log", agent: "order_builder", content: "Building Shopify draft order..." });

  const order: ParsedOrder | undefined = parsedOrderCache.get(emailId);
  if (!order) return JSON.stringify({ error: "Order not found. Call parse_purchase_order first." });

  const draftItems: ShopifyDraftItem[] = order.items.map((item) => {
    const stock = STOCK_DATA[item.sku];
    const available = stock?.available ?? 0;
    const in_stock = available >= item.quantity;
    return {
      ...item,
      in_stock,
      available,
      restock_date: in_stock ? undefined : stock?.restock_date,
    };
  });

  const inStock = draftItems.filter((i) => i.in_stock);
  const oos = draftItems.filter((i) => !i.in_stock);
  const draftTotal = inStock.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  if (inStock.length === 0) {
    return JSON.stringify({ error: "No items are in stock, unable to create draft order." });
  }

  emit({ type: "agent_log", agent: "order_builder", content: "Connecting to Shopify API..." });
  const shopifyResult = await createShopifyDraftOrder(inStock, order.partner);

  if (!shopifyResult.success) {
    emit({ type: "agent_log", agent: "order_builder", content: "Shopify API validation failed." });
    return JSON.stringify({ error: shopifyResult.error });
  }

  const draft: ShopifyDraft = {
    draft_id: shopifyResult.draftOrderId?.toString() || `DRAFT-${order.po_number}-${Date.now()}`,
    partner: order.partner,
    po_number: order.po_number,
    items: draftItems,
    items_in_stock: inStock,
    items_oos: oos,
    total: Math.round(draftTotal * 100) / 100,
    currency: order.currency,
    verified: false,
    created_at: new Date().toISOString(),
    shopify_invoice_url: shopifyResult.invoiceUrl
  };

  emit({ type: "agent_log", agent: "order_builder", content: `Draft created in Shopify: #${shopifyResult.draftOrderId}` });
  if (oos.length > 0) {
    emit({ type: "agent_log", agent: "order_builder", content: `${oos.length} item(s) excluded (out of stock)` });
  }

  return JSON.stringify(draft);
}

function toolVerifyOrderTotal(emailId: string, emit: SSEEmitter): string {
  emit({ type: "agent_log", agent: "order_builder", content: "Verifying order total..." });

  const order = parsedOrderCache.get(emailId);
  if (!order) return JSON.stringify({ error: "Order not found." });

  const inStockItems = order.items.filter((item) => {
    const stock = STOCK_DATA[item.sku];
    return (stock?.available ?? 0) >= item.quantity;
  });

  const draftTotal = Math.round(
    inStockItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0) * 100
  ) / 100;

  const oosItems = order.items.filter((item) => {
    const stock = STOCK_DATA[item.sku];
    return (stock?.available ?? 0) < item.quantity;
  });

  const match = oosItems.length === 0 && Math.abs(draftTotal - order.total) < 0.01;

  if (match) {
    emit({ type: "agent_log", agent: "order_builder", content: `Total verified ✓ — ${order.currency} ${draftTotal.toLocaleString()}` });
  } else if (oosItems.length > 0) {
    emit({ type: "agent_log", agent: "order_builder", content: `Total adjusted: ${oosItems.length} out-of-stock items excluded` });
  }

  return JSON.stringify({
    po_total: order.total,
    draft_total: draftTotal,
    currency: order.currency,
    match,
    oos_items: oosItems.length,
    note: oosItems.length > 0
      ? "Draft total is lower than PO total due to out-of-stock items. Human review required."
      : "Totals match exactly.",
  });
}

// --- Tool dispatcher ---

async function runTool(
  name: string,
  input: Record<string, string>,
  emit: SSEEmitter
): Promise<string> {
  switch (name) {
    case "read_inbox":
      return await toolReadInbox(emit);
    case "get_email":
      return await toolGetEmail(input.email_id, emit);
    case "parse_purchase_order":
      return await toolParsePurchaseOrder(input.email_id, emit);
    case "check_stock":
      return toolCheckStock(input.email_id, emit);
    case "create_shopify_draft":
      return await toolCreateShopifyDraft(input.email_id, emit);
    case "verify_order_total":
      return toolVerifyOrderTotal(input.email_id, emit);
    case "extract_structured_order_data":
      return await toolExtractCustomData(input.email_id, fetchEmail, emit);
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// --- Orchestrator ---

export async function runOrchestrator(
  userMessage: string,
  emit: SSEEmitter
): Promise<void> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages,
  });

  const MAX_ITERATIONS = 12;
  let iterations = 0;

  while (response.stop_reason === "tool_use" && iterations < MAX_ITERATIONS) {
    iterations++;

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      emit({ type: "agent_start", agent: block.name });

      const result = await runTool(
        block.name,
        block.input as Record<string, string>,
        emit
      );

      emit({ type: "agent_done", agent: block.name });

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }

    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });
  }

  // Stream final text response word by word
  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );

  if (textBlock) {
    const words = textBlock.text.split(" ");
    for (const word of words) {
      emit({ type: "message_chunk", content: word + " " });
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  emit({ type: "message_done" });
}

# Botané Operations Platform

AI-powered B2B order management agent for Botané Studios. Chat naturally with the agent to read purchase orders from wholesale partners, check stock availability, and create Shopify draft orders — all in real time.

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| AI | Anthropic API — `claude-sonnet-4-6` |
| Agent pattern | Tool use loop (ReAct) |
| Server | Express 5 |
| Real-time | Server-Sent Events (SSE) |
| Frontend | Next.js 16 + shadcn/ui + Tailwind CSS |
| Email | Gmail via IMAP (`imapflow` + `mailparser`) |
| PDF parsing | `pdf-parse` |

## Project structure

```
src/                          # Express backend
  server.ts                   # HTTP server + SSE endpoints
  botane/
    pipeline.ts               # Agent orchestrator + tool definitions
    gmail.ts                  # Gmail IMAP connection + email fetching
    types.ts                  # TypeScript interfaces
    mock-data.ts              # Stock data (Shopify integration pending)
  index.ts                    # Standalone API test script
  tools.ts                    # Tool use learning example

frontend/                     # Next.js frontend
  app/
    page.tsx                  # Entry point
    layout.tsx                # Root layout
    icon.tsx                  # Favicon (flower SVG)
  components/chat/
    ChatWindow.tsx            # Main chat layout
    MessageBubble.tsx         # User + assistant message rendering
    AgentLog.tsx              # Real-time agent activity steps
    ChatInput.tsx             # Textarea + suggestion buttons
  lib/
    useChat.ts                # SSE hook + message state
    types.ts                  # Frontend types
```

## How the agent works

1. User sends a message via the chat UI
2. `POST /api/chat` triggers `runOrchestrator()` in `pipeline.ts`
3. Claude decides which tools to call (read inbox, parse order, check stock, etc.)
4. Results stream back to the browser via SSE (`GET /api/stream`)
5. The agent loops until it has a final answer, then streams it word by word

## Tools available to the agent

| Tool | What it does |
|---|---|
| `read_inbox` | Lists all emails in the B2B inbox |
| `get_email` | Reads the full content of a specific email |
| `parse_purchase_order` | Extracts structured line items from a PO |
| `check_stock` | Checks availability for each SKU |
| `create_shopify_draft` | Builds a Shopify draft order |
| `verify_order_total` | Confirms the draft total matches the PO |

## Wholesale partners supported

- **De Bijenkorf** (Netherlands) — PDF purchase orders, EUR
- **Westwing** (Germany) — PDF purchase orders, EUR
- **Royal Design** (Sweden) — PDF purchase orders, SEK
- **Gant** (Sweden/International) — Excel files, SEK

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd agentic
npm install
```

### 2. Environment variables

Create a `.env` file or export variables in your terminal:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export GMAIL_USER="botaneorders@gmail.com"
export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

- Anthropic API key: [console.anthropic.com](https://console.anthropic.com)
- Gmail App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

### 3. Run the backend

```bash
npm run dev
```

Server starts at `http://localhost:4000`.

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at `http://localhost:3000` (or next available port).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Botané chat server (port 4000) |
| `npm start` | Run the basic API test script |
| `npm run tools` | Run the tool use example (weather + calculator) |

## Dependencies

```
@anthropic-ai/sdk   Anthropic API client
express             HTTP server
tsx                 TypeScript runner (no build step needed)
typescript          Type checking
@types/express      Express type definitions
@types/node         Node.js type definitions
```

## Example queries

Once the server is running, open `http://localhost:4000` and try:

- "Did we have any orders today?"
- "Process the De Bijenkorf purchase order"
- "Check stock for the Westwing order"
- "Create a Shopify draft for Royal Design"
- "Verify the total on the De Bijenkorf order"

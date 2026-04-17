# Botane Operations Platform

AI-powered B2B order management agent for Botane Studios.

## Architecture

- **Backend:** Express 5 + TypeScript (runs via `tsx`, no build step)
- **Frontend:** Next.js 16 + MUI + Tailwind CSS (in `frontend/`)
- **AI:** Anthropic API (`claude-sonnet-4-6` for orchestration, `claude-haiku-4-5-20251001` for extraction)
- **Email:** Gmail via IMAP (`imapflow` + `mailparser`)
- **Real-time:** Server-Sent Events (SSE) for streaming agent activity to the browser

## Code conventions

- All code, comments, variable names, and commit messages must be in English
- TypeScript strict mode enabled
- Never commit API keys or credentials
- No Co-Authored-By lines in commits

## Environment variables

```
ANTHROPIC_API_KEY   — Anthropic API key
GMAIL_USER          — Gmail address for the B2B inbox
GMAIL_APP_PASSWORD  — Gmail app password (16 chars, from Google account settings)
```

## Running

```bash
# Backend (port 4000)
npm run dev

# Frontend (port 3002 or next available)
cd frontend && npm run dev
```

## Git workflow

- `master` — production
- `develop` — integration branch
- Feature branches off `develop`, merge back via PR

## Key files

- `src/server.ts` — Express server, SSE endpoints, CORS
- `src/botane/pipeline.ts` — Agent orchestrator, tool definitions, tool loop
- `src/botane/gmail.ts` — IMAP connection, email fetching, attachment extraction
- `src/botane/types.ts` — All TypeScript interfaces
- `src/services/shopify.ts` — Shopify Admin API client (stock lookup + draft order creation)
- `src/services/customParser.ts` — PDF/Excel extraction tool using Claude
- `frontend/components/chat/` — Chat UI components (ChatWindow, MessageBubble, AgentLog, ChatInput)
- `frontend/lib/useChat.ts` — SSE hook and message state management

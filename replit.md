# PrivateClaw — Private Limit Order DEX

A privacy-first limit order DEX (decentralized exchange) built on the Aleo blockchain using ZK proofs.

## Architecture

- **Frontend**: React 18 + Vite + TypeScript, served on port 5000
- **Backend**: Express.js API server on port 3001, proxied from Vite at `/api`
- **Blockchain**: Aleo wallet adapters (Leo, Shield) for ZK-based order privacy
- **Database**: Supabase (Postgres) via `@supabase/supabase-js`
- **AI**: Cloudflare AI (Llama 3.1 8B) for trading assistant features
- **Styling**: Tailwind CSS + shadcn/ui components

## Key Directories

```
src/          - React frontend
  components/ - UI components (shadcn/ui + custom)
  pages/      - Route-level pages (Trade, Orders, etc.)
  hooks/      - Custom React hooks
  integrations/supabase/ - Supabase client
  lib/        - Utility helpers
server/       - Express API server (index.ts)
api/          - Vercel serverless functions (legacy, not used on Replit)
public/       - Static assets
```

## Running the App

The app runs via `npm run dev`, which concurrently starts:
1. Vite dev server on port 5000 (frontend)
2. Express server via `tsx watch server/index.ts` on port 3001 (API)

## Required Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token for AI features |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID for AI features |

## API Endpoints

- `POST /api/ai-trading-assistant` — Returns AI trading suggestions for a market pair
- `POST /api/ai-trading-chat` — Streaming chat with AI trading assistant (SSE)

## Notes

- The `api/` directory contains Vercel serverless functions — these are not used in the Replit environment (the Express server in `server/` handles all API routes instead)
- Vite proxies `/api` requests to `http://localhost:3001`
- `vercel.json` is present but not used on Replit

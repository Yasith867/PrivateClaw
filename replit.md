# PrivateClaw — Privacy-First Limit Order Trading on Aleo

## Overview

PrivateClaw is a privacy-first DEX (decentralized exchange) built on the Aleo blockchain. It features a private limit order book where order sizes, balances, and trading strategies stay encrypted via ZK proofs — only aggregated price levels are public.

## Architecture

- **Frontend**: React + Vite (TypeScript), runs on port 5000
- **API Server**: Express.js, runs on port 3001 — serves AI trading assistant endpoints
- **Blockchain**: Aleo Testnet Beta via `@demox-labs/aleo-wallet-adapter` (Leo Wallet)
- **State Management**: Zustand
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
- **Charts**: lightweight-charts (TradingView-style price charts)
- **AI Features**: OpenAI GPT-4o-mini (server-side, keyed via `OPENAI_API_KEY`)

## Key Features

- Live order book with bid/ask depth visualization
- Price chart with OHLCV data
- AI Trading Assistant (suggestions + streaming chat) — calls `/api/ai-trading-assistant` and `/api/ai-trading-chat`
- Leo Wallet integration for signing Aleo transactions
- Create market / place order / cancel order via `prediction_marketv01.aleo` program
- Portfolio view with order history

## Running the App

```bash
npm run dev
```

This starts both:
1. The Express API server (`server/index.ts`) on port 3001 via `tsx watch`
2. The Vite dev server on port 5000 (proxies `/api/*` to port 3001)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Optional | Enables AI Trading Assistant features |

## Project Structure

```
src/
  components/      # React components (Header, AITradingAssistant, OrderBook, etc.)
  pages/           # Route pages (Index, MarketDetail, Portfolio, NotFound)
  lib/             # Utilities: aleoService, mockData, ohlcvData, schema, store, utils
  integrations/    # Supabase client stubs (kept for type compatibility)
  hooks/           # Custom React hooks
server/
  index.ts         # Express server with /api/ai-trading-assistant and /api/ai-trading-chat
api/
  ai.ts            # Legacy Vercel-style handler (unused in Replit)
```

## Notes

- No database — app uses mock data (`src/lib/mockData.ts`) and live Aleo blockchain state
- Supabase is still listed as a dependency (for type compatibility) but not actively used
- The `api/ai.ts` file is a legacy Vercel serverless function stub; the actual endpoints are in `server/index.ts`

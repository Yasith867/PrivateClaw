# PrivateClaw — Private Limit Order DEX

A privacy-first limit order DEX (decentralized exchange) built on the Aleo blockchain using ZK proofs.

## Architecture

- **Frontend**: React 18 + Vite + TypeScript, served on port 5000
- **Backend**: Express.js API server on port 3001, proxied from Vite at `/api`
- **Blockchain**: Aleo wallet adapters (Leo, Shield) for ZK-based order privacy
- **Smart Contract**: Leo program `private_claw.aleo` at `leo/src/main.leo`
- **AI**: Cloudflare AI (Llama 3.1 8B) for trading assistant features
- **Styling**: Tailwind CSS + shadcn/ui components

## Key Directories

```
leo/              - Leo smart contract
  src/main.leo    - Contract code (place_bet, cancel_order, create_market)
  program.json    - Program metadata
  deploy.sh       - Automated build + deploy script (reads .env)
src/              - React frontend
  components/     - UI components (WalletProvider, BettingModal, Header, etc.)
  pages/          - Route-level pages (Trade, Orders)
  hooks/          - Custom React hooks
  lib/aleoService.ts - Builds Aleo TransactionOptions for each Leo transition
  lib/store.ts    - Zustand global state
server/           - Express API server (index.ts)
api/              - Vercel serverless functions (legacy, not used on Replit)
```

## Running the App

The app runs via `npm run dev`, which concurrently starts:
1. Vite dev server on port 5000 (frontend)
2. Express server via `tsx watch server/index.ts` on port 3001 (API)

## Leo Contract

`private_claw.aleo` has three transitions:
- `place_bet(market_id, side, amount)` — places a private limit order, returns Order record
- `cancel_order(order)` — cancels an existing order record
- `create_market(market_id, resolution_timestamp, num_outcomes)` — lists a new trading pair

## Required Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `ALEO_PRIVATE_KEY` | Your Aleo account private key (for contract deployment only) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token for AI features |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID for AI features |

## Deploying the Leo Contract (local machine required)

The Replit sandbox cannot compile the Leo CLI (Rust toolchain too large). Run these on your local machine:

```bash
# Install Leo CLI (Rust 1.88+ required)
cargo install leo-lang

# Build contract
cd leo && leo build

# Test locally
leo run place_bet 42field 1field 500000u64

# Deploy (uses ALEO_PRIVATE_KEY from .env)
bash deploy.sh
```

## API Endpoints

- `POST /api/ai-trading-assistant` — Returns AI trading suggestions for a market pair
- `POST /api/ai-trading-chat` — Streaming chat with AI trading assistant (SSE)

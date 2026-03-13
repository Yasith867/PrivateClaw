# PrivateClaw

A privacy-first limit order DEX built on the Aleo blockchain — where order sizes, balances, and trading strategies stay encrypted on-chain using zero-knowledge proofs.

---

## Overview

PrivateClaw is a limit order book DEX where privacy is a core primitive, not an afterthought. Powered by Aleo's ZK smart contracts, trades are cryptographically private while remaining trustlessly verifiable on-chain. Only aggregated price levels are ever publicly visible.

---

## Core Principles

- **Encrypted Orders** — Individual order sizes are encrypted on-chain via `u64.private`
- **Private Balances** — Account balances are never publicly exposed
- **ZK Settlement** — Trade execution is validated through zero-knowledge transitions
- **Non-Custodial** — Users retain full control of their keys and funds
- **AI-Assisted Trading** — On-chain privacy combined with off-chain AI market analysis

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State Management | Zustand, TanStack Query |
| Blockchain | Aleo Testnet |
| Smart Contracts | Leo (`prediction_marketv01.aleo`) |
| Wallet | Shield Wallet (`@provablehq/aleo-wallet-adaptor-shield`) |
| AI Assistant | Cloudflare Workers AI (Llama 3.1 8B) |
| Backend API | Express (dev) / Vercel Serverless + Edge Functions (prod) |

---

## Smart Contract

**Program:** `prediction_marketv01.aleo`
Running on Aleo Testnet.

### Transitions

| Transition | Description |
|---|---|
| `create_market` | Lists a new trading pair on-chain |
| `place_bet` | Places a private buy or sell limit order |
| `cancel_order` | Cancels an open private order |
| `settle_trade` | Matches and privately settles orders |

### `place_bet` Inputs
```
input r0 as field.public;   // market_id
input r1 as field.public;   // outcome_id (1field = buy, 2field = sell)
input r2 as u64.private;    // order amount (encrypted)
```

Order amounts are encrypted via `u64.private`. Limit pricing is handled client-side — no price is ever written publicly on-chain.

---

## Features

- Live aggregated order book (individual sizes never revealed)
- OHLCV candlestick chart (mock data on Testnet)
- Trade history with privacy-preserving display
- Portfolio dashboard with order tracking
- Transaction lifecycle monitoring
- On-chain trading pair creation
- **AI Trading Assistant** — market analysis + streaming chat powered by Cloudflare AI
- Dark / Light mode

---

## AI Trading Assistant

The AI Trading Assistant analyzes the live order book and provides:

- **Suggestions tab** — 2–4 actionable buy/sell suggestions with confidence ratings
- **Ask AI tab** — streaming chat to ask anything about the current market

Powered by **Cloudflare Workers AI** (Llama 3.1 8B Instruct) via the free REST API.
Every AI suggestion still requires explicit Shield Wallet approval before execution.

---

## Transaction Lifecycle

1. User configures order in the UI
2. Shield Wallet prompts for approval
3. Transaction is broadcast to Aleo Testnet
4. Background poller monitors confirmation status
5. On confirmation, order state updates in the UI
6. Failed or expired transactions are flagged accordingly

---

## Project Structure

```
├── api/
│   ├── ai-trading-assistant.ts   # Vercel serverless — market suggestions
│   └── ai-trading-chat.ts        # Vercel edge — streaming chat
├── server/
│   └── index.ts                  # Express dev server (local only)
├── src/
│   ├── components/
│   │   ├── AITradingAssistant.tsx
│   │   ├── WalletProvider.tsx
│   │   ├── PlaceOrderPanel.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── aleoService.ts        # ZK transaction builder
│   │   ├── mockData.ts
│   │   ├── schema.ts
│   │   └── store.ts
│   └── pages/
│       ├── Index.tsx
│       ├── MarketDetail.tsx
│       └── Portfolio.tsx
└── vercel.json
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- [Shield Wallet](https://shieldwallet.app) browser extension
- Aleo Testnet credits

### Local Development

```bash
git clone https://github.com/Yasith867/PrivateClaw
cd PrivateClaw
npm install
npm run dev
```

Visit `http://localhost:5000`

### Environment Variables

| Variable | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers AI permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

---

## Deploying to Vercel

1. Import the repo at [vercel.com](https://vercel.com)
2. Vercel auto-detects Vite — no settings need changing
3. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in Environment Variables
4. Click **Deploy**

The `api/` directory is automatically served as serverless/edge functions on Vercel.

---

## Privacy Model

| Data | Visibility |
|---|---|
| Aggregated price levels | Public |
| Individual order size | Private (ZK encrypted) |
| Account balance | Private |
| Trader identity | Pseudonymous address |

---

## License

MIT

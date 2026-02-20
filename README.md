PrivateClaw

A privacy-first limit order decentralized exchange (DEX) built on the Aleo
 blockchain.

PrivateClaw enables confidential trading where order sizes, balances, and execution details remain encrypted on-chain using Aleo’s zero-knowledge proof system. Only aggregated market depth is publicly visible.

Overview

PrivateClaw is a limit order book DEX designed with privacy as a core primitive rather than a secondary feature. Powered by Aleo’s zero-knowledge smart contracts, trades are cryptographically private while remaining trustlessly verifiable.

Core Principles

Encrypted Orders — Individual order sizes are encrypted on-chain.

Private Balances — Account balances are never publicly exposed.

ZK Settlement — Trade execution is validated through zero-knowledge transitions.

Non-Custodial — Users retain full control of their keys and funds.

Tech Stack
Layer	Technology
Frontend	React 18, TypeScript, Vite
Styling	Tailwind CSS, shadcn/ui
State Management	Zustand
Blockchain	Aleo (Testnet Beta)
Smart Contracts	Leo (prediction_marketv01.aleo)
Wallet Integration	Leo Wallet via @demox-labs/aleo-wallet-adapter
Chain API	Provable API (Testnet)
Validation	Zod
Smart Contract

The deployed Aleo program is:

prediction_marketv01.aleo

Running on Aleo Testnet Beta.

Transitions
Transition	Description
create_market	Lists a new trading pair on-chain
place_bet	Places a private buy or sell order
cancel_order	Cancels an open private order
settle_trade	Matches buy and sell orders and settles privately
place_bet Inputs
input r0 as field.public;   // market_id
input r1 as field.public;   // outcome_id (1field = buy, 2field = sell)
input r2 as u64.private;    // order amount (encrypted)

There is intentionally no public price input. Limit pricing logic is handled client-side, while order amounts remain private via u64.private.

Features

Live aggregated order book (no individual sizes revealed)

OHLCV candlestick chart

Trade history (privacy-preserving)

Portfolio dashboard with order tracking

Transaction lifecycle monitoring

On-chain trading pair creation

Dark / Light mode support

Transaction Lifecycle

User signs transaction via Leo Wallet.

Transaction is broadcast to Aleo Testnet.

A background poller monitors confirmation status.

On confirmation, order state updates in the UI.

Failed or expired transactions are marked accordingly.

All transactions require explicit wallet approval.

Project Structure
src/
├── components/
├── hooks/
├── lib/
│   ├── aleoService.ts
│   ├── schema.ts
│   ├── store.ts
│   └── ohlcvData.ts
├── pages/
│   ├── Index.tsx
│   ├── MarketDetail.tsx
│   └── Portfolio.tsx
└── main.tsx
Getting Started
Prerequisites

Node.js v18+

Leo Wallet browser extension

Aleo Testnet credits

Installation
git clone <YOUR_REPO_URL>
cd privateclaw
npm install
npm run dev

Visit:

http://localhost:5173
Production Build
npm run build
Environment Variables
Variable	Description
VITE_SUPABASE_URL	Backend project URL
VITE_SUPABASE_PUBLISHABLE_KEY	Backend public key
Wallet Integration

PrivateClaw integrates the Leo Wallet adapter suite for secure transaction signing. All blockchain interactions require explicit wallet confirmation and execute on Aleo Testnet Beta.

Privacy Model
Data	Visibility
Aggregated price levels	Public
Individual order size	Private
Account balance	Private
Trader identity	Pseudonymous address

PrivateClaw ensures that only necessary market signals are exposed, while sensitive trading data remains encrypted on-chain.

License

MIT

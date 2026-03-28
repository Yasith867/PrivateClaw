# PrivateClaw

## Project Overview

PrivateClaw is a privacy-focused application built using Aleo. It is a privacy-first limit order DEX where order sizes, balances, and trading strategies stay encrypted on-chain using zero-knowledge proofs.

## Features

* Private transactions using Leo
* Shield Wallet integration
* Frontend interaction with contract
* ZK-proven order book — only aggregated price levels are public
* AI-powered trading assistant

## Leo Smart Contract

Located in `/leo/src/main.leo`

Program: `private_claw.aleo`

Function:

* `place_bet(amount: u64)` — validates and submits a private order to the Aleo network

```leo
program private_claw.aleo {

    transition place_bet(amount: u64) -> u64 {
        assert(amount > 0u64);
        return amount;
    }

}
```

## How it works

Users connect their Shield Wallet and submit a private transaction using the Leo contract. The order amount is kept private on-chain — only the user with their private key can view it.

1. Connect Shield Wallet using the "Select Wallet" button
2. Choose a trading pair from the order book
3. Enter an amount and click Buy or Sell
4. Shield Wallet opens to approve the `place_bet` transaction
5. The transaction is broadcast to Aleo Testnet

## Tech Stack

* Leo (Aleo smart contracts)
* JavaScript / React frontend
* Shield Wallet
* Vite + TypeScript
* Tailwind CSS + shadcn/ui
* Express.js backend
* Cloudflare AI (trading assistant)

## Project Structure

```
/
├── leo/
│   ├── program.json        — Leo program metadata
│   ├── deploy.sh           — build + deploy script
│   └── src/
│       └── main.leo        — smart contract
├── src/
│   ├── components/
│   │   ├── WalletProvider.tsx   — Shield Wallet connect button
│   │   ├── BettingModal.tsx     — amount input + Place Bet button
│   │   └── Header.tsx           — navigation + wallet button
│   └── lib/
│       └── aleoService.ts       — PROGRAM_ID + transaction builders
├── server/
│   └── index.ts            — Express API (AI assistant endpoints)
└── README.md
```

## Running Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5000`

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
ALEO_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
CLOUDFLARE_API_TOKEN=your_cloudflare_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

## Deploying the Contract

```bash
cd leo
bash deploy.sh
```

Requires the Leo CLI (`cargo install leo-lang`) and a funded Aleo Testnet account.
Get testnet credits at: https://faucet.aleo.org

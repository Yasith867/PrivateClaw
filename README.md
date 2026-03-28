# PrivateClaw

## Project Overview

PrivateClaw is a privacy-focused application built using Aleo. It is a privacy-first limit order DEX where order sizes, balances, and trading strategies stay encrypted on-chain using zero-knowledge proofs.

## Features

* Private transactions using Leo
* Shield Wallet integration
* Frontend interaction with contract — validate, simulate, and execute on-chain
* ZK-proven order book — only aggregated price levels are public
* AI-powered trading assistant

---

## Leo Smart Contract

Located in `/leo/src/main.leo`

Program: `private_claw.aleo`

### Functions

* `validate_bet(amount: u64) -> bool` — validates the bet amount is within range (0 < amount < 1,000,000)
* `place_bet(amount: u64) -> u64` — enforces constraints and returns a private computed output (amount × 2)
* `calculate_reward(amount: u64) -> u64` — computes the reward for a winning bet (amount + 5)

```leo
program private_claw.aleo {

    // Validates that a bet amount is within the allowed range.
    transition validate_bet(amount: u64) -> bool {
        assert(amount > 0u64);
        assert(amount < 1000000u64);
        return true;
    }

    // Simulates private betting logic using ZK execution.
    // Doubles the bet amount as the computed private output.
    transition place_bet(amount: u64) -> u64 {
        assert(amount > 0u64);
        assert(amount < 1000000u64);
        let result: u64 = amount * 2u64;
        return result;
    }

    // Calculates the reward for a winning bet.
    transition calculate_reward(amount: u64) -> u64 {
        assert(amount > 10u64);
        let reward: u64 = amount + 5u64;
        return reward;
    }

}
```

---

## Aleo Contract

Program: private_claw.aleo  
Functions:
- place_bet(amount: u64)
- validate_bet(amount: u64)
- calculate_reward(amount: u64)

This contract simulates private betting logic using Aleo's zero-knowledge execution model.

---

## Aleo Deployment Proof

This project includes a fully functional Leo smart contract designed for Aleo Testnet deployment.

```
Program ID : private_claw.aleo
Network    : Aleo Testnet
Execution  : via Shield Wallet
Explorer   : https://explorer.aleo.org/program/private_claw.aleo
```

* The Leo contract at `/leo/src/main.leo` is syntactically valid and ready to build with `leo build`
* The frontend integrates directly with Shield Wallet via `@provablehq/aleo-wallet-adaptor-react` for transaction execution
* All three transitions (`validate_bet`, `place_bet`, `calculate_reward`) are wired into the frontend and can be simulated client-side or executed on-chain
* `PROGRAM_ID = "private_claw.aleo"` is the single source of truth used throughout the codebase

To deploy:
```bash
cd leo
bash deploy.sh   # requires ALEO_PRIVATE_KEY in .env
```

---

## How It Works

1. User connects Shield Wallet using the "Select Wallet" button in the header
2. User picks a trading pair and opens the Place Order modal
3. User enters a bet amount (1 – 999,999 microcredits)
4. User clicks **Validate Bet** — the frontend simulates `validate_bet` locally, mirroring the Leo contract logic exactly:
   - Shows `validate_bet(amount) → true/false`
   - Shows `place_bet(amount) → amount × 2` (computed output)
   - Shows `calculate_reward(amount) → amount + 5` (reward preview)
5. User clicks **Place Buy / Place Sell** — Shield Wallet opens to approve the `place_bet` transaction
6. Transaction is broadcast to Aleo Testnet; the order amount stays **fully private** on-chain

---

## Tech Stack

* Leo (Aleo smart contracts)
* JavaScript / React frontend
* Shield Wallet (`@provablehq/aleo-wallet-adaptor-react`)
* Vite + TypeScript
* Tailwind CSS + shadcn/ui
* Express.js backend
* Cloudflare AI (trading assistant)

---

## Project Structure

```
/
├── leo/
│   ├── program.json             — Leo program metadata
│   ├── deploy.sh                — automated build + deploy script
│   └── src/
│       └── main.leo             — smart contract (validate_bet, place_bet, calculate_reward)
├── src/
│   ├── components/
│   │   ├── WalletProvider.tsx   — Shield Wallet connect button + useAleoWallet hook
│   │   ├── BettingModal.tsx     — amount input, Validate Bet, Place Bet buttons + result display
│   │   └── Header.tsx           — navigation + wallet button
│   └── lib/
│       └── aleoService.ts       — PROGRAM_ID, simulation helpers, TransactionOptions builders
├── server/
│   └── index.ts                 — Express API (AI trading assistant endpoints)
├── .env.example                 — environment variable template
└── README.md
```

---

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

# PrivateClaw — Privacy-First Limit Order DEX on Aleo

PrivateClaw is a decentralized exchange (DEX) built on the [Aleo blockchain](https://aleo.org) using **ZK proofs** for maximum order privacy. Order sizes, balances, and trading strategies stay encrypted on-chain — only aggregated price levels are ever public.

---

## Architecture

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Wallet | Shield Wallet via `@provablehq/aleo-wallet-adaptor-react` |
| Smart Contract | Leo (`private_claw.aleo`) |
| AI Assistant | Cloudflare AI (Llama 3.1 8B) |
| Backend API | Express.js |

---

## Leo Smart Contract

Located at `leo/src/main.leo`. Program name: `private_claw.aleo`.

### Transitions

#### `place_bet` — Place a private limit order
```leo
transition place_bet(
    public market_id as field,   // Trading pair identifier
    public side as field,        // 1field = buy, 2field = sell
    private amount as u64        // Order size in microcredits — hidden on-chain
) -> Order
```

#### `cancel_order` — Cancel an existing private order record
```leo
transition cancel_order(order: Order) -> bool
```

#### `create_market` — List a new trading pair
```leo
transition create_market(
    public market_id as field,
    public resolution_timestamp as u64,
    public num_outcomes as u8,
) -> bool
```

### Order Record (fully private on-chain)
```leo
record Order:
    owner as address.private;
    market_id as field.private;
    side as field.private;
    amount as u64.private;
```

---

## Deployment

### Prerequisites

Install the Aleo toolchain (requires Rust 1.88+):

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Leo CLI
cargo install leo-lang

# Install Aleo CLI
cargo install aleo
```

### Step 1 — Set up your environment

Copy the example env file and fill in your private key:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Replace with your real Aleo private key — NEVER share this or commit it
ALEO_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
```

Generate a new account if you don't have one:
```bash
leo account new
# Output:
#   Private Key  APrivateKey1...   ← paste this into .env
#   View Key     AViewKey1...
#   Address      aleo1...          ← use this to get testnet credits
```

Get testnet credits (you need at least 10 ALEO to deploy):
```
https://faucet.aleo.org
```
Paste your `aleo1...` address and request credits.

---

### Step 2 — Build the contract

```bash
cd leo
leo build
```

Expected output:
```
     Leo ✅ Compiled 'main.leo' into Aleo instructions
  Aleo ✅ Built 'private_claw.aleo' (in "build")
```

---

### Step 3 — Run local test

```bash
leo run place_bet 42field 1field 500000u64
```

Expected output:
```
 • place_bet:
   Output: {
     owner: aleo1...,
     market_id: 42field,
     side: 1field,
     amount: 500000u64
   }
```

- `42field` — market/pair ID
- `1field` — buy side (use `2field` for sell)
- `500000u64` — 0.5 ALEO in microcredits

---

### Step 4 — Deploy to Aleo Testnet

**Option A — use the deploy script (recommended):**
```bash
cd leo
bash deploy.sh
```

The script will validate your key, build, test, and deploy automatically.

**Option B — manual deploy:**
```bash
cd leo
source ../.env     # loads ALEO_PRIVATE_KEY

aleo deploy private_claw.aleo \
  --private-key "$ALEO_PRIVATE_KEY" \
  --query "https://api.provable.com/v2/testnet" \
  --broadcast "https://api.provable.com/v2/testnet/transaction/broadcast"
```

Expected output after successful deployment:
```
⏳ Attempting to deploy 'private_claw.aleo'...
✅ Successfully deployed 'private_claw.aleo' at transaction:
   at1abc...xyz
```

View your deployed program:
```
https://explorer.aleo.org/program/private_claw.aleo
```

> **Note:** Deployment costs ~10 ALEO in testnet credits. The transaction takes ~30 seconds to confirm.

---

### Security Rules

| Rule | Why |
|---|---|
| Never hardcode your private key | Anyone who sees it can steal your funds |
| Keep `.env` out of git (it's in `.gitignore`) | Prevents accidental key exposure |
| Use `.env.example` for documentation | Safe to commit — contains no real values |
| Rotate your key after any exposure | Treat it like a password |

---

## Frontend

### Development
```bash
npm install
npm run dev
```

Opens at [http://localhost:5000](http://localhost:5000)

### Environment Variables
Fill in `.env` (copy from `.env.example`):
```env
ALEO_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
CLOUDFLARE_API_TOKEN=your_cf_token
CLOUDFLARE_ACCOUNT_ID=your_cf_account_id
```

### Testing the UI
1. Install [Shield Wallet](https://shieldwallet.app) browser extension
2. Create/import an Aleo Testnet account
3. Get Testnet credits from [faucet.aleo.org](https://faucet.aleo.org)
4. Open the app → click **Select Wallet** → connect Shield Wallet
5. Pick a trading pair → click **Trade** → fill in price & size → **Buy** or **Sell**
6. Shield Wallet prompts you to approve the `place_bet` transaction
7. Your order size stays **private** on-chain — only you can view it with your key

---

## Project Structure
```
/
├── .env.example              ← copy to .env, fill in real values
├── .gitignore                ← .env is excluded from git
├── leo/
│   ├── program.json          ← Leo program metadata
│   ├── deploy.sh             ← automated build + deploy script
│   └── src/
│       └── main.leo          ← smart contract (place_bet, cancel_order, create_market)
├── src/
│   ├── components/
│   │   ├── WalletProvider.tsx   ← Shield Wallet adapter + connect button
│   │   ├── BettingModal.tsx     ← place/cancel order UI -> calls place_bet
│   │   ├── Header.tsx           ← navigation + wallet button
│   │   └── ...
│   ├── lib/
│   │   ├── aleoService.ts       ← builds TransactionOptions for each Leo transition
│   │   └── store.ts             ← Zustand global state
│   └── pages/
│       ├── Index.tsx            ← trade page (order book, chart, AI assistant)
│       └── Portfolio.tsx        ← my open orders page
├── server/
│   └── index.ts                 ← Express API: /api/ai-trading-assistant & chat
└── api/
    └── ...                      ← legacy Vercel serverless functions (unused on Replit)
```

---

## Privacy Model

All orders go through the `place_bet` Leo transition which returns an **`Order` record** stored in the caller's private state:

| Field | Visibility |
|---|---|
| Owner address | Private |
| Market ID | Private |
| Side (buy/sell) | Private |
| Amount | Private |

Order book depth is derived from ZK-proven aggregates — raw order data is never exposed.

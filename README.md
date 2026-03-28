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

Located at `leo/src/main.leo`. Deploy to **Aleo Testnet** as `private_claw.aleo`.

### Transitions

#### `place_bet` — Place a private limit order
```leo
transition place_bet(
    public market_id as field,   // Trading pair identifier
    public side as field,        // 1field = buy, 2field = sell
    private amount as u64        // Order size in microcredits (stays private on-chain)
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

### Order Record (private on-chain)
```leo
record Order:
    owner as address.private;
    market_id as field.private;
    side as field.private;
    amount as u64.private;
```

---

## Build & Deploy the Leo Contract

### Prerequisites
- [Rust stable](https://rustup.rs/) >= 1.88
- Leo CLI: `cargo install leo-lang`
- Aleo CLI: `cargo install aleo`

### Build
```bash
cd leo
leo build
```

### Run locally (no wallet required)
```bash
# Place a buy order of 500,000 microcredits on market 42
leo run place_bet 42field 1field 500000u64
```

Expected output:
```
• place_bet: { owner: aleo1..., market_id: 42field, side: 1field, amount: 500000u64 }
```

### Deploy to Aleo Testnet
```bash
# Get testnet credits at: https://faucet.aleo.org

export ALEO_PRIVATE_KEY="APrivateKey1..."

cd leo
aleo deploy private_claw.aleo \
  --private-key $ALEO_PRIVATE_KEY \
  --query "https://api.provable.com/v2/testnet" \
  --broadcast "https://api.provable.com/v2/testnet/transaction/broadcast"
```

After deployment the program is live at:
`https://explorer.aleo.org/program/private_claw.aleo`

---

## Frontend

### Development
```bash
npm install
npm run dev
```

Opens at [http://localhost:5000](http://localhost:5000)

### Environment Variables
Create a `.env` file (or add as Replit Secrets):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
CLOUDFLARE_API_TOKEN=your_cloudflare_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
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
├── leo/
│   ├── program.json             # Leo program metadata
│   └── src/
│       └── main.leo             # Smart contract (place_bet, cancel_order, create_market)
├── src/
│   ├── components/
│   │   ├── WalletProvider.tsx   # Shield Wallet adapter + connect button
│   │   ├── BettingModal.tsx     # Place/cancel order UI -> calls place_bet
│   │   ├── Header.tsx           # Navigation + wallet button
│   │   └── ...
│   ├── lib/
│   │   ├── aleoService.ts       # Builds TransactionOptions for each Leo transition
│   │   └── store.ts             # Zustand global state
│   └── pages/
│       ├── Index.tsx            # Trade page (order book, chart, AI assistant)
│       └── Portfolio.tsx        # My open orders page
├── server/
│   └── index.ts                 # Express API: /api/ai-trading-assistant & chat
└── api/
    └── ...                      # Legacy Vercel serverless functions (unused on Replit)
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

Order book depth is derived from ZK-proven aggregates, not raw order data.

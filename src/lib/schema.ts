import { z } from "zod";

// ─── Original Market/Bet schemas kept intact (reused as TradingPair/Order) ───

export const MarketStatus = {
  PENDING: "pending",
  ACTIVE: "active",
  RESOLVED: "resolved",
  CANCELLED: "cancelled",
} as const;

export type MarketStatusType = typeof MarketStatus[keyof typeof MarketStatus];

export const MarketCategory = {
  CRYPTO: "crypto",
  POLITICS: "politics",
  SPORTS: "sports",
  TECHNOLOGY: "technology",
  FINANCE: "finance",
  OTHER: "other",
} as const;

export const outcomeSchema = z.object({
  id: z.string(),
  label: z.string(),
  probability: z.number().min(0).max(100).optional(),
});

export type Outcome = z.infer<typeof outcomeSchema>;

// markets table reused as trading_pairs
// title          → pair name ("ALEO/USDC")
// category       → asset class
// outcomes[0]    → BUY side metadata
// outcomes[1]    → SELL side metadata
// totalVolume    → 24h volume (microcredits)
// participantCount → active traders
// resolutionDate → listing date (not a resolution)
// status         → active / halted / closed (mapped from existing enum)
export const marketSchema = z.object({
  id: z.string(),
  chainMarketId: z.string().optional(),
  title: z.string(),           // "ALEO/USDC"
  description: z.string().optional(),
  category: z.enum(["crypto", "politics", "sports", "technology", "finance", "other"]),
  outcomes: z.array(outcomeSchema), // [buy-side, sell-side]
  status: z.enum(["pending", "active", "resolved", "cancelled"]),
  resolutionDate: z.string(),  // listing/launch date
  createdAt: z.string(),
  creatorAddress: z.string(),
  totalVolume: z.number().default(0),
  participantCount: z.number().default(0),
  winningOutcomeId: z.string().optional(),
  imageUrl: z.string().optional(),
  transactionId: z.string().optional(),
});

export type Market = z.infer<typeof marketSchema>;

// bets table reused as orders
// outcomeId  → side: "buy" | "sell"
// amount     → order size (private, encrypted on Aleo)
// recordNonce → price level (stored as string repr of float)
// isSettled  → order filled/closed
// winnings   → filled amount
export const betSchema = z.object({
  id: z.string(),
  marketId: z.string(),        // → pairId
  outcomeId: z.string(),       // → "buy" | "sell"
  amount: z.number().positive(),     // order size (private)
  ownerAddress: z.string(),
  createdAt: z.string(),
  isSettled: z.boolean().default(false),
  winnings: z.number().optional(),   // filled amount
  recordNonce: z.string().optional(), // price (as string)
  transactionId: z.string().optional(),
});

export type Bet = z.infer<typeof betSchema>;

// ─── Extended types for PrivateClaw trading semantics ───

export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'open' | 'partial' | 'filled' | 'cancelled' | 'confirmed';

// Order = Bet with semantic aliases resolved
export interface Order extends Bet {
  pairId: string;      // alias for marketId
  side: OrderSide;     // derived from outcomeId
  price: number;       // derived from recordNonce
  filledAmount: number; // derived from winnings
  orderStatus: OrderStatus;
}

// TradingPair extends Market with price data
export interface TradingPair extends Market {
  baseAsset: string;   // e.g. "ALEO"
  quoteAsset: string;  // e.g. "USDC"
  lastPrice: number;
  priceChange24h: number; // %
  high24h: number;
  low24h: number;
  bestBid: number;
  bestAsk: number;
}

// OrderBook level — only aggregated price/depth visible (privacy-preserving)
// Individual sizes are encrypted on-chain; only relative depth shown in UI
export interface OrderBookLevel {
  price: number;
  depth: number;  // 0–100, relative depth for visual bar width only
  count: number;  // how many orders at this level (public)
}

export interface OrderBook {
  pairId: string;
  bids: OrderBookLevel[]; // sorted: highest price first
  asks: OrderBookLevel[]; // sorted: lowest price first
  spread: number;
  spreadPercent: number;
  lastPrice: number;
  midPrice: number;
}

// Anonymous trade history entry (amount always hidden)
export interface TradeRecord {
  id: string;
  pairId: string;
  price: number;
  side: OrderSide;
  timestamp: string;
  // amount intentionally absent — private on-chain
}

export const portfolioStatsSchema = z.object({
  totalBets: z.number(),
  activeBets: z.number(),
  totalWagered: z.number(),
  totalWinnings: z.number(),
  winRate: z.number(),
});

export type PortfolioStats = z.infer<typeof portfolioStatsSchema>;

export const marketFiltersSchema = z.object({
  category: z.enum(["all", "crypto", "politics", "sports", "technology", "finance", "other"]).default("all"),
  status: z.enum(["all", "active", "resolved", "pending"]).default("all"),
  sortBy: z.enum(["volume", "newest", "ending_soon"]).default("volume"),
  searchQuery: z.string().optional(),
});

export type MarketFilters = z.infer<typeof marketFiltersSchema>;

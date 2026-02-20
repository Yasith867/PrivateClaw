import type { TradingPair, Order, OrderBook, TradeRecord } from '@/lib/schema';

const now = new Date();
const ts = (daysAgo = 0) =>
  new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

// ─── Trading Pairs (markets table, reused) ─────────────────────────────────
export const mockMarkets: TradingPair[] = [
  {
    id: 'pair-1',
    title: 'ALEO/USDC',
    description: 'Aleo native token vs USD Coin. Settlement via Aleo testnet private transitions.',
    category: 'crypto',
    outcomes: [
      { id: 'buy',  label: 'BUY',  probability: 62 },
      { id: 'sell', label: 'SELL', probability: 38 },
    ],
    status: 'active',
    resolutionDate: ts(-90), // listing date
    createdAt: ts(90),
    creatorAddress: 'aleo1qnr4dkkvkgfqph4f3rr9dsq7k2rdnzs5e2z8vw4h5yd2zs8fj8sqhulrv',
    totalVolume: 14_500_000,
    participantCount: 341,
    baseAsset: 'ALEO',
    quoteAsset: 'USDC',
    lastPrice: 0.1248,
    priceChange24h: 2.31,
    high24h: 0.1289,
    low24h: 0.1201,
    bestBid: 0.1248,
    bestAsk: 0.1251,
  },
  {
    id: 'pair-2',
    title: 'ALEO/USDT',
    description: 'Aleo vs Tether USDT trading pair on Aleo private DEX.',
    category: 'crypto',
    outcomes: [
      { id: 'buy',  label: 'BUY',  probability: 55 },
      { id: 'sell', label: 'SELL', probability: 45 },
    ],
    status: 'active',
    resolutionDate: ts(-60),
    createdAt: ts(60),
    creatorAddress: 'aleo1abc',
    totalVolume: 9_200_000,
    participantCount: 218,
    baseAsset: 'ALEO',
    quoteAsset: 'USDT',
    lastPrice: 0.1246,
    priceChange24h: 1.87,
    high24h: 0.1271,
    low24h: 0.1198,
    bestBid: 0.1245,
    bestAsk: 0.1249,
  },
  {
    id: 'pair-3',
    title: 'WBTC/USDC',
    description: 'Wrapped Bitcoin vs USD Coin. ZK-privacy layer on top of BTC exposure.',
    category: 'crypto',
    outcomes: [
      { id: 'buy',  label: 'BUY',  probability: 70 },
      { id: 'sell', label: 'SELL', probability: 30 },
    ],
    status: 'active',
    resolutionDate: ts(-120),
    createdAt: ts(120),
    creatorAddress: 'aleo1xyz',
    totalVolume: 31_800_000,
    participantCount: 512,
    baseAsset: 'WBTC',
    quoteAsset: 'USDC',
    lastPrice: 95_420.50,
    priceChange24h: -0.72,
    high24h: 96_100.00,
    low24h: 94_850.00,
    bestBid: 95_410.00,
    bestAsk: 95_430.00,
  },
  {
    id: 'pair-4',
    title: 'ETH/USDC',
    description: 'Ethereum vs USD Coin with private order routing via Aleo ZK transitions.',
    category: 'crypto',
    outcomes: [
      { id: 'buy',  label: 'BUY',  probability: 58 },
      { id: 'sell', label: 'SELL', probability: 42 },
    ],
    status: 'active',
    resolutionDate: ts(-100),
    createdAt: ts(100),
    creatorAddress: 'aleo1def',
    totalVolume: 22_600_000,
    participantCount: 437,
    baseAsset: 'ETH',
    quoteAsset: 'USDC',
    lastPrice: 3_218.40,
    priceChange24h: 3.15,
    high24h: 3_310.00,
    low24h: 3_108.00,
    bestBid: 3_217.00,
    bestAsk: 3_220.00,
  },
  {
    id: 'pair-5',
    title: 'SOL/USDC',
    description: 'Solana vs USD Coin privacy trading pair.',
    category: 'crypto',
    outcomes: [
      { id: 'buy',  label: 'BUY',  probability: 48 },
      { id: 'sell', label: 'SELL', probability: 52 },
    ],
    status: 'active',
    resolutionDate: ts(-80),
    createdAt: ts(80),
    creatorAddress: 'aleo1ghi',
    totalVolume: 8_900_000,
    participantCount: 189,
    baseAsset: 'SOL',
    quoteAsset: 'USDC',
    lastPrice: 172.30,
    priceChange24h: -1.44,
    high24h: 178.50,
    low24h: 169.80,
    bestBid: 172.20,
    bestAsk: 172.50,
  },
  {
    id: 'pair-6',
    title: 'AVAX/USDC',
    description: 'Avalanche vs USD Coin. Private limit order book on Aleo.',
    category: 'crypto',
    outcomes: [
      { id: 'buy',  label: 'BUY',  probability: 52 },
      { id: 'sell', label: 'SELL', probability: 48 },
    ],
    status: 'active',
    resolutionDate: ts(-70),
    createdAt: ts(70),
    creatorAddress: 'aleo1jkl',
    totalVolume: 6_100_000,
    participantCount: 143,
    baseAsset: 'AVAX',
    quoteAsset: 'USDC',
    lastPrice: 38.92,
    priceChange24h: 0.88,
    high24h: 39.80,
    low24h: 38.10,
    bestBid: 38.90,
    bestAsk: 38.95,
  },
];

// ─── Order Books (privacy-preserving: depth shown, amounts hidden) ──────────
export function generateOrderBook(pair: TradingPair): import('@/lib/schema').OrderBook {
  const mid = pair.lastPrice;
  const tickSize = mid < 1 ? 0.0001 : mid < 100 ? 0.01 : mid < 10000 ? 1 : 10;

  const bids: import('@/lib/schema').OrderBookLevel[] = [];
  const asks: import('@/lib/schema').OrderBookLevel[] = [];

  // Generate 8 levels each side — depth randomised (visual only, not exact amounts)
  for (let i = 0; i < 8; i++) {
    bids.push({
      price: parseFloat((mid - tickSize * (i + 1)).toFixed(mid < 1 ? 4 : 2)),
      depth: Math.floor(Math.random() * 70 + 20), // 20–90%
      count: Math.floor(Math.random() * 12 + 1),
    });
    asks.push({
      price: parseFloat((mid + tickSize * (i + 1)).toFixed(mid < 1 ? 4 : 2)),
      depth: Math.floor(Math.random() * 70 + 20),
      count: Math.floor(Math.random() * 12 + 1),
    });
  }

  const spread = parseFloat((asks[0].price - bids[0].price).toFixed(mid < 1 ? 4 : 2));
  const spreadPercent = parseFloat(((spread / mid) * 100).toFixed(3));

  return {
    pairId: pair.id,
    bids,
    asks,
    spread,
    spreadPercent,
    lastPrice: pair.lastPrice,
    midPrice: parseFloat(((bids[0].price + asks[0].price) / 2).toFixed(mid < 1 ? 4 : 2)),
  };
}

// ─── Anonymous trade history ────────────────────────────────────────────────
export function generateTradeHistory(pair: TradingPair, count = 20): TradeRecord[] {
  const mid = pair.lastPrice;
  const tickSize = mid < 1 ? 0.0001 : mid < 100 ? 0.01 : mid < 10000 ? 1 : 10;
  const trades: TradeRecord[] = [];

  for (let i = 0; i < count; i++) {
    const offset = (Math.random() - 0.5) * tickSize * 4;
    const price = parseFloat((mid + offset).toFixed(mid < 1 ? 4 : 2));
    trades.push({
      id: `trade-${pair.id}-${i}`,
      pairId: pair.id,
      price,
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      timestamp: new Date(now.getTime() - i * 45_000).toISOString(), // ~45s apart
    });
  }

  return trades;
}

// ─── Mock user orders (bets table, reused) ──────────────────────────────────
export const mockUserOrders: Order[] = [
  {
    id: 'order-1',
    marketId: 'pair-1',
    pairId: 'pair-1',
    outcomeId: 'buy',
    side: 'buy',
    price: 0.1235,
    amount: 500_000,        // private on-chain
    filledAmount: 0,
    ownerAddress: 'aleo1mock',
    createdAt: ts(0.1),
    isSettled: false,
    orderStatus: 'open',
    recordNonce: '0.1235',
    transactionId: 'at1a1b2c3d4e',
  },
  {
    id: 'order-2',
    marketId: 'pair-3',
    pairId: 'pair-3',
    outcomeId: 'sell',
    side: 'sell',
    price: 96_000,
    amount: 200_000,
    filledAmount: 200_000,
    ownerAddress: 'aleo1mock',
    createdAt: ts(1),
    isSettled: true,
    orderStatus: 'filled',
    recordNonce: '96000',
    transactionId: 'at1f5e4d3c2b',
  },
  {
    id: 'order-3',
    marketId: 'pair-4',
    pairId: 'pair-4',
    outcomeId: 'buy',
    side: 'buy',
    price: 3_200,
    amount: 300_000,
    filledAmount: 150_000,
    ownerAddress: 'aleo1mock',
    createdAt: ts(0.5),
    isSettled: false,
    orderStatus: 'partial',
    recordNonce: '3200',
    transactionId: 'at1c9d8e7f6a',
  },
  {
    id: 'order-4',
    marketId: 'pair-2',
    pairId: 'pair-2',
    outcomeId: 'sell',
    side: 'sell',
    price: 0.1260,
    amount: 100_000,
    filledAmount: 0,
    ownerAddress: 'aleo1mock',
    createdAt: ts(0.3),
    isSettled: false,
    orderStatus: 'cancelled',
    recordNonce: '0.1260',
    transactionId: 'at1e2f3a4b5c',
  },
];

export const mockPortfolioStats = {
  totalBets: 4,
  activeBets: 1,
  totalWagered: 1_100_000,
  totalWinnings: 210_000,
  winRate: 67,
};

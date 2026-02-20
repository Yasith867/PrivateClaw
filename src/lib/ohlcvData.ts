import type { TradingPair } from '@/lib/schema';

export interface OHLCVBar {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Generate realistic-looking OHLCV bars using a random walk
 * anchored to the pair's current price.
 */
export function generateOHLCV(
  pair: TradingPair,
  bars = 120,
  intervalMinutes = 15
): OHLCVBar[] {
  const tickSize =
    pair.lastPrice < 1 ? 0.0001 :
    pair.lastPrice < 100 ? 0.01 :
    pair.lastPrice < 10_000 ? 0.5 : 5;

  const volatility = tickSize * 8; // per-bar volatility
  const nowSec = Math.floor(Date.now() / 1000);
  const intervalSec = intervalMinutes * 60;

  // Walk backwards from current price
  const result: OHLCVBar[] = [];
  let price = pair.lastPrice;

  for (let i = bars - 1; i >= 0; i--) {
    const time = nowSec - i * intervalSec;

    // Random walk for open→close
    const drift = (Math.random() - 0.49) * volatility * 2;
    const open = price;
    const close = Math.max(tickSize, price + drift);

    // High / Low with wicks
    const wickUp = Math.random() * volatility * 1.5;
    const wickDown = Math.random() * volatility * 1.5;
    const high = Math.max(open, close) + wickUp;
    const low = Math.max(tickSize, Math.min(open, close) - wickDown);

    const volume = Math.floor(Math.random() * 800_000 + 100_000);

    result.push({
      time,
      open: parseFloat(open.toFixed(pair.lastPrice < 1 ? 4 : pair.lastPrice < 10_000 ? 2 : 0)),
      high: parseFloat(high.toFixed(pair.lastPrice < 1 ? 4 : pair.lastPrice < 10_000 ? 2 : 0)),
      low:  parseFloat(low.toFixed(pair.lastPrice < 1 ? 4 : pair.lastPrice < 10_000 ? 2 : 0)),
      close: parseFloat(close.toFixed(pair.lastPrice < 1 ? 4 : pair.lastPrice < 10_000 ? 2 : 0)),
      volume,
    });

    price = close;
  }

  return result;
}

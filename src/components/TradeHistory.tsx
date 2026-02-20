import type { TradeRecord } from '@/lib/schema';
import { Lock, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  trades: TradeRecord[];
  lastPrice?: number;
}

export function TradeHistory({ trades, lastPrice }: Props) {
  const priceDecimals = lastPrice
    ? lastPrice < 1 ? 4 : lastPrice < 100 ? 2 : lastPrice < 10_000 ? 1 : 0
    : 4;

  return (
    <div className="flex flex-col h-full bg-card border border-border/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs font-semibold">Trade History</span>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Lock className="h-3 w-3 text-primary" />
          Sizes private
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between px-3 py-1 text-[10px] text-muted-foreground border-b border-border/30">
        <span className="w-16">Time</span>
        <span>Price</span>
        <span>Size</span>
        <span className="w-8 text-right">Side</span>
      </div>

      {/* Trades */}
      <div className="overflow-y-auto flex-1">
        {trades.map((trade, i) => {
          const isBuy = trade.side === 'buy';
          const date = new Date(trade.timestamp);
          const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          // Detect direction vs previous trade
          const prevPrice = trades[i + 1]?.price;
          const isUp = prevPrice === undefined || trade.price >= prevPrice;

          return (
            <div
              key={trade.id}
              className="flex items-center justify-between px-3 py-[3px] text-xs hover:bg-muted/30 transition-colors"
            >
              <span className="w-16 font-mono text-muted-foreground text-[10px]">{timeStr}</span>

              <span className={cn('font-mono font-medium flex items-center gap-0.5', isBuy ? 'text-buy' : 'text-sell')}>
                {isUp
                  ? <ArrowUp className="h-2.5 w-2.5" />
                  : <ArrowDown className="h-2.5 w-2.5" />}
                {trade.price.toLocaleString(undefined, {
                  minimumFractionDigits: priceDecimals,
                  maximumFractionDigits: priceDecimals,
                })}
              </span>

              {/* Size is always hidden */}
              <span className="flex items-center gap-1 text-muted-foreground">
                <Lock className="h-2.5 w-2.5" />
                <span className="redacted text-[10px]">████</span>
              </span>

              <span className={cn('w-8 text-right text-[10px] font-semibold uppercase', isBuy ? 'text-buy' : 'text-sell')}>
                {trade.side}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

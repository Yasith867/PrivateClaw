import type { OrderBook as OrderBookType, OrderSide } from '@/lib/schema';
import { Shield, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  orderBook: OrderBookType;
  onSelectPrice?: (price: number, side: OrderSide) => void;
}

function PriceRow({
  price,
  depth,
  count,
  side,
  maxDepth,
  onSelect,
  priceDecimals,
}: {
  price: number;
  depth: number;
  count: number;
  side: OrderSide;
  maxDepth: number;
  onSelect?: (price: number, side: OrderSide) => void;
  priceDecimals: number;
}) {
  const pct = Math.round((depth / maxDepth) * 100);
  const isBuy = side === 'buy';

  return (
    <div
      className={cn(
        'relative flex items-center justify-between px-3 py-[3px] text-xs cursor-pointer group select-none',
        onSelect && 'hover:opacity-80',
      )}
      onClick={() => onSelect?.(price, side)}
    >
      {/* depth bar rendered behind content */}
      <div
        className={cn(
          'absolute inset-y-0 rounded-sm opacity-20',
          isBuy ? 'bg-buy left-0' : 'bg-sell right-0',
        )}
        style={{ width: `${pct}%` }}
      />

      {/* price */}
      <span className={cn('font-mono font-medium relative z-10', isBuy ? 'text-buy' : 'text-sell')}>
        {price.toLocaleString(undefined, {
          minimumFractionDigits: priceDecimals,
          maximumFractionDigits: priceDecimals,
        })}
      </span>

      {/* size — always hidden (ZK private) */}
      <span className="relative z-10 flex items-center gap-1 text-muted-foreground">
        <Lock className="h-2.5 w-2.5" />
        <span className="redacted">████████</span>
      </span>

      {/* order count — public aggregate */}
      <span className="relative z-10 text-muted-foreground w-6 text-right">{count}</span>
    </div>
  );
}

export function OrderBook({ orderBook, onSelectPrice }: Props) {
  const { bids, asks, spread, spreadPercent, lastPrice } = orderBook;

  const priceDecimals = lastPrice < 1 ? 4 : lastPrice < 100 ? 2 : lastPrice < 10_000 ? 1 : 0;
  const maxDepth = Math.max(...bids.map(b => b.depth), ...asks.map(a => a.depth));

  // asks displayed low→high from bottom, so we reverse to show highest ask at top
  const asksDisplay = [...asks].reverse();

  return (
    <div className="flex flex-col h-full bg-card border border-border/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs font-semibold text-foreground">Order Book</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Shield className="h-3 w-3 text-primary" />
          <span>Sizes private</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between px-3 py-1 text-[10px] text-muted-foreground border-b border-border/30">
        <span>Price</span>
        <span>Size</span>
        <span className="w-6 text-right">Ord.</span>
      </div>

      {/* Asks (sell orders — red) */}
      <div className="flex flex-col-reverse overflow-y-auto flex-1">
        {asksDisplay.map((ask) => (
          <PriceRow
            key={ask.price}
            price={ask.price}
            depth={ask.depth}
            count={ask.count}
            side="sell"
            maxDepth={maxDepth}
            onSelect={onSelectPrice}
            priceDecimals={priceDecimals}
          />
        ))}
      </div>

      {/* Spread */}
      <div className="flex items-center justify-between px-3 py-1.5 border-y border-border/50 bg-muted/30">
        <span className="text-[10px] text-muted-foreground">Spread</span>
        <span className="text-xs font-mono text-amber-400">
          {spread.toFixed(priceDecimals)} ({spreadPercent}%)
        </span>
        <span className="text-xs font-mono font-bold text-foreground">
          {lastPrice.toLocaleString(undefined, {
            minimumFractionDigits: priceDecimals,
            maximumFractionDigits: priceDecimals,
          })}
        </span>
      </div>

      {/* Bids (buy orders — green) */}
      <div className="overflow-y-auto flex-1">
        {bids.map((bid) => (
          <PriceRow
            key={bid.price}
            price={bid.price}
            depth={bid.depth}
            count={bid.count}
            side="buy"
            maxDepth={maxDepth}
            onSelect={onSelectPrice}
            priceDecimals={priceDecimals}
          />
        ))}
      </div>
    </div>
  );
}

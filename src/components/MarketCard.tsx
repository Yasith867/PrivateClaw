import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TradingPair } from '@/lib/schema';
import { TrendingUp, TrendingDown, Users, ArrowRight, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MarketCardProps {
  market: TradingPair;
}

// MarketCard → TradingPairCard (same export name to avoid import changes)
export function MarketCard({ market }: MarketCardProps) {
  const pair = market;
  const isUp = pair.priceChange24h >= 0;
  const priceDecimals = pair.lastPrice < 1 ? 4 : pair.lastPrice < 100 ? 2 : pair.lastPrice < 10_000 ? 1 : 0;
  const spread = parseFloat((pair.bestAsk - pair.bestBid).toFixed(priceDecimals));
  const spreadPct = ((spread / pair.lastPrice) * 100).toFixed(3);

  const formattedPrice = pair.lastPrice.toLocaleString(undefined, {
    minimumFractionDigits: priceDecimals,
    maximumFractionDigits: priceDecimals,
  });

  return (
    <Link to={`/market/${pair.id}`}>
      <Card className="group relative overflow-visible card-glow cursor-pointer transition-all duration-300 p-5 border-border/50 bg-card/80 backdrop-blur-sm">
        {/* Privacy indicator */}
        <div className="absolute -top-2 -right-2 z-10">
          <div className="relative">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <Shield className="h-3 w-3 text-primary-foreground" />
            </div>
            <div className="absolute inset-0 h-6 w-6 rounded-full bg-primary blur-md opacity-50 animate-pulse-privacy" />
          </div>
        </div>

        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-bold text-base tracking-tight">{pair.title}</p>
              <p className="text-[10px] text-muted-foreground">{pair.category} · private LOB</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'border text-xs font-medium',
              pair.status === 'active'
                ? 'border-accent/30 text-accent bg-accent/10'
                : 'border-border text-muted-foreground',
            )}
          >
            {pair.status}
          </Badge>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight">{formattedPrice}</span>
            <span className="text-xs text-muted-foreground">{pair.quoteAsset}</span>
          </div>
          <div className={cn('flex items-center gap-1 text-sm font-medium mt-0.5', isUp ? 'text-buy' : 'text-sell')}>
            {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{isUp ? '+' : ''}{pair.priceChange24h.toFixed(2)}%</span>
            <span className="text-muted-foreground font-normal text-xs">24h</span>
          </div>
        </div>

        {/* Bid / Ask */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 rounded-md bg-buy border border-buy/30">
            <p className="text-[10px] text-muted-foreground mb-0.5">Best Bid</p>
            <p className="text-sm font-mono font-semibold text-buy">
              {pair.bestBid.toFixed(priceDecimals)}
            </p>
          </div>
          <div className="p-2 rounded-md bg-sell border border-sell/30">
            <p className="text-[10px] text-muted-foreground mb-0.5">Best Ask</p>
            <p className="text-sm font-mono font-semibold text-sell">
              {pair.bestAsk.toFixed(priceDecimals)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{(pair.totalVolume / 1_000_000).toFixed(1)}M vol</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{pair.participantCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <span>Spread {spreadPct}%</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

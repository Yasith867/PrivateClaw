import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useAleoWallet } from '@/components/WalletProvider';
import { mockMarkets, generateOrderBook, generateTradeHistory } from '@/lib/mockData';
import { OrderBook } from '@/components/OrderBook';
import { TradeHistory } from '@/components/TradeHistory';
import { PlaceOrderPanel } from '@/components/PlaceOrderPanel';
import { AITradingAssistant } from '@/components/AITradingAssistant';
import { PriceChart } from '@/components/PriceChart';
import { useTxPoller } from '@/hooks/useTxPoller';
import type { OrderBook as OBType, TradeRecord, TradingPair, OrderSide, Order } from '@/lib/schema';
import { ArrowLeft, Shield, TrendingUp, TrendingDown, Lock, Eye, EyeOff, X, Loader2, CheckCircle2 } from 'lucide-react';
import { PendingTimer } from '@/components/PendingTimer';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { markets, userBets, setUserBets } = useAppStore();
  const { connected: walletConnected } = useAleoWallet();
  const { toast } = useToast();

  // Poll Aleo Testnet every 15s for pending tx confirmations
  useTxPoller(toast);

  const allPairs = markets.length > 0 ? markets : mockMarkets;
  const pair = allPairs.find(m => m.id === id) as TradingPair | undefined;

  const [orderBook, setOrderBook] = useState<OBType | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<number | undefined>();
  const [selectedSide, setSelectedSide] = useState<OrderSide>('buy');
  const [showMyAmounts, setShowMyAmounts] = useState(false);

  useEffect(() => {
    if (!pair) return;
    setOrderBook(generateOrderBook(pair));
    setTrades(generateTradeHistory(pair, 25));
  }, [pair?.id]);

  const myOrders = useMemo(
    () => (userBets as Order[]).filter(o => o.pairId === pair?.id || o.marketId === pair?.id),
    [userBets, pair?.id]
  );

  const handleSelectPrice = (price: number, side: OrderSide) => {
    setSelectedPrice(price);
    setSelectedSide(side === 'sell' ? 'buy' : 'sell');
  };

  const handleCancelOrder = (orderId: string) => {
    setUserBets(
      (userBets as Order[]).map(o =>
        o.id === orderId ? { ...o, orderStatus: 'cancelled' as const, isSettled: true } : o
      ) as Order[]
    );
    toast({ title: 'Order cancelled', description: 'cancel_order private transition submitted.' });
  };

  if (!pair) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Pair Not Found</h2>
        <Link to="/">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
        </Link>
      </div>
    );
  }

  const isUp = pair.priceChange24h >= 0;
  const priceDecimals = pair.lastPrice < 1 ? 4 : pair.lastPrice < 100 ? 2 : pair.lastPrice < 10_000 ? 1 : 0;

  const statusColors: Record<string, string> = {
    active:    'border-accent/30 text-accent bg-accent/10',
    pending:   'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    cancelled: 'border-border text-muted-foreground',
    resolved:  'border-border text-muted-foreground',
  };

  return (
    <div className="container mx-auto px-4 py-5 max-w-[1400px] animate-fade-in">
      {/* Back + Pair header */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Pairs
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{pair.title}</h1>
          <Badge variant="outline" className={cn('border text-xs', statusColors[pair.status])}>
            {pair.status}
          </Badge>
        </div>

        <div className="flex items-baseline gap-2 ml-auto">
          <span className="text-2xl font-bold font-mono">
            {pair.lastPrice.toLocaleString(undefined, { minimumFractionDigits: priceDecimals, maximumFractionDigits: priceDecimals })}
          </span>
          <span className={cn('text-sm font-semibold flex items-center gap-0.5', isUp ? 'text-buy' : 'text-sell')}>
            {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isUp ? '+' : ''}{pair.priceChange24h.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 24h stats row */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-5 pb-4 border-b border-border/50">
        {[
          { label: '24h High', value: pair.high24h.toFixed(priceDecimals), cls: 'text-buy' },
          { label: '24h Low',  value: pair.low24h.toFixed(priceDecimals),  cls: 'text-sell' },
          { label: '24h Vol',  value: `${(pair.totalVolume / 1_000_000).toFixed(2)}M` },
          { label: 'Traders',  value: pair.participantCount },
          { label: 'Best Bid', value: pair.bestBid.toFixed(priceDecimals), cls: 'text-buy' },
          { label: 'Best Ask', value: pair.bestAsk.toFixed(priceDecimals), cls: 'text-sell' },
        ].map(({ label, value, cls }) => (
          <div key={label}>
            <span className="text-muted-foreground">{label}: </span>
            <span className={cn('font-mono font-medium text-foreground', cls)}>{value}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1 text-primary">
          <Shield className="h-3.5 w-3.5" />
          <span>ZK-private order book</span>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4" style={{ minHeight: '560px' }}>

        {/* Left: Order Book */}
        {orderBook && (
          <OrderBook orderBook={orderBook} onSelectPrice={handleSelectPrice} />
        )}

        {/* Centre: Price Chart + My Orders */}
        <div className="flex flex-col gap-4">
          {/* Real TradingView Lightweight Chart */}
          <PriceChart pair={pair} />

          {/* My Orders */}
          <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <span className="text-sm font-semibold">My Orders</span>
              <button
                onClick={() => setShowMyAmounts(!showMyAmounts)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {showMyAmounts ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showMyAmounts ? 'Hide' : 'Reveal'}
              </button>
            </div>

            {!walletConnected ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Connect wallet to see your orders.
              </div>
            ) : myOrders.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No orders for {pair.title} yet.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {myOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <span className={cn('text-xs font-semibold uppercase w-8', order.side === 'buy' ? 'text-buy' : 'text-sell')}>
                      {order.side}
                    </span>
                    <span className="text-xs font-mono flex-1">{order.price.toFixed(priceDecimals)}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      {showMyAmounts ? `${(order.amount / 1_000_000).toFixed(2)}M` : '••••••'}
                    </span>
                    {/* Status badge */}
                    {order.orderStatus === 'open' && order.transactionId ? (
                      <span className="flex flex-col items-end gap-0.5">
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-primary/30 text-primary bg-primary/10 font-medium">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          pending
                        </span>
                        <PendingTimer createdAt={order.createdAt} />
                      </span>
                    ) : order.orderStatus === 'filled' ? (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-accent/30 text-accent bg-accent/10 font-medium">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        confirmed
                      </span>
                    ) : (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full border font-medium',
                        order.orderStatus === 'partial' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
                        'border-border text-muted-foreground',
                      )}>
                        {order.orderStatus}
                      </span>
                    )}
                    {order.orderStatus === 'open' && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Assistant + Place Order + Trade History */}
        <div className="flex flex-col gap-4">
          {orderBook && (
            <AITradingAssistant
              pair={pair}
              orderBook={orderBook}
              myOrders={myOrders}
            />
          )}
          <PlaceOrderPanel
            pair={pair}
            initialPrice={selectedPrice}
            initialSide={selectedSide}
          />
          {trades.length > 0 && (
            <div className="flex-1 min-h-[200px]">
              <TradeHistory trades={trades} lastPrice={pair.lastPrice} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

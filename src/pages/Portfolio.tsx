import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCard } from '@/components/StatsCard';
import { useAppStore } from '@/lib/store';
import { useAleoWallet } from '@/components/WalletProvider';
import { mockUserOrders, mockPortfolioStats } from '@/lib/mockData';
import { useTxPoller } from '@/hooks/useTxPoller';
import type { Order } from '@/lib/schema';
import {
  Shield, Wallet, TrendingUp, Clock, Lock, Eye, EyeOff,
  ArrowRight, Activity, X, Loader2, CheckCircle2,
} from 'lucide-react';
import { PendingTimer } from '@/components/PendingTimer';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const statusStyle: Record<string, string> = {
  open:      'border-primary/30 text-primary bg-primary/10',
  partial:   'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
  filled:    'border-accent/30 text-accent bg-accent/10',
  cancelled: 'border-border text-muted-foreground',
};

export default function PortfolioPage() {
  const { userBets, setUserBets } = useAppStore();
  const { connected: walletConnected, address: walletAddress } = useAleoWallet();
  const { toast } = useToast();
  const [showAmounts, setShowAmounts] = useState(false);

  // Poll Aleo Testnet every 15s for pending tx confirmations
  useTxPoller(toast);

  const orders: Order[] = walletConnected
    ? (userBets.length > 0 ? (userBets as Order[]) : mockUserOrders)
    : [];

  const stats = walletConnected ? mockPortfolioStats : null;

  const openOrders  = orders.filter(o => o.orderStatus === 'open' || o.orderStatus === 'partial');
  const closedOrders = orders.filter(o => o.orderStatus === 'filled' || o.orderStatus === 'cancelled');

  const handleCancel = (id: string) => {
    setUserBets((userBets as Order[]).map(o =>
      o.id === id ? { ...o, orderStatus: 'cancelled' as const, isSettled: true } : o
    ) as Order[]);
    toast({ title: 'Order cancelled', description: 'cancel_order ZK transition submitted.' });
  };

  const fmt = (n: number) => showAmounts ? `${(n / 1_000_000).toFixed(2)}M` : '••••••';

  if (!walletConnected) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
            <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-card border border-border/50">
              <Shield className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Private Orders</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connect your Aleo wallet to view your encrypted order history, open positions, and trade statistics.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {[
              { icon: Lock,     title: 'Encrypted Sizes',   desc: 'Order amounts private on-chain' },
              { icon: Eye,      title: 'Only You See',      desc: 'View positions with your key' },
              { icon: Shield,   title: 'ZK Settlement',     desc: 'Trustless fills via settle_trade' },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-4 border-border/50 bg-card/50">
                <Icon className="h-5 w-5 text-primary mb-2" />
                <p className="font-medium text-sm mb-1">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </Card>
            ))}
          </div>
          <Button size="lg" className="gap-2"><Wallet className="h-5 w-5" />Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-muted-foreground text-xs mt-1 font-mono">{walletAddress?.slice(0, 24)}…</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 border border-border/50 text-xs">
            <Shield className="h-3 w-3" />
            Sizes encrypted
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAmounts(!showAmounts)}
            className="gap-2 border-border/50 text-xs"
          >
            {showAmounts ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showAmounts ? 'Hide' : 'Reveal'} Sizes
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
          <StatsCard title="Total Orders"   value={stats.totalBets}   subtitle="All time"   icon={Activity} />
          <StatsCard title="Open Orders"    value={stats.activeBets}  subtitle="Live"       icon={Clock} />
          <StatsCard
            title="Total Wagered"
            value={showAmounts ? `${(stats.totalWagered / 1_000_000).toFixed(1)}M` : '••••'}
            subtitle="ALEO (private)"
            icon={TrendingUp}
          />
          <StatsCard title="Win Rate"       value={`${stats.winRate}%`} subtitle="Filled" icon={Shield} />
        </div>
      )}

      {/* Order tabs */}
      <Tabs defaultValue="open">
        <TabsList className="bg-muted/50 border border-border/50 mb-5">
          <TabsTrigger value="open" className="gap-2 text-xs">
            <Clock className="h-3.5 w-3.5" />
            Open / Partial ({openOrders.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="gap-2 text-xs">
            <Shield className="h-3.5 w-3.5" />
            Filled / Cancelled ({closedOrders.length})
          </TabsTrigger>
        </TabsList>

        {[
          { key: 'open',   list: openOrders,   empty: 'No open orders.' },
          { key: 'closed', list: closedOrders,  empty: 'No completed orders yet.' },
        ].map(({ key, list, empty }) => (
          <TabsContent key={key} value={key}>
            {list.length === 0 ? (
              <div className="text-center py-14">
                <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{empty}</p>
                <Link to="/"><Button className="mt-4 gap-2" size="sm"><TrendingUp className="h-4 w-4" />Browse Pairs</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {list.map((order) => {
                  const pairTitle = order.pairId ?? order.marketId;
                  const priceDecimals = order.price < 1 ? 4 : order.price < 100 ? 2 : 1;

                  return (
                    <Card key={order.id} className={cn(
                      'p-5 border-border/50 bg-card/80 backdrop-blur-sm',
                      order.orderStatus === 'filled' && 'border-accent/20',
                    )}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('text-sm font-bold uppercase', order.side === 'buy' ? 'text-buy' : 'text-sell')}>
                              {order.side}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">{pairTitle}</span>
                            {order.orderStatus === 'open' && order.transactionId ? (
                              <span className="flex flex-col gap-0.5">
                                <Badge variant="outline" className="text-[10px] border border-primary/30 text-primary bg-primary/10 gap-1">
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  pending
                                </Badge>
                                <PendingTimer createdAt={order.createdAt} />
                              </span>
                            ) : order.orderStatus === 'filled' ? (
                              <Badge variant="outline" className="text-[10px] border border-accent/30 text-accent bg-accent/10 gap-1">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                confirmed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={cn('text-[10px] border', statusStyle[order.orderStatus ?? 'open'])}>
                                {order.orderStatus}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Price: <span className="font-mono text-foreground font-medium">
                              {order.price.toFixed(priceDecimals)}
                            </span>
                          </p>
                          {order.transactionId && (
                            <p className="text-[10px] font-mono text-muted-foreground">
                              TX: {order.transactionId.slice(0, 22)}…
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 justify-end">
                            <Lock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-base font-bold font-mono">{fmt(order.amount)}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">ALEO (private)</p>
                          {order.filledAmount > 0 && showAmounts && (
                            <p className="text-xs text-accent mt-0.5">
                              {fmt(order.filledAmount)} filled
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link to={`/market/${order.pairId ?? order.marketId}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                          {(order.orderStatus === 'open' || order.orderStatus === 'partial') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleCancel(order.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

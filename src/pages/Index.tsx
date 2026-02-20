import { useMemo, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAleoWallet } from '@/components/WalletProvider';
import { MarketCard } from '@/components/MarketCard';
import { MarketFilters } from '@/components/MarketFilters';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockMarkets } from '@/lib/mockData';
import { TrendingUp, Shield, Users, Activity, Zap, Lock, ArrowRight, Plus } from 'lucide-react';

export default function HomePage() {
  const { filters, setCreateMarketModalOpen, markets, setMarkets } = useAppStore();
  const { connected: walletConnected } = useAleoWallet();

  useEffect(() => {
    if (markets.length === 0) setMarkets(mockMarkets);
  }, []);

  const filtered = useMemo(() => {
    let result = [...markets];
    if (filters.category !== 'all') result = result.filter(m => m.category === filters.category);
    if (filters.status !== 'all') {
      const statusMap: Record<string, string> = { active: 'active', pending: 'pending', resolved: 'cancelled' };
      result = result.filter(m => m.status === (statusMap[filters.status] ?? filters.status));
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(m => m.title.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
    }
    switch (filters.sortBy) {
      case 'volume':      result.sort((a, b) => b.totalVolume - a.totalVolume); break;
      case 'newest':      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case 'ending_soon': result.sort((a, b) => {
        const sa = (a as any).bestAsk - (a as any).bestBid;
        const sb = (b as any).bestAsk - (b as any).bestBid;
        return sa - sb;
      }); break;
    }
    return result;
  }, [markets, filters]);

  const stats = useMemo(() => ({
    totalVolume: markets.reduce((s, m) => s + m.totalVolume, 0),
    totalPairs: markets.length,
    totalTraders: markets.reduce((s, m) => s + m.participantCount, 0),
  }), [markets]);

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-grid opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/6 via-transparent to-transparent" />
        <div className="absolute top-16 left-1/4 w-72 h-72 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute top-8 right-1/4 w-52 h-52 bg-accent/8 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-14 sm:py-20 relative">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <Badge variant="outline" className="gap-2 px-4 py-1.5 border-primary/30 bg-primary/5 text-xs">
              <Zap className="h-3 w-3 text-primary" />
              Private Limit Order Book · Powered by Aleo ZK Proofs
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Trade with{' '}
              <span className="gradient-text">Zero Exposure.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              PrivateClaw is a privacy-first limit order DEX. Order sizes, balances, and
              strategies stay encrypted on Aleo — only aggregated price levels are public.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {!walletConnected ? (
                <Button size="lg" className="gap-2">
                  <Lock className="h-4 w-4" />
                  Connect Wallet to Trade
                </Button>
              ) : (
                <Button size="lg" className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => setCreateMarketModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                  List Trading Pair
                </Button>
              )}
              <Button variant="outline" size="lg" className="gap-2 border-border/50 hover:border-primary/40" onClick={() => { document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}>
                How It Works
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
              {[
                { icon: Lock,      label: 'Encrypted Orders' },
                { icon: Shield,    label: 'Private Balances' },
                { icon: Zap,       label: 'ZK Settlement' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-12 border-b border-border/50">
        <h2 className="text-xl font-bold mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { step: '01', title: 'Connect Your Wallet', desc: 'Link your Leo wallet. Your address and balances remain private via Aleo ZK proofs.' },
            { step: '02', title: 'Place a Private Order', desc: 'Submit buy or sell orders. Order sizes are encrypted — only aggregated price levels are visible.' },
            { step: '03', title: 'Settle Trustlessly', desc: 'Matched orders settle via ZK transitions on Aleo. No custody, no exposure, no middlemen.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex flex-col gap-2 p-4 rounded-lg border border-border/50 bg-card">
              <span className="text-2xl font-bold text-primary/60">{step}</span>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard title="24h Volume" value={`${(stats.totalVolume / 1_000_000).toFixed(1)}M`} subtitle="microcredits traded" icon={TrendingUp} />
          <StatsCard title="Trading Pairs" value={stats.totalPairs} subtitle="Active limit-order books" icon={Activity} />
          <StatsCard title="Private Traders" value={stats.totalTraders.toLocaleString()} subtitle="Anonymous participants" icon={Users} />
        </div>
      </section>

      {/* Pairs grid */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <h2 className="text-xl font-bold">Trading Pairs</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 border border-border/50 text-xs">
              <Shield className="h-3 w-3" />
              All orders private
            </Badge>
            {walletConnected && (
              <Button size="sm" onClick={() => setCreateMarketModalOpen(true)} className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                List Pair
              </Button>
            )}
          </div>
        </div>

        <MarketFilters />

        <div className="mt-6">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pairs found</h3>
              <p className="text-muted-foreground text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((pair) => <MarketCard key={pair.id} market={pair} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

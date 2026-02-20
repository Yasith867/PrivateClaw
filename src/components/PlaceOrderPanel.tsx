import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import { useAleoWallet } from '@/components/WalletProvider';
import { aleoService } from '@/lib/aleoService';
import { useToast } from '@/hooks/use-toast';
import type { TradingPair, Order, OrderSide } from '@/lib/schema';
import { Shield, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  pair: TradingPair;
  initialPrice?: number;
  initialSide?: OrderSide;
}

export function PlaceOrderPanel({ pair, initialPrice, initialSide = 'buy' }: Props) {
  const { userBets, setUserBets } = useAppStore();
  const { connected, address, requestTransaction } = useAleoWallet();
  const { toast } = useToast();

  const [side, setSide] = useState<OrderSide>(initialSide);
  const [price, setPrice] = useState<string>(
    initialPrice
      ? String(initialPrice)
      : String(initialSide === 'buy' ? pair.bestBid : pair.bestAsk),
  );
  const [amount, setAmount] = useState<string>('100000');
  const [showAmount, setShowAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const priceNum = parseFloat(price) || 0;
  const amountNum = parseInt(amount) || 0;

  const handleSetPrice = (p: number) => setPrice(String(p));

  const handleSubmit = async () => {
    if (!connected || !address || !priceNum || !amountNum) return;
    if (!requestTransaction) {
      toast({ title: 'Wallet not ready', description: 'Please ensure Leo Wallet is connected.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    try {
      // Use the actual pair.id (NOT a random ID) so the Leo contract
      // can look up the market. generatePairId() was incorrectly used here.
      const transaction = aleoService.createPlaceOrderTransaction(
        address,
        pair.id,
        side,
        amountNum,
        priceNum,
      );

      // This triggers the real Leo Wallet popup — user must approve
      const txId = await requestTransaction(transaction);

      const newOrder: Order = {
        id: `order-${Date.now()}`,
        marketId: pair.id,
        pairId: pair.id,
        outcomeId: side,
        side,
        price: priceNum,
        amount: amountNum,
        filledAmount: 0,
        ownerAddress: address,
        createdAt: new Date().toISOString(),
        isSettled: false,
        orderStatus: 'open',
        recordNonce: String(priceNum),
        transactionId: txId,
      };

      setUserBets([...userBets, newOrder] as Order[]);

      toast({
        title: `${side === 'buy' ? '🟢 Buy' : '🔴 Sell'} order submitted`,
        description: `TX: ${txId?.slice(0, 20)}… — awaiting Aleo Testnet confirmation.`,
      });
    } catch (err: unknown) {
      // Log the full error chain so we can see the exact RPC rejection reason
      console.error('[PlaceOrderPanel] Transaction failed:', err);
      if (err && typeof err === 'object') {
        // Leo Wallet often wraps the real error in cause or data
        const e = err as Record<string, unknown>;
        if (e.cause) console.error('[PlaceOrderPanel] cause:', e.cause);
        if (e.data)  console.error('[PlaceOrderPanel] data:', e.data);
        if (e.error) console.error('[PlaceOrderPanel] error field:', e.error);
      }
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Transaction rejected or failed.';
      toast({ title: 'Order failed', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBuy = side === 'buy';

  return (
    <div className="flex flex-col gap-4 p-4 bg-card border border-border/50 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Place Order</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Shield className="h-3 w-3 text-primary" />
          <span>ZK encrypted</span>
        </div>
      </div>

      {/* Buy / Sell tabs */}
      <Tabs value={side} onValueChange={(v) => setSide(v as OrderSide)}>
        <TabsList className="w-full p-0 h-9 bg-muted/50 border border-border/50">
          <TabsTrigger
            value="buy"
            className="flex-1 h-full data-[state=active]:bg-buy data-[state=active]:text-buy-foreground data-[state=active]:text-accent-foreground rounded-sm text-sm font-semibold"
          >
            BUY
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="flex-1 h-full data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground rounded-sm text-sm font-semibold"
          >
            SELL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="mt-0" />
        <TabsContent value="sell" className="mt-0" />
      </Tabs>

      {/* Price */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Price ({pair.quoteAsset})</Label>
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="font-mono bg-muted/50 border-border/50 text-sm"
          placeholder="0.0000"
        />
        <div className="flex gap-2 text-[10px]">
          <button onClick={() => handleSetPrice(pair.bestBid)} className="text-buy hover:underline">
            Best Bid: {pair.bestBid}
          </button>
          <span className="text-muted-foreground">·</span>
          <button onClick={() => handleSetPrice(pair.bestAsk)} className="text-sell hover:underline">
            Best Ask: {pair.bestAsk}
          </button>
        </div>
      </div>

      {/* Amount (private) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Size (microcredits)</Label>
          <button
            onClick={() => setShowAmount(!showAmount)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            {showAmount ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showAmount ? 'Hide' : 'Reveal'}
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
          <Input
            type={showAmount ? 'number' : 'password'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-8 font-mono bg-muted/50 border-border/50 text-sm"
            placeholder="100000"
          />
        </div>
        <div className="flex gap-2">
          {[100_000, 500_000, 1_000_000, 5_000_000].map((p) => (
            <button
              key={p}
              onClick={() => setAmount(String(p))}
              className={cn(
                'flex-1 py-1 text-[10px] rounded border border-border/50 hover:border-border transition-colors',
                parseInt(amount) === p && 'border-primary text-primary',
              )}
            >
              {p >= 1_000_000 ? `${p / 1_000_000}M` : `${p / 1_000}k`}
            </button>
          ))}
        </div>
      </div>

      {/* ZK notice */}
      <div className="flex items-start gap-2 p-2.5 rounded-md bg-primary/5 border border-primary/15 text-[10px] text-muted-foreground">
        <Shield className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
      <span>
          This order is submitted via <strong className="text-primary">place_bet</strong> transition on Aleo Testnet Beta. Leo Wallet will prompt you to approve.
        </span>
      </div>

      {/* Submit */}
      {!connected ? (
        <Button size="sm" className="w-full gap-2" disabled>
          <Lock className="h-4 w-4" />
          Connect Wallet to Trade
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !priceNum || !amountNum}
          className={cn(
            'w-full gap-2 font-semibold',
            isBuy
              ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
              : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
          )}
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Waiting for wallet…</>
          ) : (
            <><Shield className="h-4 w-4" />{isBuy ? 'Place Buy Order' : 'Place Sell Order'}</>
          )}
        </Button>
      )}
    </div>
  );
}

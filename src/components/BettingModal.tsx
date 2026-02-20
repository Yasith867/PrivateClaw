import { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import { useAleoWallet } from '@/components/WalletProvider';
import { aleoService } from '@/lib/aleoService';
import { useToast } from '@/hooks/use-toast';
import type { OrderSide, Order } from '@/lib/schema';
import { Shield, Lock, Eye, EyeOff, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BettingModal() {
  const {
    selectedMarket,
    selectedOutcomeId,
    isBettingModalOpen,
    setBettingModalOpen,
    setSelectedOutcomeId,
    userBets,
    setUserBets,
  } = useAppStore();

  const { connected, address, requestTransaction } = useAleoWallet();
  const { toast } = useToast();

  const [side, setSide] = useState<OrderSide>('buy');
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<number>(100_000);
  const [showAmount, setShowAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  const pair = selectedMarket;

  const handleClose = useCallback(() => {
    setBettingModalOpen(false);
    setSelectedOutcomeId(null);
    setPrice('');
    setAmount(100_000);
    setTxId(null);
    setIsSubmitting(false);
  }, [setBettingModalOpen, setSelectedOutcomeId]);

  const effectiveSide: OrderSide =
    selectedOutcomeId === 'sell' ? 'sell' : 'buy';

  const handleSubmit = async () => {
    if (!connected || !address || !pair) return;
    if (!requestTransaction) {
      toast({ title: 'Wallet not ready', description: 'Please ensure Leo Wallet is connected.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    try {
      const priceNum = parseFloat(price) || pair.lastPrice;

      const transaction = aleoService.createPlaceOrderTransaction(
        address,
        aleoService.generatePairId(),
        side,
        amount,
        priceNum,
      );

      // Triggers the real Leo Wallet popup — user must sign/approve
      const resultTxId = await requestTransaction(transaction);
      setTxId(resultTxId);

      const newOrder: Order = {
        id: `order-${Date.now()}`,
        marketId: pair.id,
        pairId: pair.id,
        outcomeId: side,
        side,
        price: priceNum,
        amount,
        filledAmount: 0,
        ownerAddress: address,
        createdAt: new Date().toISOString(),
        isSettled: false,
        orderStatus: 'open',
        recordNonce: String(priceNum),
        transactionId: resultTxId,
      };

      setUserBets([...userBets, newOrder] as Order[]);

      toast({
        title: `${side === 'buy' ? '🟢 Buy' : '🔴 Sell'} order submitted`,
        description: `TX: ${resultTxId?.slice(0, 20)}… — pending Aleo Testnet confirmation.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction rejected or failed.';
      toast({ title: 'Order failed', description: message, variant: 'destructive' });
      setIsSubmitting(false);
    }
    setIsSubmitting(false);
  };

  const isBuy = side === 'buy';

  return (
    <Dialog open={isBettingModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Place Order{pair ? ` — ${pair.title}` : ''}
          </DialogTitle>
          <DialogDescription>
            Order is submitted to Aleo Testnet Beta via Leo Wallet.
          </DialogDescription>
        </DialogHeader>

        {!connected ? (
          <div className="py-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto" />
            <p className="text-muted-foreground">Connect your Leo Wallet to place orders.</p>
          </div>
        ) : txId ? (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-accent mx-auto" />
              <p className="font-semibold">Order Submitted to Aleo Testnet</p>
              <p className="text-xs font-mono text-accent break-all">{txId}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <Lock className="h-3 w-3 text-primary" />
              Order size encrypted on-chain. Only you can view it with your private key.
            </p>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Side toggle */}
            <Tabs value={side} onValueChange={(v) => setSide(v as OrderSide)}>
              <TabsList className="w-full p-0 h-9 bg-muted/50 border border-border/50">
                <TabsTrigger
                  value="buy"
                  className="flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm font-semibold"
                >
                  BUY
                </TabsTrigger>
                <TabsTrigger
                  value="sell"
                  className="flex-1 h-full data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground rounded-sm font-semibold"
                >
                  SELL
                </TabsTrigger>
              </TabsList>
              <TabsContent value="buy" />
              <TabsContent value="sell" />
            </Tabs>

            {/* Price */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Price {pair ? `(${pair.quoteAsset})` : ''}
              </Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={pair ? String(isBuy ? pair.bestBid : pair.bestAsk) : '0.0000'}
                className="font-mono bg-muted/50 border-border/50"
              />
              {pair && (
                <div className="flex gap-2 text-[10px]">
                  <button className="text-buy hover:underline" onClick={() => setPrice(String(pair.bestBid))}>
                    Bid {pair.bestBid}
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button className="text-sell hover:underline" onClick={() => setPrice(String(pair.bestAsk))}>
                    Ask {pair.bestAsk}
                  </button>
                </div>
              )}
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
                <div className="pl-8 pr-3 py-2 bg-muted/50 border border-border/50 rounded-md font-mono text-sm">
                  {showAmount ? `${(amount / 1_000_000).toFixed(2)}M ALEO` : '••••••••'}
                </div>
              </div>
              <div className="flex gap-2">
                {[100_000, 500_000, 1_000_000, 5_000_000].map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    className={cn(
                      'flex-1 py-1 text-[10px] rounded border border-border/50 hover:border-border transition-colors',
                      amount === p && 'border-primary text-primary',
                    )}
                  >
                    {p >= 1_000_000 ? `${p / 1_000_000}M` : `${p / 1_000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* ZK notice */}
            <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                Leo Wallet will open to approve this <strong className="text-primary">place_order</strong> transaction. Size &amp; identity stay hidden on-chain.
              </span>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 border-border/50">Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={cn(
                  'flex-1 gap-2 font-semibold',
                  isBuy
                    ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                    : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
                )}
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Waiting for wallet…</>
                ) : (
                  <><Shield className="h-4 w-4" />{isBuy ? 'Buy' : 'Sell'}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

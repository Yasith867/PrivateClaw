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
import { aleoService, PROGRAM_ID, MAX_BET_AMOUNT } from '@/lib/aleoService';
import { useToast } from '@/hooks/use-toast';
import type { OrderSide, Order } from '@/lib/schema';
import {
  Shield, Lock, Eye, EyeOff, AlertTriangle, Loader2,
  CheckCircle2, XCircle, Zap, Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ValidationState = {
  valid: boolean;
  reason: string;
  output: number | null;
  reward: number | null;
} | null;

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

  const { connected, address, executeTransaction } = useAleoWallet();
  const { toast } = useToast();

  const [side, setSide] = useState<OrderSide>('buy');
  const [price, setPrice] = useState<string>('');

  // Bet amount used for Leo contract interaction (1 – 999,999 microcredits)
  const [betAmount, setBetAmount] = useState<string>('50000');

  // Order size for the on-chain trade (microcredits, larger scale)
  const [orderAmount, setOrderAmount] = useState<number>(100_000);
  const [showAmount, setShowAmount] = useState(false);

  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationState>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  const pair = selectedMarket;

  const handleClose = useCallback(() => {
    setBettingModalOpen(false);
    setSelectedOutcomeId(null);
    setPrice('');
    setBetAmount('50000');
    setOrderAmount(100_000);
    setValidation(null);
    setTxId(null);
    setIsSubmitting(false);
  }, [setBettingModalOpen, setSelectedOutcomeId]);

  const effectiveSide: OrderSide = selectedOutcomeId === 'sell' ? 'sell' : 'buy';

  // ─── Validate Bet (local simulation of Leo contract) ─────────────────────
  const handleValidate = useCallback(() => {
    setIsValidating(true);
    setValidation(null);

    const amount = parseInt(betAmount, 10);

    // Simulate a brief processing delay for UX realism
    setTimeout(() => {
      const { valid, reason } = aleoService.simulateValidateBet(amount);
      const output = aleoService.simulatePlaceBet(amount);
      const reward = aleoService.simulateCalculateReward(amount);

      setValidation({ valid, reason, output, reward });
      setIsValidating(false);

      toast({
        title: valid ? 'Bet Validated' : 'Validation Failed',
        description: valid
          ? `validate_bet(${amount}) → true`
          : reason,
        variant: valid ? 'default' : 'destructive',
      });
    }, 600);
  }, [betAmount, toast]);

  // ─── Place Bet (sends real transaction via Shield Wallet) ─────────────────
  const handleSubmit = async () => {
    if (!connected || !address || !pair) return;
    setIsSubmitting(true);

    try {
      const priceNum = parseFloat(price) || pair.lastPrice;

      const txOptions = aleoService.createPlaceOrderTransaction(
        address,
        aleoService.generatePairId(),
        side,
        orderAmount,
        priceNum,
      );

      const result = await executeTransaction(txOptions);
      const resultTxId = result?.transactionId ?? null;
      setTxId(resultTxId);

      const newOrder: Order = {
        id: `order-${Date.now()}`,
        marketId: pair.id,
        pairId: pair.id,
        outcomeId: side,
        side,
        price: priceNum,
        amount: orderAmount,
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
      const name = (err as any)?.name ?? '';
      const isNotInstalled = name === 'WalletNotReadyError' || name === 'WalletNotSelectedError';
      const message = isNotInstalled
        ? 'Shield Wallet extension is not installed. Please install it from shieldwallet.app.'
        : err instanceof Error ? err.message : 'Transaction rejected or failed.';
      toast({ title: 'Order failed', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBuy = side === 'buy';
  const betAmountNum = parseInt(betAmount, 10) || 0;

  return (
    <Dialog open={isBettingModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Place Order{pair ? ` — ${pair.title}` : ''}
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] text-muted-foreground">
            Program: {PROGRAM_ID} · Aleo Testnet
          </DialogDescription>
        </DialogHeader>

        {!connected ? (
          <div className="py-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto" />
            <p className="text-muted-foreground">Connect your Shield Wallet to place orders.</p>
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
          <div className="space-y-4">

            {/* ── Leo Contract Interaction ─────────────────────────── */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                Leo Contract Interaction
              </p>

              {/* Bet amount input */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Bet Amount (microcredits · max {MAX_BET_AMOUNT.toLocaleString()})
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={MAX_BET_AMOUNT}
                  value={betAmount}
                  onChange={(e) => {
                    setBetAmount(e.target.value);
                    setValidation(null);
                  }}
                  placeholder="e.g. 50000"
                  className="font-mono bg-muted/50 border-border/50"
                />
                <div className="flex gap-1.5">
                  {[1_000, 50_000, 250_000, 750_000].map((v) => (
                    <button
                      key={v}
                      onClick={() => { setBetAmount(String(v)); setValidation(null); }}
                      className={cn(
                        'flex-1 py-0.5 text-[10px] rounded border border-border/50 hover:border-border transition-colors',
                        betAmountNum === v && 'border-primary text-primary',
                      )}
                    >
                      {v >= 1_000 ? `${v / 1_000}k` : v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Validate Bet button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10 text-xs"
                onClick={handleValidate}
                disabled={isValidating || !betAmountNum}
              >
                {isValidating
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Running validate_bet…</>
                  : <><Zap className="h-3.5 w-3.5" />Validate Bet</>
                }
              </Button>

              {/* Validation result */}
              {validation && (
                <div className="space-y-2 animate-fade-in">
                  {/* validate_bet result */}
                  <div className={cn(
                    'flex items-center gap-2 p-2 rounded border text-xs',
                    validation.valid
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'bg-destructive/10 border-destructive/30 text-destructive',
                  )}>
                    {validation.valid
                      ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 shrink-0" />
                    }
                    <span className="font-mono">
                      validate_bet({betAmountNum}u64) → {String(validation.valid)}
                    </span>
                  </div>

                  {validation.valid && validation.output !== null && (
                    <>
                      {/* place_bet output */}
                      <div className="flex items-center gap-2 p-2 rounded border border-border/50 bg-muted/30 text-xs">
                        <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-mono text-muted-foreground">
                          place_bet({betAmountNum}u64) →{' '}
                          <span className="text-foreground font-semibold">
                            {validation.output.toLocaleString()}u64
                          </span>
                        </span>
                      </div>

                      {/* calculate_reward output */}
                      {validation.reward !== null && (
                        <div className="flex items-center gap-2 p-2 rounded border border-border/50 bg-muted/30 text-xs">
                          <Trophy className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                          <span className="font-mono text-muted-foreground">
                            calculate_reward({betAmountNum}u64) →{' '}
                            <span className="text-yellow-400 font-semibold">
                              {validation.reward.toLocaleString()}u64
                            </span>
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {!validation.valid && (
                    <p className="text-[10px] text-muted-foreground">{validation.reason}</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Trade Order (Shield Wallet) ──────────────────────── */}
            <div className="space-y-3">
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

              {/* Order size (private) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Order Size (microcredits)</Label>
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
                    {showAmount ? `${(orderAmount / 1_000_000).toFixed(2)}M ALEO` : '••••••••'}
                  </div>
                </div>
                <div className="flex gap-2">
                  {[100_000, 500_000, 1_000_000, 5_000_000].map((p) => (
                    <button
                      key={p}
                      onClick={() => setOrderAmount(p)}
                      className={cn(
                        'flex-1 py-1 text-[10px] rounded border border-border/50 hover:border-border transition-colors',
                        orderAmount === p && 'border-primary text-primary',
                      )}
                    >
                      {p >= 1_000_000 ? `${p / 1_000_000}M` : `${p / 1_000}k`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ZK notice */}
            <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                Shield Wallet will open to approve this{' '}
                <strong className="text-primary">place_bet</strong> transaction.
                Order size &amp; identity stay hidden on-chain via ZK proofs.
              </span>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 border-border/50">
                Cancel
              </Button>
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
                  <><Shield className="h-4 w-4" />{isBuy ? 'Place Buy' : 'Place Sell'}</>
                )}
              </Button>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

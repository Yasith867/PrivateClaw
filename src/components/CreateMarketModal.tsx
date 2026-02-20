import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { useAleoWallet } from '@/components/WalletProvider';
import { aleoService } from '@/lib/aleoService';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Plus, X } from 'lucide-react';
import type { TradingPair } from '@/lib/schema';

// CreateMarketModal → CreatePairModal
// Keeps same export name so App.tsx import is unchanged.

const schema = z.object({
  baseAsset: z.string().min(2, 'Enter base asset (e.g. ALEO)').max(10),
  quoteAsset: z.string().min(2, 'Enter quote asset (e.g. USDC)').max(10),
  category: z.enum(['crypto', 'politics', 'sports', 'technology', 'finance', 'other']),
  description: z.string().max(500).optional(),
  initialPrice: z.string().min(1, 'Initial price required'),
});

type FormValues = z.infer<typeof schema>;

export function CreateMarketModal() {
  const { isCreateMarketModalOpen, setCreateMarketModalOpen, markets, setMarkets } = useAppStore();
  const { connected: walletConnected, address: walletAddress, requestTransaction } = useAleoWallet();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { baseAsset: '', quoteAsset: 'USDC', category: 'crypto', description: '', initialPrice: '' },
  });

  const handleClose = () => {
    setCreateMarketModalOpen(false);
    form.reset();
    setTxId(null);
  };

  const onSubmit = async (data: FormValues) => {
    if (!walletConnected || !walletAddress || !requestTransaction) return;
    setIsSubmitting(true);

    try {
      const price = parseFloat(data.initialPrice) || 1;
      const pairIdRaw = aleoService.generatePairId();

      const transaction = aleoService.createListPairTransaction(
        walletAddress,
        pairIdRaw,
        2 // buy + sell
      );

      // Triggers real Leo Wallet popup
      const resultTxId = await requestTransaction(transaction);
      setTxId(resultTxId);

      const newPair: TradingPair = {
        id: `pair-${pairIdRaw}`,
        title: `${data.baseAsset.toUpperCase()}/${data.quoteAsset.toUpperCase()}`,
        description: data.description,
        category: data.category,
        outcomes: [
          { id: 'buy',  label: 'BUY',  probability: 50 },
          { id: 'sell', label: 'SELL', probability: 50 },
        ],
        status: 'active',
        resolutionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        creatorAddress: walletAddress,
        totalVolume: 0,
        participantCount: 0,
        baseAsset: data.baseAsset.toUpperCase(),
        quoteAsset: data.quoteAsset.toUpperCase(),
        lastPrice: price,
        priceChange24h: 0,
        high24h: price,
        low24h: price,
        bestBid: parseFloat((price * 0.999).toFixed(4)),
        bestAsk: parseFloat((price * 1.001).toFixed(4)),
        transactionId: resultTxId,
      };

      setMarkets([...markets, newPair]);

      toast({
        title: 'Trading pair listed!',
        description: `${newPair.title} is now live on PrivateClaw. TX: ${resultTxId?.slice(0, 20)}…`,
      });
    } catch (err: unknown) {
      console.error('[CreateMarketModal] create_market failed:', err);
      if (err && typeof err === 'object') {
        const e = err as Record<string, unknown>;
        if (e.cause) console.error('[CreateMarketModal] cause:', e.cause);
        if (e.data)  console.error('[CreateMarketModal] data:', e.data);
        if (e.error) console.error('[CreateMarketModal] error field:', e.error);
      }
      const message =
        err instanceof Error ? err.message
        : typeof err === 'string' ? err
        : 'Transaction rejected or failed.';
      toast({ title: 'Failed to list pair', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isCreateMarketModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            List Trading Pair
          </DialogTitle>
          <DialogDescription>
            Add a new private limit-order trading pair to PrivateClaw.
          </DialogDescription>
        </DialogHeader>

        {txId ? (
          <div className="py-6 space-y-4">
            <div className="p-6 rounded-xl bg-accent/10 border border-accent/20 text-center space-y-3">
              <Shield className="h-12 w-12 text-accent mx-auto" />
              <p className="text-lg font-semibold">Pair Listed Successfully!</p>
              <p className="text-xs text-muted-foreground font-mono">TX: {txId}</p>
            </div>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="baseAsset"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Base Asset</FormLabel>
                      <FormControl>
                        <Input placeholder="ALEO" className="uppercase bg-muted/50 border-border/50" {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quoteAsset"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Quote Asset</FormLabel>
                      <FormControl>
                        <Input placeholder="USDC" className="uppercase bg-muted/50 border-border/50" {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="initialPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Initial Price</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.0000" className="font-mono bg-muted/50 border-border/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['crypto', 'finance', 'technology', 'other'].map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of this trading pair..." className="bg-muted/50 border-border/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Listing triggers a private transition on-chain. Order book initialised with ZK privacy from genesis.</span>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1 border-border/50">Cancel</Button>
                <Button type="submit" disabled={isSubmitting || !walletConnected} className="flex-1 gap-2">
                  {isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Listing…</>
                    : <><Plus className="h-4 w-4" />List Pair</>}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

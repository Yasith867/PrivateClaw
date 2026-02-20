import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAleoWallet } from '@/components/WalletProvider';
import { aleoService } from '@/lib/aleoService';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { TradingPair, Order, OrderBook, OrderSide } from '@/lib/schema';
import {
  Bot, ChevronDown, ChevronUp, Loader2, Shield, Zap,
  TrendingUp, TrendingDown, X, RefreshCw, AlertTriangle,
  MessageSquare, BarChart2, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeSuggestion {
  action: 'place_order' | 'cancel_order' | 'hold' | 'improve_price';
  side?: 'buy' | 'sell';
  price?: number;
  amount?: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  orderId?: string;
}

interface ChatMsg { role: 'user' | 'assistant'; content: string; }

interface Props {
  pair: TradingPair;
  orderBook: OrderBook;
  myOrders: Order[];
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const confidenceColor = {
  high:   'text-buy border-buy/30 bg-buy/5',
  medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  low:    'text-muted-foreground border-border/50 bg-card',
};
const confidenceDot = {
  high:   'bg-buy',
  medium: 'bg-yellow-400',
  low:    'bg-muted-foreground',
};

// Minimal markdown renderer (bold, bullets, inline code)
function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        // bullet
        if (line.match(/^[-*]\s/)) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-primary mt-0.5 shrink-0">•</span>
              <span>{renderInline(line.replace(/^[-*]\s/, ''))}</span>
            </div>
          );
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1 py-0.5 rounded bg-muted text-primary font-mono text-[10px]">{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function AITradingAssistant({ pair, orderBook, myOrders }: Props) {
  const { connected, address, requestTransaction } = useAleoWallet();
  const { userBets, setUserBets } = useAppStore();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'suggestions' | 'chat'>('suggestions');

  // ── Suggestions state ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TradeSuggestion[]>([]);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // Auto-scroll chat on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Build shared context payload
  const buildContext = () => ({
    pair: {
      title: pair.title, baseAsset: pair.baseAsset, quoteAsset: pair.quoteAsset,
      lastPrice: pair.lastPrice, priceChange24h: pair.priceChange24h,
      high24h: pair.high24h, low24h: pair.low24h,
      bestBid: pair.bestBid, bestAsk: pair.bestAsk, totalVolume: pair.totalVolume,
    },
    bids:          orderBook.bids,
    asks:          orderBook.asks,
    spread:        orderBook.spread,
    spreadPercent: orderBook.spreadPercent,
    myOrders: myOrders
      .filter(o => o.orderStatus === 'open' || o.orderStatus === 'partial')
      .map(o => ({ side: o.side, price: o.price, amount: o.amount, orderStatus: o.orderStatus })),
  });

  // ── Suggestions fetch ──────────────────────────────────────────────────────
  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-trading-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          pair: buildContext().pair,
          bids: orderBook.bids, asks: orderBook.asks,
          myOrders: buildContext().myOrders,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
      if (!Array.isArray(data.suggestions) || data.suggestions.length === 0) {
        setError('AI returned no suggestions. Try again.');
      } else {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Chat send (streaming) ──────────────────────────────────────────────────
  const sendChat = async (text: string) => {
    if (!text.trim() || chatStreaming) return;

    const userMsg: ChatMsg = { role: 'user', content: text.trim() };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setChatInput('');
    setChatStreaming(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-trading-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ messages: nextHistory, context: buildContext() }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'Stream failed' }));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let assembled = '';

      // Append placeholder assistant message
      setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;

          const json = line.slice(6).trim();
          if (json === '[DONE]') break;

          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assembled += delta;
              setChatMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: assembled };
                return next;
              });
            }
          } catch { /* partial chunk */ }
        }
      }

      // Flush any remaining buffer
      if (buf.trim()) {
        for (const raw of buf.split('\n')) {
          if (!raw.startsWith('data: ')) continue;
          const json = raw.slice(6).trim();
          if (json === '[DONE]') continue;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assembled += delta;
              setChatMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: assembled };
                return next;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chat error';
      toast({ title: 'Chat error', description: msg, variant: 'destructive' });
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${msg}` },
      ]);
    } finally {
      setChatStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // ── Approve suggestion ─────────────────────────────────────────────────────
  const handleApprove = async (suggestion: TradeSuggestion, index: number) => {
    if (!connected || !address || !requestTransaction) {
      toast({ title: 'Wallet not connected', description: 'Connect Leo Wallet to execute.', variant: 'destructive' });
      return;
    }
    if (suggestion.action === 'hold') {
      toast({ title: 'Holding position', description: suggestion.reason });
      return;
    }
    setExecutingId(index);
    try {
      if (suggestion.action === 'place_order' || suggestion.action === 'improve_price') {
        const side   = suggestion.side ?? 'buy';
        const price  = suggestion.price ?? pair.lastPrice;
        const amount = suggestion.amount ?? 500_000;
        const tx     = aleoService.createPlaceOrderTransaction(address, aleoService.generatePairId(), side, amount, price);
        const txId   = await requestTransaction(tx);
        const newOrder: Order = {
          id: `order-ai-${Date.now()}`, marketId: pair.id, pairId: pair.id,
          outcomeId: side, side: side as OrderSide, price, amount, filledAmount: 0,
          ownerAddress: address, createdAt: new Date().toISOString(), isSettled: false,
          orderStatus: 'open', recordNonce: String(price), transactionId: txId,
        };
        setUserBets([...userBets, newOrder] as Order[]);
        toast({ title: '✅ AI suggestion executed', description: `${side.toUpperCase()} @ ${price} — TX: ${txId?.slice(0, 16)}…` });
      } else if (suggestion.action === 'cancel_order') {
        const targetOrder = suggestion.orderId
          ? myOrders.find(o => o.id === suggestion.orderId)
          : myOrders.find(o => o.orderStatus === 'open');
        if (!targetOrder) { toast({ title: 'No open order to cancel', variant: 'destructive' }); return; }
        const tx = aleoService.createCancelOrderTransaction(address, targetOrder.id);
        await requestTransaction(tx);
        setUserBets((userBets as Order[]).map(o =>
          o.id === targetOrder.id ? { ...o, orderStatus: 'cancelled' as const, isSettled: true } : o
        ) as Order[]);
        toast({ title: '✅ Order cancelled via AI suggestion' });
      }
      setSuggestions(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      toast({ title: 'Execution failed', description: err instanceof Error ? err.message : 'Rejected.', variant: 'destructive' });
    } finally {
      setExecutingId(null);
    }
  };

  const handleOpen = () => {
    setOpen(prev => {
      if (!prev && suggestions.length === 0 && tab === 'suggestions') fetchSuggestions();
      return !prev;
    });
  };

  const priceDecimals = pair.lastPrice < 1 ? 4 : pair.lastPrice < 100 ? 2 : pair.lastPrice < 10_000 ? 1 : 0;

  const quickPrompts = [
    `Should I buy ${pair.baseAsset} now?`,
    `What's the spread telling me?`,
    `Is the order book bullish or bearish?`,
    `Best price to place a buy order?`,
  ];

  return (
    <div className="bg-card border border-primary/20 rounded-lg overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold">AI Trading Assistant</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            ZK-Safe
          </span>
        </div>
        <div className="flex items-center gap-2">
          {suggestions.length > 0 && !open && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">
              {suggestions.length}
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border/50">
          {/* Tab bar */}
          <div className="flex border-b border-border/50">
            <button
              onClick={() => { setTab('suggestions'); if (suggestions.length === 0 && !loading) fetchSuggestions(); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                tab === 'suggestions'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <BarChart2 className="h-3 w-3" />
              Suggestions
              {suggestions.length > 0 && (
                <span className="ml-0.5 px-1 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold">
                  {suggestions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('chat')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                tab === 'chat'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <MessageSquare className="h-3 w-3" />
              Ask AI
            </button>
          </div>

          {/* ── SUGGESTIONS TAB ────────────────────────────────────────────── */}
          {tab === 'suggestions' && (
            <div className="px-4 pb-4 pt-3 space-y-3">
              <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/15 text-[10px] text-muted-foreground">
                <Shield className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <span>AI never executes automatically. Every action requires your Leo Wallet signature.</span>
              </div>

              {loading && (
                <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs">Analyzing {pair.title}…</span>
                </div>
              )}

              {error && !loading && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-destructive font-medium">Analysis failed</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 break-words">{error}</p>
                  </div>
                </div>
              )}

              {!loading && suggestions.length > 0 && (
                <div className="space-y-2">
                  {suggestions.map((s, i) => (
                    <div key={i} className={cn('rounded-md border p-3 space-y-2', confidenceColor[s.confidence])}>
                      <div className="flex items-center gap-2">
                        {s.action === 'place_order' || s.action === 'improve_price'
                          ? s.side === 'buy' ? <TrendingUp className="h-4 w-4 text-buy" /> : <TrendingDown className="h-4 w-4 text-sell" />
                          : s.action === 'cancel_order' ? <X className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                        <span className="text-xs font-bold uppercase tracking-wide">
                          {s.action === 'place_order' ? `${s.side} Order` :
                           s.action === 'improve_price' ? `Improve ${s.side} Price` :
                           s.action === 'cancel_order' ? 'Cancel Order' : 'Hold'}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className={cn('inline-block w-1.5 h-1.5 rounded-full', confidenceDot[s.confidence])} />
                          {s.confidence}
                        </span>
                      </div>
                      {(s.price != null || s.amount != null) && (
                        <div className="flex gap-3 text-[10px] font-mono">
                          {s.price  != null && <span><span className="text-muted-foreground">Price: </span><span className="font-semibold">{s.price.toFixed(priceDecimals)}</span></span>}
                          {s.amount != null && <span><span className="text-muted-foreground">Size: </span><span className="font-semibold">{(s.amount / 1_000_000).toFixed(2)}M μcr</span></span>}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{s.reason}</p>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(s, i)}
                        disabled={executingId === i}
                        className={cn(
                          'w-full h-7 text-xs gap-1.5 font-semibold',
                          s.action === 'cancel_order'   ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' :
                          s.action === 'hold'           ? 'bg-muted text-foreground hover:bg-muted/80' :
                          s.side === 'buy'              ? 'bg-accent hover:bg-accent/90 text-accent-foreground' :
                          'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
                        )}
                      >
                        {executingId === i
                          ? <><Loader2 className="h-3 w-3 animate-spin" />Waiting for wallet…</>
                          : <><Zap className="h-3 w-3" />Approve &amp; Execute</>}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {!loading && !error && suggestions.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-3">
                  No suggestions yet. Click refresh to analyse.
                </p>
              )}

              {!loading && (
                <Button variant="outline" size="sm" onClick={fetchSuggestions} className="w-full h-7 text-xs gap-1.5 border-border/50">
                  <RefreshCw className="h-3 w-3" />Refresh Analysis
                </Button>
              )}
            </div>
          )}

          {/* ── CHAT TAB ───────────────────────────────────────────────────── */}
          {tab === 'chat' && (
            <div className="flex flex-col" style={{ height: 320 }}>
              {/* Message list */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-[11px]">
                {chatMessages.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-muted-foreground text-center">
                      Ask anything about <span className="text-foreground font-medium">{pair.title}</span>. The AI has full order book context.
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {quickPrompts.map(q => (
                        <button
                          key={q}
                          onClick={() => sendChat(q)}
                          className="text-left px-2.5 py-1.5 rounded-md border border-border/50 text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-start gap-1.5 max-w-[85%]">
                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="h-2.5 w-2.5 text-primary" />
                        </div>
                        <div className="bg-muted/60 border border-border/40 rounded-lg rounded-tl-none px-2.5 py-2 text-muted-foreground leading-relaxed">
                          {msg.content
                            ? <MiniMarkdown text={msg.content} />
                            : <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                        </div>
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <div className="bg-primary/10 border border-primary/20 rounded-lg rounded-tr-none px-2.5 py-2 text-foreground max-w-[85%]">
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}

                <div ref={chatEndRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-border/50 px-3 py-2 flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
                  placeholder={`Ask about ${pair.title}…`}
                  disabled={chatStreaming}
                  className="flex-1 bg-muted/50 border border-border/50 rounded-md px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
                />
                <button
                  onClick={() => sendChat(chatInput)}
                  disabled={chatStreaming || !chatInput.trim()}
                  className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-40 transition-colors"
                >
                  {chatStreaming
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

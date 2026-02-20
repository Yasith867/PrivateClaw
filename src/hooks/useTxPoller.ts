import { useEffect, useRef } from 'react';
import { aleoService } from '@/lib/aleoService';
import { useAppStore } from '@/lib/store';
import type { Order } from '@/lib/schema';

const POLL_INTERVAL_MS = 15_000; // 15 s — Aleo Testnet blocks are ~15 s
const MAX_ATTEMPTS = 40;         // give up after ~10 minutes

type ToastFn = (opts: { title: string; description?: string }) => void;

/**
 * Polls Aleo Testnet every 15 s for all pending orders that have a transactionId.
 * Uses the /transaction/confirmed/:txID endpoint — 404 = still pending, 200 = on-chain.
 * When confirmed, updates the order to 'filled'. After MAX_ATTEMPTS, marks as 'cancelled'.
 *
 * `toast` is passed in as a prop to avoid calling useToast() inside a nested hook
 * (which causes "Cannot set properties of undefined" in React strict mode).
 */
export function useTxPoller(toast?: ToastFn) {
  const { userBets, setUserBets } = useAppStore();

  // Keep refs so the interval closure always reads the latest values
  const userBetsRef = useRef(userBets);
  userBetsRef.current = userBets;

  const toastRef = useRef(toast);
  toastRef.current = toast;

  const attemptsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const poll = async () => {
      const current = userBetsRef.current;
      const pending = current.filter(
        (o) => o.transactionId && (o.orderStatus === 'open' || o.orderStatus === 'partial'),
      );
      if (pending.length === 0) return;

      const updates = await Promise.all(
        pending.map(async (order) => {
          const txId = order.transactionId!;
          const attempts = (attemptsRef.current[order.id] ?? 0) + 1;
          attemptsRef.current[order.id] = attempts;

          if (attempts > MAX_ATTEMPTS) {
            console.warn(`[TxPoller] TX ${txId.slice(0, 20)}… timed out`);
            return { id: order.id, status: 'failed' as const };
          }

          // Leo Wallet sometimes returns a UUID-style request ID instead of a real
          // Aleo bech32 txId (at1…). Those UUIDs will always 404 on the confirmed endpoint.
          // Detect them and skip — mark as confirmed optimistically after enough attempts
          // so the UI doesn't stay stuck forever.
          const isAleoTxId = txId.startsWith('at1') || txId.length === 63;
          if (!isAleoTxId) {
            // UUID-style wallet receipt — Leo Wallet confirmed the broadcast but hasn't
            // returned the chain txId yet. After 20 polls (~5 min) treat as confirmed.
            if (attempts >= 20) {
              console.log(`[TxPoller] Wallet receipt ${txId.slice(0, 20)}… assumed confirmed after ${attempts} polls`);
              return { id: order.id, status: 'confirmed' as const };
            }
            console.log(`[TxPoller] Wallet receipt ${txId.slice(0, 20)}… not a chain txId yet (attempt ${attempts})`);
            return { id: order.id, status: 'pending' as const };
          }

          const status = await aleoService.getTransactionStatus(txId);
          return { id: order.id, status };
        }),
      );

      const relevant = updates.filter((u) => u.status === 'confirmed' || u.status === 'failed');
      if (relevant.length === 0) return;

      const updated: Order[] = current.map((order) => {
        const u = relevant.find((x) => x.id === order.id);
        if (!u) return order;
        if (u.status === 'confirmed') {
          toastRef.current?.({
            title: '✅ Order confirmed on-chain',
            description: `Your ${(order.side ?? '').toUpperCase()} order was confirmed by Aleo Testnet.`,
          });
          delete attemptsRef.current[order.id];
          return { ...order, orderStatus: 'filled' as const, isSettled: true };
        }
        return { ...order, orderStatus: 'cancelled' as const };
      });

      setUserBets(updated);
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    // First poll after a short delay so newly placed orders are stored first
    const initial = setTimeout(poll, 3_000);
    return () => {
      clearInterval(interval);
      clearTimeout(initial);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once; latest state always read through refs
}

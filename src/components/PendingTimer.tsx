import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

const MAX_MS = 40 * 15_000; // 40 polls × 15s = 600s = 10 min

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

interface Props {
  createdAt: string; // ISO string
}

export function PendingTimer({ createdAt }: Props) {
  const start = new Date(createdAt).getTime();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = now - start;
  const remaining = Math.max(0, MAX_MS - elapsed);
  const pct = Math.min(100, (elapsed / MAX_MS) * 100);

  const color =
    pct < 50  ? 'text-primary'
    : pct < 80 ? 'text-[hsl(var(--spread))]'
    : 'text-destructive';

  return (
    <span className={`flex items-center gap-1 text-[10px] font-mono ${color}`} title={`~${fmt(remaining)} until timeout`}>
      <Timer className="h-2.5 w-2.5 shrink-0" />
      {fmt(elapsed)} · {fmt(remaining)} left
    </span>
  );
}

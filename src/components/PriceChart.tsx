import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { generateOHLCV } from '@/lib/ohlcvData';
import type { TradingPair } from '@/lib/schema';
import { cn } from '@/lib/utils';

type CandleSeries = ISeriesApi<'Candlestick', Time>;
type VolSeries    = ISeriesApi<'Histogram',    Time>;

// Design tokens → exact color values matching index.css HSL tokens
const C = {
  bg:       'hsl(222, 24%, 9%)',
  grid:     'hsl(222, 18%, 14%)',
  text:     'hsl(215, 12%, 48%)',
  border:   'hsl(222, 18%, 16%)',
  label:    'hsl(222, 24%, 12%)',
  buy:      'hsl(158, 64%, 42%)',
  buyVol:   'rgba(39,174,96,0.4)',
  sell:     'hsl(0, 70%, 52%)',
  sellVol:  'rgba(220,53,53,0.4)',
};

const INTERVALS = [
  { label: '1m',  minutes: 1,    bars: 120 },
  { label: '5m',  minutes: 5,    bars: 120 },
  { label: '15m', minutes: 15,   bars: 120 },
  { label: '1h',  minutes: 60,   bars: 96  },
  { label: '4h',  minutes: 240,  bars: 60  },
  { label: '1D',  minutes: 1440, bars: 90  },
];

// type aliases defined above near imports

interface Props {
  pair: TradingPair;
}

export function PriceChart({ pair }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<CandleSeries | null>(null);
  const volRef       = useRef<VolSeries | null>(null);

  const [activeInterval, setActiveInterval] = useState(INTERVALS[2]);
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const [crosshairTime,  setCrosshairTime]  = useState<string | null>(null);

  // ── Create chart once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: C.bg },
        textColor:  C.text,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: C.grid },
        horzLines: { color: C.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: C.border, width: 1, style: 3, labelBackgroundColor: C.label },
        horzLine: { color: C.border, width: 1, style: 3, labelBackgroundColor: C.label },
      },
      rightPriceScale: { borderColor: C.grid },
      timeScale:        { borderColor: C.grid, timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale:  true,
    });

    // Candlestick series (v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:         C.buy,
      downColor:       C.sell,
      borderUpColor:   C.buy,
      borderDownColor: C.sell,
      wickUpColor:     C.buy,
      wickDownColor:   C.sell,
    });

    // Volume histogram (v5 API)
    const volSeries = chart.addSeries(HistogramSeries, {
      color:      'rgba(101,78,163,0.35)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });

    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    // Crosshair price / time overlay
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setCrosshairPrice(null);
        setCrosshairTime(null);
        return;
      }
      const bar = param.seriesData.get(candleSeries) as { close?: number } | undefined;
      if (bar?.close != null) setCrosshairPrice(bar.close);

      const d = new Date((param.time as number) * 1000);
      setCrosshairTime(
        d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      );
    });

    chartRef.current  = chart;
    candleRef.current = candleSeries;
    volRef.current    = volSeries;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current?.clientWidth ?? 600 });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      candleRef.current = null;
      volRef.current    = null;
    };
  }, []); // run once

  // ── Load data whenever pair or interval changes ────────────────────────────
  useEffect(() => {
    if (!candleRef.current || !volRef.current) return;

    const bars = generateOHLCV(pair, activeInterval.bars, activeInterval.minutes);

    candleRef.current.setData(
      bars.map(b => ({
        time:  b.time as Time,
        open:  b.open,
        high:  b.high,
        low:   b.low,
        close: b.close,
      }))
    );

    volRef.current.setData(
      bars.map(b => ({
        time:  b.time as Time,
        value: b.volume,
        color: b.close >= b.open ? C.buyVol : C.sellVol,
      }))
    );

    chartRef.current?.timeScale().fitContent();
  }, [pair.id, activeInterval]);

  const dec         = pair.lastPrice < 1 ? 4 : pair.lastPrice < 100 ? 2 : pair.lastPrice < 10_000 ? 1 : 0;
  const displayPrice = crosshairPrice ?? pair.lastPrice;
  const isUp         = pair.priceChange24h >= 0;

  return (
    <div className="flex flex-col bg-card border border-border/50 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 gap-3 flex-wrap">
        {/* Price overlay */}
        <div className="flex items-baseline gap-2">
          <span className={cn('text-sm font-bold font-mono', isUp ? 'text-buy' : 'text-sell')}>
            {displayPrice.toLocaleString(undefined, {
              minimumFractionDigits: dec,
              maximumFractionDigits: dec,
            })}
          </span>
          {crosshairTime && (
            <span className="text-[10px] text-muted-foreground">{crosshairTime}</span>
          )}
        </div>

        {/* Interval buttons */}
        <div className="flex items-center gap-0.5">
          {INTERVALS.map(iv => (
            <button
              key={iv.label}
              onClick={() => setActiveInterval(iv)}
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                activeInterval.label === iv.label
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart canvas */}
      <div ref={containerRef} className="w-full" style={{ height: 300 }} />

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-buy opacity-70" />Bullish
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-destructive opacity-70" />Bearish
        </span>
        <span className="ml-auto opacity-60">
          Mock OHLCV · {activeInterval.label} · {activeInterval.bars} bars
        </span>
      </div>
    </div>
  );
}

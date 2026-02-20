import { create } from 'zustand';
import type { Market, Bet, MarketFilters, PortfolioStats, Order, TradingPair } from '@/lib/schema';

// Wallet state is now owned by the real @demox-labs/aleo-wallet-adapter-react SDK.
// Use useAleoWallet() from WalletProvider.tsx for wallet access.
// This store only manages UI state, orders, pairs, and modals.

interface AppState {
  // Trading pairs
  markets: TradingPair[];
  setMarkets: (markets: TradingPair[]) => void;
  selectedMarket: TradingPair | null;
  setSelectedMarket: (market: TradingPair | null) => void;

  // Orders (reuses userBets key to avoid breaking existing imports)
  userBets: Order[];
  setUserBets: (bets: Order[]) => void;

  // Pair filters
  filters: MarketFilters;
  setFilters: (filters: Partial<MarketFilters>) => void;

  portfolioStats: PortfolioStats;
  setPortfolioStats: (stats: PortfolioStats) => void;

  // Place Order modal
  isBettingModalOpen: boolean;
  setBettingModalOpen: (open: boolean) => void;

  // Create Pair modal
  isCreateMarketModalOpen: boolean;
  setCreateMarketModalOpen: (open: boolean) => void;

  // Side selection: 'buy' | 'sell'
  selectedOutcomeId: string | null;
  setSelectedOutcomeId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  markets: [],
  setMarkets: (markets) => set({ markets }),
  selectedMarket: null,
  setSelectedMarket: (market) => set({ selectedMarket: market }),

  userBets: [],
  setUserBets: (bets) => set({ userBets: bets }),

  filters: {
    category: 'all',
    status: 'all',
    sortBy: 'volume',
    searchQuery: '',
  },
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),

  portfolioStats: {
    totalBets: 0,
    activeBets: 0,
    totalWagered: 0,
    totalWinnings: 0,
    winRate: 0,
  },
  setPortfolioStats: (stats) => set({ portfolioStats: stats }),

  isBettingModalOpen: false,
  setBettingModalOpen: (open) => set({ isBettingModalOpen: open }),

  isCreateMarketModalOpen: false,
  setCreateMarketModalOpen: (open) => set({ isCreateMarketModalOpen: open }),

  selectedOutcomeId: null,
  setSelectedOutcomeId: (id) => set({ selectedOutcomeId: id }),
}));

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/Header";
import { BettingModal } from "@/components/BettingModal";
import { CreateMarketModal } from "@/components/CreateMarketModal";
import { AleoWalletContextProvider } from "@/components/WalletProvider";
import Index from "./pages/Index";
import MarketDetail from "./pages/MarketDetail";
import Portfolio from "./pages/Portfolio";
import NotFound from "./pages/NotFound";
import { Shield } from "lucide-react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AleoWalletContextProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/market/:id" element={<MarketDetail />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <footer className="border-t border-border/50 py-6 mt-8">
            <div className="container mx-auto px-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold gradient-text">PrivateClaw</span>
                  <span className="text-border">·</span>
                  <span>Privacy-First Limit Order Trading on Aleo</span>
                </div>
                <span>Orders encrypted via ZK proofs · place_order · cancel_order · settle_trade</span>
              </div>
            </div>
          </footer>
        </div>
        <BettingModal />
        <CreateMarketModal />
      </BrowserRouter>
    </TooltipProvider>
    </AleoWalletContextProvider>
  </QueryClientProvider>
);

export default App;

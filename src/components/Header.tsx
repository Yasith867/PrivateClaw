import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useAleoWallet, WalletButton } from '@/components/WalletProvider';
import { Zap, TrendingUp, User, Plus, Menu } from 'lucide-react';
import {
  Sheet, SheetContent, SheetTrigger,
} from '@/components/ui/sheet';

const navItems = [
  { href: '/', label: 'Trade', icon: TrendingUp },
  { href: '/portfolio', label: 'Orders', icon: User },
];

export function Header() {
  const location = useLocation();
  const { setCreateMarketModalOpen } = useAppStore();
  const { connected } = useAleoWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-4">

          {/* Logo — PrivateClaw */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="relative">
              <Zap className="h-7 w-7 text-primary" />
              <div className="absolute inset-0 h-7 w-7 text-primary blur-lg opacity-40" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight gradient-text">PrivateClaw</span>
              <span className="text-[9px] text-muted-foreground">Private Limit Order Trading</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {connected && (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex gap-2 border-border/50 text-xs"
                onClick={() => setCreateMarketModalOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                List Pair
              </Button>
            )}

            {/* Real Aleo wallet button — triggers Leo Wallet popup */}
            <div className="hidden sm:flex">
              <WalletButton />
            </div>

            {/* Mobile */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 bg-card">
                <nav className="flex flex-col gap-2 mt-8">
                  {navItems.map((item) => {
                    const active = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <div className="mt-4">
                    <WalletButton />
                  </div>
                  {connected && (
                    <Button variant="outline" className="gap-2 border-border/50" onClick={() => setCreateMarketModalOpen(true)}>
                      <Plus className="h-4 w-4" />
                      List Pair
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

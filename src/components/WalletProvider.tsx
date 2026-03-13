import { useMemo, useCallback, useEffect } from 'react';
import { AleoWalletProvider, useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, LogOut, ExternalLink, Shield, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AleoWalletProviderProps {
  children: React.ReactNode;
}

export function AleoWalletContextProvider({ children }: AleoWalletProviderProps) {
  const wallets = useMemo(
    () => [new ShieldWalletAdapter()],
    []
  );

  return (
    <AleoWalletProvider
      wallets={wallets}
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.UponRequest}
      autoConnect
    >
      {children}
    </AleoWalletProvider>
  );
}

export function WalletButton() {
  const { address, connected, connecting, connect, disconnect, selectWallet, wallets } = useWallet();
  const { toast } = useToast();

  useEffect(() => {
    if (connected && address) {
      toast({
        title: 'Wallet Connected',
        description: 'Successfully connected to Aleo Testnet via Shield Wallet',
      });
    }
  }, [connected, address]);

  const handleConnect = useCallback(async () => {
    try {
      if (wallets.length > 0) {
        selectWallet(wallets[0].adapter.name);
        await connect(Network.TESTNET);
      } else {
        window.open('https://shieldwallet.app', '_blank');
      }
    } catch (error) {
      console.error('Failed to connect Shield Wallet:', error);
      toast({
        title: 'Connection failed',
        description: 'Make sure Shield Wallet extension is installed.',
        variant: 'destructive',
      });
    }
  }, [connect, selectWallet, wallets, toast]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      toast({
        title: 'Wallet Disconnected',
        description: 'Your Shield Wallet has been disconnected.',
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }, [disconnect, toast]);

  const copyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: 'Address Copied',
        description: 'Wallet address copied to clipboard.',
      });
    }
  }, [address, toast]);

  const truncatedAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }, [address]);

  if (!connected || !address) {
    return (
      <Button
        size="sm"
        onClick={handleConnect}
        disabled={connecting}
        className="gap-2 text-xs"
      >
        <Wallet className="h-3.5 w-3.5" />
        {connecting ? 'Connecting…' : 'Select Wallet'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs border-border/50">
          <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="font-mono">{truncatedAddress}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Connected</span>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Shield className="h-3 w-3" />
              Shield · Testnet
            </Badge>
          </div>
          <p className="font-mono text-xs break-all text-muted-foreground">{address}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://explorer.aleo.org/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Explorer
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Hook for consuming the Shield wallet in any component */
export function useAleoWallet() {
  const wallet = useWallet();
  return {
    connected: wallet.connected,
    address: wallet.address ?? null,
    connecting: wallet.connecting,
    disconnect: wallet.disconnect,
    signMessage: wallet.signMessage,
    requestRecords: wallet.requestRecords,
    executeTransaction: wallet.executeTransaction,
  };
}

import { useMemo, useCallback, useEffect } from 'react';
import { WalletProvider as AleoWalletProvider, useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, LogOut, ExternalLink, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import '@demox-labs/aleo-wallet-adapter-reactui/styles.css';

interface AleoWalletProviderProps {
  children: React.ReactNode;
}

export function AleoWalletContextProvider({ children }: AleoWalletProviderProps) {
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'PrivateClaw',
      }),
    ],
    []
  );

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={WalletAdapterNetwork.TestnetBeta}
      autoConnect
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}

export function WalletButton() {
  const { publicKey, disconnect, connecting, connected } = useWallet();
  const { toast } = useToast();

  useEffect(() => {
    if (connected && publicKey) {
      toast({
        title: 'Wallet Connected',
        description: 'Successfully connected to Aleo Testnet Beta',
      });
    }
  }, [connected, publicKey]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      toast({
        title: 'Wallet Disconnected',
        description: 'Your wallet has been disconnected.',
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }, [disconnect, toast]);

  const copyAddress = useCallback(() => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      toast({
        title: 'Address Copied',
        description: 'Wallet address copied to clipboard.',
      });
    }
  }, [publicKey, toast]);

  const truncatedAddress = useMemo(() => {
    if (!publicKey) return '';
    return `${publicKey.slice(0, 8)}...${publicKey.slice(-6)}`;
  }, [publicKey]);

  if (!connected || !publicKey) {
    return (
      <div className="aleo-wallet-button-wrapper">
        <WalletMultiButton />
      </div>
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
              Testnet Beta
            </Badge>
          </div>
          <p className="font-mono text-xs break-all text-muted-foreground">{publicKey}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://explorer.aleo.org/address/${publicKey}`}
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

/** Hook for consuming the real Aleo wallet in any component */
export function useAleoWallet() {
  const wallet = useWallet();
  return {
    connected: wallet.connected,
    address: wallet.publicKey ?? null,
    connecting: wallet.connecting,
    disconnect: wallet.disconnect,
    signMessage: wallet.signMessage,
    decrypt: wallet.decrypt,
    requestRecords: wallet.requestRecords,
    requestTransaction: wallet.requestTransaction,
  };
}

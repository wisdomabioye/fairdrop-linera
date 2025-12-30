'use client';

import { useState, useCallback, useMemo } from 'react';
import { Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletConnectionPrompt } from '@/components/wallet';
import { TokenSelector, ChainSelectorAdvanced } from '@/components/shared';
import { useWalletConnection, useChainApplication } from 'linera-react-client';
import { getTokenList } from '@/config/app.token-store';
import { useSyncStatus } from '@/providers';
import { TransferTab } from './transfer-tab';
import { AllowancesTab } from './allowances-tab';
import { AdvancedTab } from './advanced-tab';
import { BalanceDisplay } from './balance-display';

export default function MyTokens() {
  const { isConnected, address } = useWalletConnection();
  const { isClientSyncing } = useSyncStatus();
  const tokens = getTokenList();

  // Selected token and chain state
  const [selectedTokenId, setSelectedTokenId] = useState<string>(tokens[0]?.appId || '');
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [canWriteToChain, setCanWriteToChain] = useState(false);
  const [activeTab, setActiveTab] = useState('transfer');

  // Get the chain app for the selected chain and token
  const fungibleApp = useChainApplication(
    selectedChainId || '',
    selectedTokenId
  );

  // Get selected token info (memoized)
  const selectedToken = useMemo(
    () => tokens.find(t => t.appId === selectedTokenId),
    [tokens, selectedTokenId]
  );

  // Handle chain change (memoized callback)
  const handleChainChange = useCallback((chainId: string, canWrite: boolean) => {
    setSelectedChainId(chainId);
    setCanWriteToChain(canWrite);
  }, []);

  // Handle token change (memoized callback)
  const handleTokenChange = useCallback((tokenId: string) => {
    setSelectedTokenId(tokenId);
    // Reset chain selection when token changes
    setSelectedChainId(null);
    setCanWriteToChain(false);
  }, []);

  // Wallet connection guard
  if (!isConnected) {
    return (
      <div className="mx-auto max-w-5xl">
        <WalletConnectionPrompt
          title="My Tokens"
          description="Connect your wallet to manage your fungible tokens"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Coins className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">My Tokens</h1>
          <p className="text-muted-foreground">
            Manage your fungible tokens across different chains
          </p>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle>Token Management</CardTitle>
          <CardDescription>
            Select a token and chain to transfer, manage allowances, or perform advanced operations
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Token Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Token</label>
            <TokenSelector
              tokens={tokens}
              value={selectedTokenId}
              onValueChange={handleTokenChange}
              disabled={isClientSyncing}
            />
          </div>

          {/* Chain Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Chain</label>
            <ChainSelectorAdvanced
              value={selectedChainId}
              onChainChange={handleChainChange}
              fungibleApp={fungibleApp.app}
              allowCustom={true}
              disabled={isClientSyncing}
              className="w-full"
            />
          </div>

          {/* Balance Display */}
          {selectedChainId && address && selectedToken && (
            <BalanceDisplay
              tokenId={selectedTokenId}
              chainId={selectedChainId}
              address={address}
              chainApp={fungibleApp.app}
              tokenSymbol={selectedToken.symbol}
              tokenName={selectedToken.name}
            />
          )}

          {/* Operations Tabs */}
          {selectedChainId && fungibleApp.app && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transfer">Transfer</TabsTrigger>
                <TabsTrigger value="allowances">Allowances</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="transfer" className="mt-6">
                <TransferTab
                  tokenId={selectedTokenId}
                  chainId={selectedChainId}
                  chainApp={fungibleApp.app}
                  canWrite={canWriteToChain}
                  tokenSymbol={selectedToken?.symbol || ''}
                  address={address || ''}
                />
              </TabsContent>

              <TabsContent value="allowances" className="mt-6">
                <AllowancesTab
                  tokenId={selectedTokenId}
                  chainId={selectedChainId}
                  chainApp={fungibleApp.app}
                  canWrite={canWriteToChain}
                  tokenSymbol={selectedToken?.symbol || ''}
                  address={address || ''}
                />
              </TabsContent>

              <TabsContent value="advanced" className="mt-6">
                <AdvancedTab
                  tokenId={selectedTokenId}
                  chainId={selectedChainId}
                  chainApp={fungibleApp.app}
                  canWrite={canWriteToChain}
                  tokenSymbol={selectedToken?.symbol || ''}
                  address={address || ''}
                />
              </TabsContent>
            </Tabs>
          )}

          {/* Empty State */}
          {!selectedChainId && (
            <div className="py-12 text-center text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a chain to start managing your tokens</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

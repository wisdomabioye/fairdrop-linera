'use client';

import { useState, useCallback, useMemo } from 'react';
import { Coins, ArrowUpRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { WalletConnectionPrompt } from '@/components/wallet';
import { TokenSelector, ChainSelectorAdvanced } from '@/components/shared';
import { useWalletConnection, useLineraClient, useLineraApplication } from 'linera-react-client';
import { getTokenList } from '@/config/app.token-store';
import { useSyncStatus } from '@/providers';
import { useFungibleQuery } from '@/hooks';
import { TransferTab } from './transfer-tab';
import { AllowancesTab } from './allowances-tab';
import { AdvancedTab } from './advanced-tab';
import { BalanceDisplay } from './balance-display';

export default function MyTokens() {
  const { isConnected, address } = useWalletConnection();
  const { walletChainId } = useLineraClient();
  const { isClientSyncing } = useSyncStatus();
  const tokens = getTokenList();
  // Selected token and chain state
  const [selectedTokenId, setSelectedTokenId] = useState<string>(tokens[0]?.appId || '');
  const [selectedChainId, setSelectedChainId] = useState<string | null>(walletChainId ?? null);
  const [canWriteToChain, setCanWriteToChain] = useState(false);
  const [activeTab, setActiveTab] = useState('transfer');

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const fungibleApp = useLineraApplication(selectedTokenId)

  // Check if the chain app is ready and matches the selected chain
  const isChainAppReady = fungibleApp.isReady;

  // Unified token query hook for balance and token info
  const { 
    balance, 
    balanceLoading, 
    fetchBalance, 
    tickerSymbol 
  } = useFungibleQuery({
    chainApp: fungibleApp.app?.wallet,
    tokenId: selectedTokenId,
    chainId: selectedChainId || '',
    address: address || '',
    autoFetch: true,
    isWalletSyncing: isClientSyncing,
  });

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
  }, []);

  // Wallet connection guard
  if (!isConnected) {
    return (
      <div className="mx-auto my-6 py-6 max-w-5xl">
        <WalletConnectionPrompt
          title="My Tokens"
          description="Connect your wallet to manage your fungible tokens"
        />
      </div>
    );
  }

  // Actions Tabs Component (reused in desktop and mobile)
  const ActionsTabs = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="transfer">Transfer</TabsTrigger>
        <TabsTrigger value="allowances">Allowances</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>

      <TabsContent value="transfer" className="mt-6">
        <TransferTab
          tokenId={selectedTokenId}
          chainId={selectedChainId || ''}
          chainApp={fungibleApp.app?.wallet || null}
          canWrite={canWriteToChain}
          tokenSymbol={selectedToken?.symbol || ''}
          address={address || ''}
          fetchBalance={fetchBalance}
        />
      </TabsContent>

      <TabsContent value="allowances" className="mt-6">
        <AllowancesTab
          tokenId={selectedTokenId}
          chainId={selectedChainId || ''}
          chainApp={fungibleApp.app?.wallet || null}
          canWrite={canWriteToChain}
          tokenSymbol={selectedToken?.symbol || ''}
          address={address || ''}
        />
      </TabsContent>

      <TabsContent value="advanced" className="mt-6">
        <AdvancedTab
          tokenId={selectedTokenId}
          chainId={selectedChainId || ''}
          chainApp={fungibleApp.app?.wallet || null}
          canWrite={canWriteToChain}
          tokenSymbol={selectedToken?.symbol || ''}
          address={address || ''}
          fetchBalance={fetchBalance}
        />
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Coins className="h-5 w-5 md:h-6 md:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Tokens</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your fungible tokens across different chains
          </p>
        </div>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Left Panel - Info & Balance (32% on desktop) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Token Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Token</CardTitle>
            </CardHeader>
            <CardContent>
              <TokenSelector
                tokens={tokens}
                value={selectedTokenId}
                onValueChange={handleTokenChange}
                disabled={isClientSyncing}
              />
            </CardContent>
          </Card>

          {/* Chain Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Chain</CardTitle>
            </CardHeader>
            <CardContent>
              <ChainSelectorAdvanced
                value={selectedChainId}
                onChainChange={handleChainChange}
                walletChainId={walletChainId || null}
                // We don't have to pass public-chain, it's read-only
                publicChainId={null}
                allowCustom={true}
                disabled={isClientSyncing}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Balance Display */}
          {selectedChainId && address && selectedToken && (
            isChainAppReady ? (
              <BalanceDisplay
                key={`balance-${selectedTokenId}-${selectedChainId}`}
                balance={balance}
                tokenSymbol={tickerSymbol || selectedToken.symbol}
                isLoading={balanceLoading}
              />
            ) : (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm text-muted-foreground">Loading chain...</span>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* Token Details */}
          {selectedChainId && selectedToken && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{selectedToken.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Symbol</span>
                  <span className="font-medium">{selectedToken.symbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Write Access</span>
                  <span className={`font-medium flex items-center gap-1 ${canWriteToChain ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {canWriteToChain ? (
                      <>
                        <span>Yes</span>
                        <span>✓</span>
                      </>
                    ) : (
                      'Read-only'
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State (left panel) */}
          {!selectedChainId && (
            <Card className="hidden lg:block">
              <CardContent className="py-12 text-center">
                <Coins className="h-12 w-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select a chain to view balance and details
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Actions (68% on desktop, hidden on mobile) */}
        <div className="hidden lg:block lg:col-span-8">
          {selectedChainId && isChainAppReady ? (
            <Card>
              <CardContent className="pt-6">
                {/* Read-only warning */}
                {!canWriteToChain && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This chain is read-only. Write operations are only available on chains you can write to.
                    </AlertDescription>
                  </Alert>
                )}

                <ActionsTabs />
              </CardContent>
            </Card>
          ) : selectedChainId ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading chain...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Coins className="h-12 w-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select a chain to start managing your tokens
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile Actions Button (floating) */}
      {selectedChainId && isChainAppReady && (
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <Button
            size="lg"
            onClick={() => setIsDrawerOpen(true)}
            className="rounded-full shadow-lg h-14 w-14 p-0"
          >
            <ArrowUpRight className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Mobile Actions Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} direction="bottom">
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Token Actions</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-8">
            {/* Read-only warning */}
            {!canWriteToChain && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This chain is read-only. Write operations are only available on chains you can write to.
                </AlertDescription>
              </Alert>
            )}

            <ActionsTabs />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

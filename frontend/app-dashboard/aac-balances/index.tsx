'use client';

import { useState, useMemo } from 'react';
import { Wallet, RefreshCw, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WalletConnectionPrompt } from '@/components/wallet';
import { useWalletConnection } from 'linera-react-client';
import { useAacApp, useCachedUserBalances } from '@/hooks';
import { useSyncStatus } from '@/providers';
import { getTokenList, getTokenByAppId } from '@/config/app.token-store';
import { DepositDialog } from './deposit-dialog';
import { WithdrawDialog } from './withdraw-dialog';

export default function AACBalances() {
  const { isConnected, address } = useWalletConnection();
  const { isPublicClientSyncing } = useSyncStatus();
  const tokens = getTokenList();
  const aacApp = useAacApp();
  
  // Fetch balances for all tokens
  const {
    balances,
    loading,
    status,
    error,
    refetch: refetchAacBalance,
  } = useCachedUserBalances({
    address: address || '',
    tokenApps: tokens.map(t => t.appId),
    aacApp: aacApp.app,
    skip: !address || !aacApp.app
  });

  /** Not first load, i.e already loaded */
  const isIdle = status === 'idle';
  // Dialog state
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  // Calculate total number of tokens with balance
  const tokensWithBalance = useMemo(() => {
    if (!balances) return 0;
    return Array.from(balances.values()).filter(balance => balance > 0).length;
  }, [balances]);

  // Handle deposit click
  const handleDeposit = (appTokenId: string) => {
    setSelectedToken(appTokenId);
    setDepositDialogOpen(true);
  };

  // Handle withdraw click
  const handleWithdraw = (appTokenId: string) => {
    setSelectedToken(appTokenId);
    setWithdrawDialogOpen(true);
  };

  // Wallet connection guard
  if (!isConnected) {
    return (
      <div className="mx-auto my-6 py-6 max-w-xl">
        <WalletConnectionPrompt
          title="AAC Balances"
          description="Connect your wallet to view your token balances on the Auction Authority Chain"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">AAC Balances</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Your token deposits on the Auction Authority Chain
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchAacBalance()}
          disabled={loading || isPublicClientSyncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Failed to load balances: {error.message}
          </AlertDescription>
        </Alert>
      )}

    
      {/* Balances Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Token Balances</CardTitle>
            {tokensWithBalance > 0 && (
              <Badge variant="secondary">
                {tokensWithBalance} {tokensWithBalance === 1 ? 'token' : 'tokens'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Token</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Balance</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && isIdle ? (
                  // Loading skeleton
                  tokens.map((token) => (
                    <tr key={token.appId} className="border-b last:border-0">
                      <td className="py-4 px-4">
                        <Skeleton className="h-6 w-24" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Skeleton className="h-6 w-20 ml-auto" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Skeleton className="h-9 w-40 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : (
                  // Actual data
                  tokens.map((token) => {
                    const balance = balances?.get(token.appId) ?? 0;
                    return (
                      <tr key={token.appId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-semibold">{token.symbol}</div>
                            <div className="text-sm text-muted-foreground">{token.name}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="font-mono text-lg font-semibold">
                            {balance.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">{token.symbol}</div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeposit(token.appId)}
                              disabled={isPublicClientSyncing}
                            >
                              <ArrowDownToLine className="h-4 w-4 mr-1" />
                              Deposit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleWithdraw(token.appId)}
                              disabled={isPublicClientSyncing || balance === 0}
                            >
                              <ArrowUpFromLine className="h-4 w-4 mr-1" />
                              Withdraw
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {loading && isIdle ? (
              // Loading skeleton
              tokens.map((token) => (
                <Card key={token.appId}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <Skeleton className="h-8 w-32 mb-4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 flex-1" />
                      <Skeleton className="h-9 flex-1" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Actual data
              tokens.map((token) => {
                const balance = balances?.get(token.appId) ?? 0;
                return (
                  <Card key={token.appId}>
                    <CardContent className="pt-6">
                      <div className="mb-4">
                        <div className="font-semibold text-lg">{token.symbol}</div>
                        <div className="text-sm text-muted-foreground">{token.name}</div>
                      </div>
                      <div className="mb-4">
                        <div className="font-mono text-2xl font-bold">
                          {balance.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">{token.symbol}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDeposit(token.appId)}
                          disabled={isPublicClientSyncing}
                        >
                          <ArrowDownToLine className="h-4 w-4 mr-1" />
                          Deposit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleWithdraw(token.appId)}
                          disabled={isPublicClientSyncing || balance === 0}
                        >
                          <ArrowUpFromLine className="h-4 w-4 mr-1" />
                          Withdraw
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Empty State */}
          {!loading && balances && tokensWithBalance === 0 && (
            <div className="py-12 text-center">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                No token balances yet. Deposit tokens to start bidding on auctions.
              </p>
            </div>
          )}

        </CardContent>
      </Card>
      
      {/* Dialogs */}
      {selectedToken !== null && (() => {
        return (
          <>
            <DepositDialog
              key={`deposit-${selectedToken}-${depositDialogOpen}`}
              open={depositDialogOpen}
              onOpenChange={setDepositDialogOpen}
              appTokenId={selectedToken}
              tokenInfo={getTokenByAppId(selectedToken)}
              currentAACBalance={balances?.get(selectedToken) ?? 0}
            />
            <WithdrawDialog
              key={`withdrawal-${selectedToken}-${withdrawDialogOpen}`}
              open={withdrawDialogOpen}
              onOpenChange={setWithdrawDialogOpen}
              appTokenId={selectedToken}
              tokenInfo={getTokenByAppId(selectedToken)}
              currentAACBalance={balances?.get(selectedToken) ?? 0}
            />
          </>
        );
      })()}
    </div>
  );
}

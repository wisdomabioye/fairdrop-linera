'use client';

import { useState, useCallback } from 'react';
import { Droplet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WalletConnectionPrompt } from '@/components/wallet';
import { useLineraApplication, useWalletConnection } from 'linera-react-client';
import { useFungibleMutations, usePolling } from '@/hooks';
import { useSyncStatus } from '@/providers';
import { getTokenList, type TokenInfo } from '@/config/app.token-store';
import { toast } from 'sonner';
import { UnifiedStatusBar } from './unified-status-bar';
import { AmountPresets } from './amount-presets';
import { BalanceCard } from './balance-card';
import { MintHistory, type MintRecord } from './mint-history';
import { SuccessOverlay } from './success-overlay';
import { TokenSelector } from '@/components/shared';
import { useTokenStore } from '@/store/token-store';

export interface FaucetFormProps {
  defaultToken?: string;
  onSuccess?: (token: TokenInfo, amount: string) => void;
}

// Polling interval: 30 seconds
const POLLING_INTERVAL = 30000;

export function FaucetForm({ defaultToken, onSuccess }: FaucetFormProps) {
  const { isConnected, address } = useWalletConnection();
  const { isWalletClientSyncing } = useSyncStatus();
  const tokens = getTokenList();

  const [selectedTokenId, setSelectedTokenId] = useState<string>(
    defaultToken || tokens[0]?.appId || ''
  );
  const [amount, setAmount] = useState('100');
  const [optimisticBalance, setOptimisticBalance] = useState<string | null>(null);
  const [mintHistory, setMintHistory] = useState<MintRecord[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastMintAmount, setLastMintAmount] = useState<{amount: string; symbol: string} | null>(null);

  const selectedToken = tokens.find(t => t.appId === selectedTokenId);
  const fungibleApp = useLineraApplication(selectedTokenId);

  // Token store for centralized state management
  const {
    getBalance,
    getBalanceStatus,
    fetchBalance,
    fetchTokenInfo,
    invalidateBalance,
    isBalanceStale,
  } = useTokenStore();

  // Polling callback for balance and token info
  const pollTokenData = useCallback(async () => {
    if (!address || !selectedTokenId || !fungibleApp.app || isWalletClientSyncing) {
      return;
    }

    try {
      // Only refetch balance if stale
      if (isBalanceStale(selectedTokenId, address)) {
        await fetchBalance(selectedTokenId, address, fungibleApp.app);
      }

      // Fetch token info on first load (it has 60s TTL so won't refetch often)
      await fetchTokenInfo(selectedTokenId, fungibleApp.app);
    } catch (error) {
      console.error('[FaucetForm] Failed to fetch token data:', error);
    }
  }, [address, selectedTokenId, fungibleApp.app, isWalletClientSyncing, fetchBalance, fetchTokenInfo, isBalanceStale]);

  // Set up polling with usePolling hook (immediate: true for initial fetch)
  usePolling(pollTokenData, POLLING_INTERVAL, { immediate: true });

  // Mutation hook for minting
  const {
    mint,
    isMinting,
    mintError,
  } = useFungibleMutations({
    fungibleApp: fungibleApp.app,
    onMintSuccess: () => {
      // Add to mint history
      const newRecord: MintRecord = {
        id: `${Date.now()}-${amount}`,
        amount,
        tokenSymbol: selectedToken?.symbol || '',
        timestamp: new Date(),
      };
      setMintHistory(prev => [newRecord, ...prev.slice(0, 9)]); // Keep last 10

      // Show success overlay
      setLastMintAmount({ amount, symbol: selectedToken?.symbol || '' });
      setShowSuccess(true);

      // Clear optimistic state
      setOptimisticBalance(null);

      // Invalidate balance to force immediate refresh
      invalidateBalance(selectedTokenId, address);

      // Trigger immediate refresh (bypass polling)
      setTimeout(() => {
        if (address && fungibleApp.app) {
          fetchBalance(selectedTokenId, address, fungibleApp.app);
        }
      }, 500);

      toast.success('Tokens minted successfully!', {
        description: `${amount} ${selectedToken?.symbol} added to your balance`
      });

      if (selectedToken) {
        onSuccess?.(selectedToken, amount);
      }
    },
    onError: (error) => {
      // Clear optimistic state on error
      setOptimisticBalance(null);

      toast.error('Mint failed', {
        description: error.message
      });
    }
  });

  // Get user balance from token store
  const actualBalance = address && selectedTokenId
    ? getBalance(selectedTokenId, address)
    : null;

  // Get loading status from token store
  const balanceStatus = address && selectedTokenId
    ? getBalanceStatus(selectedTokenId, address)
    : 'idle';

  const accountsLoading = balanceStatus === 'loading';
  const accountsError = balanceStatus === 'error' ? new Error('Failed to fetch balance') : null;

  // Use optimistic balance if available, otherwise actual balance
  const displayBalance = optimisticBalance || actualBalance;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only positive numbers
    if (value === '' || /^\d+$/.test(value)) {
      setAmount(value);
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || !selectedToken || !amount || Number(amount) <= 0) {
      toast.error('Invalid input', {
        description: 'Please enter a valid amount'
      });
      return;
    }

    if (isWalletClientSyncing) {
      toast.warning('Wallet syncing', {
        description: 'Please wait for wallet to finish syncing'
      });
      return;
    }

    // Set optimistic balance
    const currentBalance = actualBalance ? Number(actualBalance) : 0;
    const newBalance = currentBalance + Number(amount);
    setOptimisticBalance(newBalance.toString());

    await mint(address, amount);
  };

  const canSubmit = isConnected && !!fungibleApp.app && !!amount && Number(amount) > 0 && !isMinting && !isWalletClientSyncing;

  // Wallet connection guard
  if (!isConnected) {
    return (
      <div className='mx-auto max-w-3xl'>
        <WalletConnectionPrompt
          title="Token Faucet"
          description="Connect your wallet to receive test tokens instantly"
        />
      </div>
    );
  }

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mx-auto mb-4">
            <Droplet className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-2xl text-center">Token Faucet</CardTitle>
          <CardDescription className="text-center">
            Claim free test tokens instantly • No limits
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Unified Status Bar */}
            <UnifiedStatusBar
              isWalletSyncing={isWalletClientSyncing}
              isLoading={accountsLoading}
              isMinting={isMinting}
              error={mintError || accountsError}
            />

            {/* Balance Card with Animation */}
            <BalanceCard
              balance={displayBalance}
              tokenSymbol={selectedToken?.symbol}
              isLoading={accountsLoading}
              isOptimistic={!!optimisticBalance}
            />

            {/* Token Selection */}
            <TokenSelector
              tokens={tokens}
              value={selectedTokenId}
              onValueChange={setSelectedTokenId}
              disabled={isMinting || isWalletClientSyncing}
            />

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount to Mint</Label>
              <Input
                id="amount"
                type="text"
                placeholder="Enter amount"
                value={amount}
                onChange={handleAmountChange}
                disabled={isMinting || isWalletClientSyncing}
                className="h-14 text-lg font-semibold"
              />
            </div>

            {/* Amount Presets */}
            <AmountPresets
              selectedAmount={amount}
              onSelectAmount={handleQuickAmount}
              disabled={isMinting || isWalletClientSyncing}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!canSubmit}
              size="lg"
              className="w-full gap-2 text-lg h-14"
            >
              <Droplet className="h-5 w-5" />
              Mint {amount || '0'} {selectedToken?.symbol}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              These are test tokens with no real value • Mint as many as you need
            </p>
          </form>

          {/* Mint History */}
          {mintHistory.length > 0 && (
            <MintHistory records={mintHistory} className="mt-6 pt-6 border-t" />
          )}
        </CardContent>
      </Card>

      {/* Success Overlay */}
      {lastMintAmount && (
        <SuccessOverlay
          show={showSuccess}
          amount={lastMintAmount.amount}
          tokenSymbol={lastMintAmount.symbol}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </>
  );
}

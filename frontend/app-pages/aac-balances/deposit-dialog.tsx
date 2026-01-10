'use client';

import { useState, useMemo, useEffect } from 'react';
import { ArrowDownToLine, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuctionMutations } from '@/hooks/use-auction-mutations';
import { useFungibleQuery } from '@/hooks';
import { useWalletConnection, useLineraClient, useLineraApplication } from 'linera-react-client';
import { useSyncStatus } from '@/providers';
import type { ApplicationClient } from 'linera-react-client';
import type { TokenInfo } from '@/config/app.token-store';

export interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appTokenId: string;
  tokenInfo: TokenInfo;
  aacApp: ApplicationClient | null;
  currentAACBalance: number;
}

export function DepositDialog({
  open,
  onOpenChange,
  appTokenId,
  tokenInfo,
  aacApp,
  currentAACBalance
}: DepositDialogProps) {
  const { address } = useWalletConnection();
  const { walletChainId } = useLineraClient();
  const { isWalletClientSyncing } = useSyncStatus();
  const [amount, setAmount] = useState('');

  // Get the fungible token app to query wallet balance
  const fungibleApp = useLineraApplication(appTokenId);

  // Fetch wallet balance for this token
  const { getAccountBalance, balanceLoading, fetchBalance } = useFungibleQuery({
    chainApp: fungibleApp.app?.wallet,
    tokenId: appTokenId,
    chainId: walletChainId || '',
    address: address || '',
    autoFetch: true,
    isWalletSyncing: isWalletClientSyncing,
  });

  // Refetch balance when dialog opens
  useEffect(() => {
    if (open && address && fungibleApp.app) {
      fetchBalance(address);
    }
  }, [open, address, fungibleApp.app, fetchBalance]);

  // Get wallet balance as number
  const walletBalance = useMemo(() => {
    if (!address) return 0;
    const balance = getAccountBalance(address);
    return balance ? parseFloat(balance) || 0 : 0;
  }, [address, getAccountBalance]);

  const { deposit, isDepositing, trigger, error } = useAuctionMutations({
    aacApp,
    onSuccess: (event) => {
      if (event.type === 'deposit') {
        setAmount('');
        onOpenChange(false);
      }
    },
    onError: (event) => {
      if (event.type === 'deposit') {
        console.error('[DepositDialog] Deposit failed:', event.error);
      }
    }
  });

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    await deposit(appTokenId, amount);
    await trigger();
  };

  const handleClose = () => {
    if (!isDepositing) {
      setAmount('');
      onOpenChange(false);
    }
  };

  const handleMaxClick = () => {
    setAmount(walletBalance.toString());
  };

  const amountValue = parseFloat(amount) || 0;
  const isAmountValid = amountValue > 0 && amountValue <= walletBalance;
  const newAACBalance = currentAACBalance + amountValue;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            Deposit {tokenInfo.symbol}
          </DialogTitle>
          <DialogDescription>
            Deposit {tokenInfo.name} tokens to your AAC balance to participate in auctions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="deposit-amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="deposit-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isDepositing || balanceLoading}
                min="0"
                max={walletBalance}
                step="any"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleMaxClick}
                disabled={isDepositing || balanceLoading || walletBalance === 0}
              >
                Max
              </Button>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {balanceLoading ? (
                  'Loading wallet balance...'
                ) : (
                  <>Available: {walletBalance.toLocaleString()} {tokenInfo.symbol}</>
                )}
              </span>
              {amountValue > walletBalance && (
                <span className="text-destructive">Insufficient balance</span>
              )}
            </div>
          </div>

          {/* Deposit Preview */}
          {amountValue > 0 && (
            <div className="rounded-lg border bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Preview</p>

              {/* Before/After Comparison */}
              <div className="grid grid-cols-2 gap-3">
                {/* Current Balance */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Current AAC Balance</p>
                  <p className="text-lg font-semibold">
                    {currentAACBalance.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      {tokenInfo.symbol}
                    </span>
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">→</span>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      +{amountValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* New Balance (emphasized) */}
              <div className="mt-3 pt-3 border-t border-green-200/50 dark:border-green-800/50">
                <p className="text-xs text-muted-foreground mb-1">New AAC Balance</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {newAACBalance.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {tokenInfo.symbol}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Empty State (when no amount entered) */}
          {amountValue === 0 && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Enter an amount to see deposit preview
              </p>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDepositing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeposit}
            disabled={isDepositing || balanceLoading || !isAmountValid}
          >
            {isDepositing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDepositing ? 'Depositing...' : 'Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useMemo } from 'react';
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
import { useAuctionMutations, useFungibleQuery } from '@/hooks';
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
  onDepositSuccess?: () => Promise<void>;
  currentAACBalance: number;
}

export function DepositDialog({
  open,
  onOpenChange,
  appTokenId,
  tokenInfo,
  aacApp,
  onDepositSuccess,
  currentAACBalance
}: DepositDialogProps) {
  const { address } = useWalletConnection();
  const { walletChainId } = useLineraClient();
  const { isWalletClientSyncing } = useSyncStatus();
  const [amount, setAmount] = useState('');

  // Get the fungible token app to query wallet balance
  const fungibleApp = useLineraApplication(appTokenId);

  // Fetch wallet balance on wallet-chain for this token
  const { getAccountBalance, balanceLoading } = useFungibleQuery({
    chainApp: fungibleApp.app?.wallet,
    tokenId: appTokenId,
    chainId: walletChainId || '',
    address: address || '',
    autoFetch: true,
    isWalletSyncing: isWalletClientSyncing,
  });

  // Get token balance wallet on Wallet-Chain 
  const walletBalance = address ? Number(getAccountBalance(address)) : 0;
  
  const { deposit, isDepositing, trigger, error } = useAuctionMutations({
    aacApp,
    onSuccess: async (event) => {
      if (event.type === 'deposit') {
        setAmount('');
        // Force refetch AAC balance
        if (onDepositSuccess) {
          await onDepositSuccess();
        }
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

          {/* Deposit Summary */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Token</span>
              <span className="font-medium">{tokenInfo.symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current AAC Balance</span>
              <span className="font-medium">
                {currentAACBalance.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deposit Amount</span>
              <span className="font-medium">
                {amountValue > 0 ? amountValue.toLocaleString() : '0'}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-1 border-t">
              <span>New AAC Balance</span>
              <span className="text-green-600">
                {newAACBalance.toLocaleString()}
              </span>
            </div>
          </div>

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

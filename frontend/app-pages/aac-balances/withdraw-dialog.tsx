'use client';

import { useState } from 'react';
import { ArrowUpFromLine, Loader2 } from 'lucide-react';
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
import { ChainSelectorAdvanced } from '@/components/shared';
import { useAuctionMutations, useAacApp } from '@/hooks';
import { useLineraClient } from 'linera-react-client';
import type { TokenInfo } from '@/config/app.token-store';

export interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appTokenId: string;
  tokenInfo: TokenInfo;
  currentAACBalance: number;
  onWithdrawSuccess?: () => Promise<void>;
}

export function WithdrawDialog({
  open,
  onOpenChange,
  appTokenId,
  tokenInfo,
  currentAACBalance,
  onWithdrawSuccess
}: WithdrawDialogProps) {
  const [amount, setAmount] = useState('');
  const [targetChain, setTargetChain] = useState<string | null>(null);
  const { walletChainId } = useLineraClient();
  const aacApp = useAacApp()

  const { withdraw, trigger, isWithdrawing, error } = useAuctionMutations({
    aacApp: aacApp.app,
    onSuccess: async (event) => {
      if (event.type === 'withdraw') {
        setAmount('');
        setTargetChain(null);
        // Call parent callback BEFORE closing
        if (onWithdrawSuccess) {
          await onWithdrawSuccess();
        }
        onOpenChange(false);
      }
    },
    onError: (event) => {
      if (event.type === 'withdraw') {
        console.error('[WithdrawDialog] Withdraw failed:', event.error);
      }
    }
  });

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0 || !targetChain) {
      return;
    }

    const result = await withdraw(appTokenId, amount, targetChain);
    if (result) {
      await trigger();
    }
  };

  const handleClose = () => {
    if (!isWithdrawing) {
      setAmount('');
      setTargetChain(null);
      onOpenChange(false);
    }
  };

  const handleMaxClick = () => {
    setAmount(currentAACBalance.toString());
  };

  const handleChainChange = (chainId: string, _canWrite?: boolean) => {
    setTargetChain(chainId);
  };

  const amountValue = parseFloat(amount) || 0;
  const isAmountValid = amountValue > 0 && amountValue <= currentAACBalance;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5" />
            Withdraw {tokenInfo.symbol}
          </DialogTitle>
          <DialogDescription>
            Withdraw {tokenInfo.name} tokens from your AAC balance to a target chain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isWithdrawing}
                min="0"
                max={currentAACBalance}
                step="any"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleMaxClick}
                disabled={isWithdrawing || currentAACBalance === 0}
              >
                Max
              </Button>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Available: {currentAACBalance?.toLocaleString()} {tokenInfo.symbol}
              </span>
              {amountValue > currentAACBalance && (
                <span className="text-destructive">Insufficient balance</span>
              )}
            </div>
          </div>

          {/* Target Chain Selector */}
          <div className="space-y-2">
            <Label>Target Chain</Label>
            <ChainSelectorAdvanced
              value={targetChain}
              onChainChange={handleChainChange}
              walletChainId={walletChainId || null}
              publicChainId={null}
              allowCustom={true}
              disabled={isWithdrawing}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Select the chain to receive the withdrawn tokens
            </p>
          </div>

          {/* Withdrawal Summary */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Token</span>
              <span className="font-medium">{tokenInfo.symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current AAC Balance</span>
              <span className="font-medium">
                {currentAACBalance?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Withdraw Amount</span>
              <span className="font-medium">
                {amountValue > 0 ? amountValue.toLocaleString() : '0'}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-1 border-t">
              <span>Remaining Balance</span>
              <span className="text-orange-600">
                {(currentAACBalance - amountValue).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {error && error.message && (
            <Alert variant="destructive">
              <AlertDescription>
                {
                  error.message.indexOf(':') > -1 ?
                  error.message?.substring(0, error.message.indexOf(':'))
                  :
                  error.message
                }
                  
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isWithdrawing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={isWithdrawing || !isAmountValid || !targetChain}
          >
            {isWithdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

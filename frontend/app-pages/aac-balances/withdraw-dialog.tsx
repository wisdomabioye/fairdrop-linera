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
import { useAuctionMutations } from '@/hooks/use-auction-mutations';
import { useLineraClient } from 'linera-react-client';
import type { ApplicationClient } from 'linera-react-client';
import type { TokenInfo } from '@/config/app.token-store';

export interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appTokenId: string;
  tokenInfo: TokenInfo;
  currentBalance: number;
  aacApp: ApplicationClient | null;
}

export function WithdrawDialog({
  open,
  onOpenChange,
  appTokenId,
  tokenInfo,
  currentBalance,
  aacApp
}: WithdrawDialogProps) {
  const [amount, setAmount] = useState('');
  const [targetChain, setTargetChain] = useState<string | null>(null);
  const { walletChainId } = useLineraClient();

  const { withdraw, isWithdrawing, trigger, error } = useAuctionMutations({
    aacApp,
    onSuccess: (event) => {
      if (event.type === 'withdraw') {
        setAmount('');
        setTargetChain(null);
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

    await withdraw(appTokenId, amount, targetChain);
    await trigger();
  };

  const handleClose = () => {
    if (!isWithdrawing) {
      setAmount('');
      setTargetChain(null);
      onOpenChange(false);
    }
  };

  const handleMaxClick = () => {
    setAmount(currentBalance.toString());
  };

  const handleChainChange = (chainId: string, _canWrite?: boolean) => {
    setTargetChain(chainId);
  };

  const amountValue = parseFloat(amount) || 0;
  const isAmountValid = amountValue > 0 && amountValue <= currentBalance;

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
                max={currentBalance}
                step="any"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleMaxClick}
                disabled={isWithdrawing || currentBalance === 0}
              >
                Max
              </Button>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Available: {currentBalance.toLocaleString()} {tokenInfo.symbol}
              </span>
              {amountValue > currentBalance && (
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

          {/* Withdrawal Preview */}
          {amountValue > 0 && (
            <div className="rounded-lg border bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/10 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Preview</p>

              {/* Before/After Comparison */}
              <div className="grid grid-cols-2 gap-3">
                {/* Current Balance */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Current AAC Balance</p>
                  <p className="text-lg font-semibold">
                    {currentBalance.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      {tokenInfo.symbol}
                    </span>
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">→</span>
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      -{amountValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remaining Balance (emphasized) */}
              <div className="mt-3 pt-3 border-t border-orange-200/50 dark:border-orange-800/50">
                <p className="text-xs text-muted-foreground mb-1">Remaining AAC Balance</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {(currentBalance - amountValue).toLocaleString()}
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
                Enter an amount to see withdrawal preview
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

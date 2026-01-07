'use client';

import { useState } from 'react';
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
import type { ApplicationClient } from 'linera-react-client';
import type { TokenInfo } from '@/config/app.token-store';

export interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenIndex: number;
  tokenInfo: TokenInfo;
  aacApp: ApplicationClient | null;
}

export function DepositDialog({
  open,
  onOpenChange,
  tokenIndex,
  tokenInfo,
  aacApp
}: DepositDialogProps) {
  const [amount, setAmount] = useState('');

  const { deposit, isDepositing, error } = useAuctionMutations({
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

    await deposit(tokenIndex, amount);
  };

  const handleClose = () => {
    if (!isDepositing) {
      setAmount('');
      onOpenChange(false);
    }
  };

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
            <Input
              id="deposit-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isDepositing}
              min="0"
              step="any"
            />
            <p className="text-xs text-muted-foreground">
              Enter the amount of {tokenInfo.symbol} to deposit
            </p>
          </div>

          {/* Token Info */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Token</span>
              <span className="font-medium">{tokenInfo.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Symbol</span>
              <span className="font-medium">{tokenInfo.symbol}</span>
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
            disabled={isDepositing || !amount || parseFloat(amount) <= 0}
          >
            {isDepositing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDepositing ? 'Depositing...' : 'Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

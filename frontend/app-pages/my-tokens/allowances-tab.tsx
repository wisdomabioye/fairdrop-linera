'use client';

import { useState, useCallback, memo } from 'react';
import { CheckCircle, AlertCircle, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFungibleMutations } from '@/hooks';
import { toast } from 'sonner';
import type { ChainApp } from 'linera-react-client';

export interface AllowancesTabProps {
  tokenId: string;
  chainId: string;
  chainApp: ChainApp | null;
  canWrite: boolean;
  tokenSymbol: string;
  address: string;
}

export const AllowancesTab = memo(function AllowancesTab({
  tokenId,
  chainId,
  chainApp,
  canWrite,
  tokenSymbol,
  address,
}: AllowancesTabProps) {
  const [spender, setSpender] = useState('');
  const [amount, setAmount] = useState('');

  // Approve mutation
  const { approve, isApproving, approveError } = useFungibleMutations({
    chainApp,
    onApproveSuccess: () => {
      // Clear form
      setSpender('');
      setAmount('');

      toast.success('Approval successful!', {
        description: `${amount} ${tokenSymbol} approved for spender`,
      });
    },
    onError: (error) => {
      toast.error('Approval failed', {
        description: error.message,
      });
    },
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!spender || !amount || Number(amount) <= 0) {
        toast.error('Invalid input', {
          description: 'Please enter a valid spender address and amount',
        });
        return;
      }

      if (!canWrite) {
        toast.error('Read-only chain', {
          description: 'You can only approve allowances on the wallet chain',
        });
        return;
      }

      await approve(address, spender, amount);
    },
    [spender, amount, canWrite, approve]
  );

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only positive numbers with decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Read-only warning */}
      {!canWrite && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This chain is read-only. Allowance operations are only available on the wallet chain.
          </AlertDescription>
        </Alert>
      )}

      {/* Approve Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Approve Allowance
          </CardTitle>
          <CardDescription>
            Allow another address to spend tokens on your behalf
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Spender Address */}
            <div className="space-y-2">
              <Label htmlFor="spender">Spender Address</Label>
              <Input
                id="spender"
                type="text"
                placeholder="Enter spender address"
                value={spender}
                onChange={(e) => setSpender(e.target.value)}
                disabled={isApproving || !canWrite}
                className="font-mono text-sm"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="allowance-amount">Allowance Amount</Label>
              <Input
                id="allowance-amount"
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                disabled={isApproving || !canWrite}
                className="text-lg font-semibold"
              />
            </div>

            {/* Error Display */}
            {approveError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{approveError.message}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!canWrite || isApproving || !spender || !amount || Number(amount) <= 0}
              className="w-full gap-2"
              size="lg"
            >
              <CheckCircle className="h-4 w-4" />
              {isApproving ? 'Approving...' : `Approve ${amount || '0'} ${tokenSymbol}`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Coins className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                About Allowances
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Allowances let you authorize another address to spend a specific amount of your tokens.
                This is commonly used for smart contracts and delegated transactions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

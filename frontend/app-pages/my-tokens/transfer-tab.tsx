'use client';

import { useState, useCallback, memo } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFungibleMutations } from '@/hooks';
import { useTokenStore } from '@/store/token-store';
import { toast } from 'sonner';
import type { ChainApp } from 'linera-react-client';

export interface TransferTabProps {
  tokenId: string;
  chainId: string;
  chainApp: ChainApp | null;
  canWrite: boolean;
  tokenSymbol: string;
  address: string;
}

export const TransferTab = memo(function TransferTab({
  tokenId,
  chainId,
  chainApp,
  canWrite,
  tokenSymbol,
  address,
}: TransferTabProps) {
  const [recipientChainId, setRecipientChainId] = useState('');
  const [recipientOwner, setRecipientOwner] = useState('');
  const [amount, setAmount] = useState('');

  const { invalidateBalance, fetchBalance } = useTokenStore();

  // Transfer mutation
  const { transfer, isTransferring, transferError } = useFungibleMutations({
    chainApp,
    onError: (error) => {
      toast.error('Transfer failed', {
        description: error.message,
      });
    },
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!recipientChainId || !recipientOwner || !amount || Number(amount) <= 0) {
        toast.error('Invalid input', {
          description: 'Please enter valid recipient chain ID, owner address, and amount',
        });
        return;
      }

      if (!canWrite) {
        toast.error('Read-only chain', {
          description: 'You can only transfer on the wallet chain',
        });
        return;
      }

      const recipient = { chainId: recipientChainId, owner: recipientOwner };
      const success = await transfer(address, amount, recipient);

      if (success) {
        // Clear form
        setRecipientChainId('');
        setRecipientOwner('');
        setAmount('');

        // Invalidate and refetch balance
        invalidateBalance(tokenId, chainId, address);
        setTimeout(() => {
          if (chainApp) {
            fetchBalance(tokenId, chainId, address, chainApp);
          }
        }, 500);

        toast.success('Transfer successful!', {
          description: `${amount} ${tokenSymbol} sent to recipient`,
        });
      }
    },
    [recipientChainId, recipientOwner, amount, canWrite, transfer, address, tokenId, chainId, chainApp, tokenSymbol, invalidateBalance, fetchBalance]
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
            This chain is read-only. Transfer operations are only available on the wallet chain.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Recipient Chain ID */}
        <div className="space-y-2">
          <Label htmlFor="recipient-chain">Recipient Chain ID</Label>
          <Input
            id="recipient-chain"
            type="text"
            placeholder="Enter recipient chain ID"
            value={recipientChainId}
            onChange={(e) => setRecipientChainId(e.target.value)}
            disabled={isTransferring || !canWrite}
            className="font-mono text-sm"
          />
        </div>

        {/* Recipient Owner Address */}
        <div className="space-y-2">
          <Label htmlFor="recipient-owner">Recipient Owner Address</Label>
          <Input
            id="recipient-owner"
            type="text"
            placeholder="Enter recipient owner address"
            value={recipientOwner}
            onChange={(e) => setRecipientOwner(e.target.value)}
            disabled={isTransferring || !canWrite}
            className="font-mono text-sm"
          />
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="text"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountChange}
            disabled={isTransferring || !canWrite}
            className="text-lg font-semibold"
          />
        </div>

        {/* Error Display */}
        {transferError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{transferError.message}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!canWrite || isTransferring || !recipientChainId || !recipientOwner || !amount || Number(amount) <= 0}
          className="w-full gap-2"
          size="lg"
        >
          <Send className="h-4 w-4" />
          {isTransferring ? 'Transferring...' : `Transfer ${amount || '0'} ${tokenSymbol}`}
        </Button>
      </form>
    </div>
  );
});

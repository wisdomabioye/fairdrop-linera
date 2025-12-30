'use client';

import { useState, useCallback, memo } from 'react';
import { Download, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useFungibleMutations } from '@/hooks';
import { useTokenStore } from '@/store/token-store';
import { toast } from 'sonner';
import type { ChainApp } from 'linera-react-client';

export interface AdvancedTabProps {
  tokenId: string;
  chainId: string;
  chainApp: ChainApp | null;
  canWrite: boolean;
  tokenSymbol: string;
  address: string;
}

export const AdvancedTab = memo(function AdvancedTab({
  tokenId,
  chainId,
  chainApp,
  canWrite,
  tokenSymbol,
  address,
}: AdvancedTabProps) {
  // Claim state
  const [claimSourceAddress, setClaimSourceAddress] = useState('');
  const [claimTargetChainId, setClaimTargetChainId] = useState('');
  const [claimTargetOwner, setClaimTargetOwner] = useState('');
  const [claimAmount, setClaimAmount] = useState('');

  // TransferFrom state
  const [transferFromOwner, setTransferFromOwner] = useState('');
  const [transferFromSpender, setTransferFromSpender] = useState('');
  const [transferFromRecipientChainId, setTransferFromRecipientChainId] = useState('');
  const [transferFromRecipientOwner, setTransferFromRecipientOwner] = useState('');
  const [transferFromAmount, setTransferFromAmount] = useState('');

  const { invalidateBalance, fetchBalance } = useTokenStore();

  // Mutations
  const {
    claim,
    isClaiming,
    claimError,
    transferFrom,
    isTransferringFrom,
    transferFromError,
  } = useFungibleMutations({
    chainApp,
    onError: (error) => {
      toast.error('Operation failed', {
        description: error.message,
      });
    },
  });

  const handleClaimSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!claimSourceAddress || !claimTargetChainId || !claimTargetOwner || !claimAmount || Number(claimAmount) <= 0) {
        toast.error('Invalid input', {
          description: 'Please enter valid source address, target chain ID, target owner, and amount',
        });
        return;
      }

      if (!canWrite) {
        toast.error('Read-only chain', {
          description: 'You can only claim on the wallet chain',
        });
        return;
      }

      const targetAccount = { chainId: claimTargetChainId, owner: claimTargetOwner };
      const success = await claim(claimSourceAddress, claimAmount, targetAccount);

      if (success) {
        // Clear form
        setClaimSourceAddress('');
        setClaimTargetChainId('');
        setClaimTargetOwner('');
        setClaimAmount('');

        // Invalidate and refetch balance
        invalidateBalance(tokenId, chainId, address);
        setTimeout(() => {
          if (chainApp) {
            fetchBalance(tokenId, chainId, address, chainApp);
          }
        }, 500);

        toast.success('Claim successful!', {
          description: `${claimAmount} ${tokenSymbol} claimed`,
        });
      }
    },
    [claimSourceAddress, claimTargetChainId, claimTargetOwner, claimAmount, canWrite, claim, tokenId, chainId, address, chainApp, tokenSymbol, invalidateBalance, fetchBalance]
  );

  const handleTransferFromSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!transferFromOwner || !transferFromSpender || !transferFromRecipientChainId || !transferFromRecipientOwner || !transferFromAmount || Number(transferFromAmount) <= 0) {
        toast.error('Invalid input', {
          description: 'Please enter valid owner, spender, recipient chain ID, recipient owner, and amount',
        });
        return;
      }

      if (!canWrite) {
        toast.error('Read-only chain', {
          description: 'You can only transfer from on the wallet chain',
        });
        return;
      }

      const targetAccount = { chainId: transferFromRecipientChainId, owner: transferFromRecipientOwner };
      const success = await transferFrom(transferFromOwner, transferFromSpender, transferFromAmount, targetAccount);

      if (success) {
        // Clear form
        setTransferFromOwner('');
        setTransferFromSpender('');
        setTransferFromRecipientChainId('');
        setTransferFromRecipientOwner('');
        setTransferFromAmount('');

        // Invalidate and refetch balance
        invalidateBalance(tokenId, chainId, address);
        setTimeout(() => {
          if (chainApp) {
            fetchBalance(tokenId, chainId, address, chainApp);
          }
        }, 500);

        toast.success('Transfer from successful!', {
          description: `${transferFromAmount} ${tokenSymbol} transferred`,
        });
      }
    },
    [transferFromOwner, transferFromSpender, transferFromRecipientChainId, transferFromRecipientOwner, transferFromAmount, canWrite, transferFrom, tokenId, chainId, address, chainApp, tokenSymbol, invalidateBalance, fetchBalance]
  );

  const handleAmountChange = useCallback((
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only positive numbers with decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Read-only warning */}
      {!canWrite && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This chain is read-only. Advanced operations are only available on the wallet chain.
          </AlertDescription>
        </Alert>
      )}

      {/* Claim Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Claim Tokens
          </CardTitle>
          <CardDescription>
            Claim tokens from a source address to a target address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleClaimSubmit} className="space-y-4">
            {/* Source Address */}
            <div className="space-y-2">
              <Label htmlFor="claim-source">Source Address</Label>
              <Input
                id="claim-source"
                type="text"
                placeholder="Enter source address"
                value={claimSourceAddress}
                onChange={(e) => setClaimSourceAddress(e.target.value)}
                disabled={isClaiming || !canWrite}
                className="font-mono text-sm"
              />
            </div>

            {/* Target Chain ID */}
            <div className="space-y-2">
              <Label htmlFor="claim-target-chain">Target Chain ID</Label>
              <Input
                id="claim-target-chain"
                type="text"
                placeholder="Enter target chain ID"
                value={claimTargetChainId}
                onChange={(e) => setClaimTargetChainId(e.target.value)}
                disabled={isClaiming || !canWrite}
                className="font-mono text-sm"
              />
            </div>

            {/* Target Owner */}
            <div className="space-y-2">
              <Label htmlFor="claim-target-owner">Target Owner Address</Label>
              <Input
                id="claim-target-owner"
                type="text"
                placeholder="Enter target owner address"
                value={claimTargetOwner}
                onChange={(e) => setClaimTargetOwner(e.target.value)}
                disabled={isClaiming || !canWrite}
                className="font-mono text-sm"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="claim-amount">Amount</Label>
              <Input
                id="claim-amount"
                type="text"
                placeholder="0.00"
                value={claimAmount}
                onChange={handleAmountChange(setClaimAmount)}
                disabled={isClaiming || !canWrite}
                className="text-lg font-semibold"
              />
            </div>

            {/* Error Display */}
            {claimError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{claimError.message}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!canWrite || isClaiming || !claimSourceAddress || !claimTargetChainId || !claimTargetOwner || !claimAmount || Number(claimAmount) <= 0}
              className="w-full gap-2"
              size="lg"
            >
              <Download className="h-4 w-4" />
              {isClaiming ? 'Claiming...' : `Claim ${claimAmount || '0'} ${tokenSymbol}`}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* TransferFrom Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer From
          </CardTitle>
          <CardDescription>
            Transfer tokens from an owner to a recipient using your allowance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTransferFromSubmit} className="space-y-4">
            {/* Owner Address */}
            <div className="space-y-2">
              <Label htmlFor="transferfrom-owner">Owner Address</Label>
              <Input
                id="transferfrom-owner"
                type="text"
                placeholder="Enter owner address"
                value={transferFromOwner}
                onChange={(e) => setTransferFromOwner(e.target.value)}
                disabled={isTransferringFrom || !canWrite}
                className="font-mono text-sm"
              />
            </div>

            {/* Spender Address */}
            <div className="space-y-2">
              <Label htmlFor="transferfrom-spender">Spender Address</Label>
              <Input
                id="transferfrom-spender"
                type="text"
                placeholder="Enter spender address"
                value={transferFromSpender}
                onChange={(e) => setTransferFromSpender(e.target.value)}
                disabled={isTransferringFrom || !canWrite}
                className="font-mono text-sm"
              />
            </div>

            {/* Recipient Chain ID */}
            <div className="space-y-2">
              <Label htmlFor="transferfrom-recipient-chain">Recipient Chain ID</Label>
              <Input
                id="transferfrom-recipient-chain"
                type="text"
                placeholder="Enter recipient chain ID"
                value={transferFromRecipientChainId}
                onChange={(e) => setTransferFromRecipientChainId(e.target.value)}
                disabled={isTransferringFrom || !canWrite}
                className="font-mono text-sm"
              />
            </div>

            {/* Recipient Owner */}
            <div className="space-y-2">
              <Label htmlFor="transferfrom-recipient-owner">Recipient Owner Address</Label>
              <Input
                id="transferfrom-recipient-owner"
                type="text"
                placeholder="Enter recipient owner address"
                value={transferFromRecipientOwner}
                onChange={(e) => setTransferFromRecipientOwner(e.target.value)}
                disabled={isTransferringFrom || !canWrite}
                className="font-mono text-sm"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="transferfrom-amount">Amount</Label>
              <Input
                id="transferfrom-amount"
                type="text"
                placeholder="0.00"
                value={transferFromAmount}
                onChange={handleAmountChange(setTransferFromAmount)}
                disabled={isTransferringFrom || !canWrite}
                className="text-lg font-semibold"
              />
            </div>

            {/* Error Display */}
            {transferFromError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{transferFromError.message}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!canWrite || isTransferringFrom || !transferFromOwner || !transferFromSpender || !transferFromRecipientChainId || !transferFromRecipientOwner || !transferFromAmount || Number(transferFromAmount) <= 0}
              className="w-full gap-2"
              size="lg"
            >
              <ArrowRightLeft className="h-4 w-4" />
              {isTransferringFrom ? 'Transferring...' : `Transfer ${transferFromAmount || '0'} ${tokenSymbol}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
});

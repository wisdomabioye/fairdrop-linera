'use client';

import { useWalletConnection } from 'linera-react-client';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { EmptyState } from '@/components/loading/empty-state';

export default function CreatorWithdrawals() {
  const { isConnected } = useWalletConnection();

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <WalletConnectionPrompt
          title="Connect Your Wallet"
          description="Connect your wallet to manage your withdrawals."
        />
      </div>
    );
  }

  // TODO: Fetch actual withdrawal data
  const pendingWithdrawals = [];
  const withdrawalHistory = [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Withdrawals</h1>
        <p className="text-muted-foreground mt-1">
          Manage your auction proceeds and token withdrawals
        </p>
      </div>

      {/* Pending Withdrawals */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Withdrawals</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingWithdrawals.length === 0 ? (
            <EmptyState
              title="No pending withdrawals"
              description="You don't have any pending withdrawals at the moment."
              icon={<Wallet className="h-12 w-12" />}
            />
          ) : (
            <div className="space-y-4">
              {/* Withdrawal items will go here */}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawalHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No withdrawal history yet
            </div>
          ) : (
            <div className="space-y-4">
              {/* History items will go here */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

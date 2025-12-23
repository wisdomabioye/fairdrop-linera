'use client';

import { useRouter } from 'next/navigation';
import { useWalletConnection } from 'linera-react-client';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Gavel, BarChart, Wallet, CheckCircle } from 'lucide-react';

export default function CreatorGetStarted() {
  const router = useRouter();
  const { isConnected } = useWalletConnection();

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <WalletConnectionPrompt
          title="Connect Your Wallet"
          description="Connect your wallet to get started as a creator."
        />
      </div>
    );
  }

  const steps = [
    {
      icon: Plus,
      title: 'Create Your First Auction',
      description: 'Set up a descending-price auction with uniform clearing. Define your item, pricing, and duration.',
      action: () => router.push('/create-auction'),
      buttonText: 'Create Auction',
      buttonVariant: 'default' as const,
    },
    {
      icon: Gavel,
      title: 'Manage Active Auctions',
      description: 'Monitor your live auctions, track bids, and view real-time performance metrics.',
      action: () => router.push('/creator/auctions'),
      buttonText: 'View My Auctions',
      buttonVariant: 'outline' as const,
    },
    {
      icon: BarChart,
      title: 'Track Analytics',
      description: 'Analyze your auction performance, revenue trends, and bidder engagement.',
      action: () => router.push('/creator/analytics'),
      buttonText: 'View Analytics',
      buttonVariant: 'outline' as const,
    },
    {
      icon: Wallet,
      title: 'Withdraw Proceeds',
      description: 'Collect your earnings from settled auctions and manage your revenue.',
      action: () => router.push('/creator/withdrawals'),
      buttonText: 'Manage Withdrawals',
      buttonVariant: 'outline' as const,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Welcome to Fairdrop Creator</h1>
        <p className="text-muted-foreground text-lg">
          Everything you need to create and manage successful auctions
        </p>
      </div>

      {/* Quick Start Guide */}
      <div className="grid gap-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card key={index} className="hover-lift">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{step.title}</CardTitle>
                    <CardDescription className="text-base">
                      {step.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant={step.buttonVariant}
                  onClick={step.action}
                  className="w-full sm:w-auto"
                >
                  {step.buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Benefits Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle>Why Choose Fairdrop?</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
            <div>
              <p className="font-medium">Fair Price Discovery</p>
              <p className="text-sm text-muted-foreground">Descending-price mechanism ensures optimal pricing</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
            <div>
              <p className="font-medium">Transparent Process</p>
              <p className="text-sm text-muted-foreground">All bids and outcomes are on-chain and verifiable</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
            <div>
              <p className="font-medium">No Hidden Fees</p>
              <p className="text-sm text-muted-foreground">Clear fee structure with no surprises</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
            <div>
              <p className="font-medium">Instant Settlement</p>
              <p className="text-sm text-muted-foreground">Automated clearing and distribution of proceeds</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

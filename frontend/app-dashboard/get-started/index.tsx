'use client';

import { useRouter } from 'next/navigation';
import { useWalletConnection } from 'linera-react-client';
import {
  Plus,
  Gavel,
  BarChart,
  Wallet,
  CheckCircle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';
import { WalletConnectionPrompt } from '@/components/wallet/wallet-connection-prompt';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { APP_ROUTES } from '@/config/app.route';
import { cn } from '@/lib/utils';

export default function CreatorGetStarted() {
  const router = useRouter();
  const { isConnected } = useWalletConnection();

  if (!isConnected) {
    return (
      <div className="mx-auto my-6 py-6 max-w-xl">
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
      action: () => router.push(APP_ROUTES.creatorCreate),
      buttonText: 'Create Auction',
      buttonVariant: 'default' as const,
      badge: 'Start Here',
      gradientFrom: 'from-blue-500/10',
      gradientTo: 'to-cyan-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      icon: Gavel,
      title: 'Manage Active Auctions',
      description: 'Monitor your live auctions, track bids, and view real-time performance metrics.',
      action: () => router.push(APP_ROUTES.creatorAuctions),
      buttonText: 'View My Auctions',
      buttonVariant: 'outline' as const,
      gradientFrom: 'from-purple-500/10',
      gradientTo: 'to-pink-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      icon: BarChart,
      title: 'Track Analytics',
      description: 'Analyze your auction performance, revenue trends, and bidder engagement.',
      action: () => router.push(APP_ROUTES.creator),
      buttonText: 'View Analytics',
      buttonVariant: 'outline' as const,
      gradientFrom: 'from-green-500/10',
      gradientTo: 'to-emerald-500/10',
      borderColor: 'border-green-500/20',
    },
    {
      icon: Wallet,
      title: 'Withdraw Proceeds',
      description: 'Collect your earnings from settled auctions and manage your revenue.',
      action: () => router.push(APP_ROUTES.aacBalance),
      buttonText: 'Manage Withdrawals',
      buttonVariant: 'outline' as const,
      gradientFrom: 'from-orange-500/10',
      gradientTo: 'to-amber-500/10',
      borderColor: 'border-orange-500/20',
    },
  ];

  const benefits = [
    {
      icon: TrendingUp,
      title: 'Fair Price Discovery',
      description: 'Descending-price mechanism ensures optimal pricing',
      color: 'text-blue-500',
    },
    {
      icon: Shield,
      title: 'Transparent Process',
      description: 'All bids and outcomes are on-chain and verifiable',
      color: 'text-purple-500',
    },
    {
      icon: Zap,
      title: 'No Hidden Fees',
      description: 'Clear fee structure with no surprises',
      color: 'text-green-500',
    },
    {
      icon: CheckCircle,
      title: 'Instant Settlement',
      description: 'Automated clearing and distribution of proceeds',
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Creator Dashboard</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome to Fairdrop Creator
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl mb-6">
            Everything you need to create and manage successful auctions
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              onClick={() => router.push(APP_ROUTES.creatorCreate)}
              className="group"
            >
              Create Your First Auction
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push(APP_ROUTES.creatorAuctions)}
            >
              View My Auctions
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Quick Start Guide</h2>
          <p className="text-muted-foreground">Follow these steps to launch your first auction</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={index}
                className={cn(
                  "group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden border",
                  step.borderColor
                )}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-50",
                  step.gradientFrom,
                  step.gradientTo
                )} />

                <CardHeader className="relative">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-xl bg-background border-2 border-border flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Icon className="w-7 h-7 text-foreground" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">
                          {index + 1}
                        </div>
                      </div>
                    </div>
                    {step.badge && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {step.badge}
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-xl mb-2">{step.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="relative">
                  <Button
                    variant={step.buttonVariant}
                    onClick={step.action}
                    className="w-full group/btn"
                  >
                    {step.buttonText}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Benefits Section */}
      <div>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Why Choose Fairdrop?</h2>
          <p className="text-muted-foreground">Built for creators, designed for fairness</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card
                key={index}
                className="text-center hover:shadow-md transition-shadow duration-300"
              >
                <CardContent className="pt-6">
                  <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Icon className={cn("w-7 h-7", benefit.color)} />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none">
        <CardContent className="p-8 text-center">
          <h3 className="text-2xl font-bold mb-2">Ready to Get Started?</h3>
          <p className="text-primary-foreground/90 mb-6 max-w-2xl mx-auto">
            Create your first auction in minutes and join the fair marketplace revolution
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => router.push(APP_ROUTES.creatorCreate)}
            className="group"
          >
            Launch Your First Auction
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
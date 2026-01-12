'use client';

import Link from 'next/link';
import {
  Droplets,
  Wallet,
  Gavel,
  Trophy,
  ArrowRight,
  CircleDollarSign,
  ArrowDownToLine,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_ROUTES } from '@/config/app.route';
import { cn } from '@/lib/utils';

export default function HowToBid() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-16 space-y-4 animate-in fade-in duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Complete Guide
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground via-primary to-purple-500 bg-clip-text text-transparent">
            How to Place a Bid
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Follow these simple steps to start bidding on auctions. Get tokens, deposit them, and you're ready to go!
          </p>
        </div>

        {/* Steps Section */}
        <div className="max-w-5xl mx-auto space-y-6 mb-16">
          {/* Step 1: Mint Tokens */}
          <StepCard
            number={1}
            icon={<Droplets className="h-6 w-6" />}
            title="Mint Payment Tokens"
            description="Get free test tokens from the faucet to use for bidding"
            details={[
              'Visit the token faucet page',
              'Select the token you want to mint',
              'Tokens are instantly credited to your wallet',
              'You can mint as many tokens as you need'
            ]}
            actionLabel="Go to Faucet"
            actionHref={APP_ROUTES.faucet}
            gradient="from-blue-500 to-cyan-500"
            delay="0"
          />

          {/* Step 2: Deposit to AAC */}
          <StepCard
            number={2}
            icon={<ArrowDownToLine className="h-6 w-6" />}
            title="Deposit to AAC Balance"
            description="Transfer tokens to your Auction Authority Chain (AAC) balance"
            details={[
              'Navigate to AAC Balance page',
              'Deposit any amount of supported tokens',
              'Your AAC balance is used for all auction bids',
              'Deposited tokens remain yours - withdraw anytime'
            ]}
            actionLabel="Manage AAC Balance"
            actionHref={APP_ROUTES.aacBalance}
            gradient="from-purple-500 to-pink-500"
            delay="200"
          />

          {/* Step 3: Place Bids */}
          <StepCard
            number={3}
            icon={<Gavel className="h-6 w-6" />}
            title="Place Your Bids"
            description="Browse auctions and place bids using your AAC balance"
            details={[
              'Browse available auctions',
              'Select the auction you want to bid on',
              'Enter your bid amount',
              'Payment is automatically deducted from AAC balance'
            ]}
            actionLabel="View Auctions"
            actionHref={APP_ROUTES.home}
            gradient="from-emerald-500 to-teal-500"
            delay="400"
          />

          {/* Step 4: Claim & Withdraw */}
          <StepCard
            number={4}
            icon={<Trophy className="h-6 w-6" />}
            title="Claim Winnings & Withdraw"
            description="After auction settlement, claim your allocation and manage funds"
            details={[
              'When auction settles, claim your settlement',
              'Allocated tokens are deposited to your AAC balance',
              'Unused bid amounts are refunded automatically',
              'Withdraw to your wallet anytime from AAC Balance'
            ]}
            actionLabel="View My Bids"
            actionHref={APP_ROUTES.myBids}
            gradient="from-amber-500 to-orange-500"
            delay="600"
          />
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700">
          <InfoCard
            icon={<CircleDollarSign className="h-5 w-5" />}
            title="Multiple Tokens"
            description="Deposit any supported token to your AAC balance for maximum flexibility"
            color="text-blue-500"
          />
          <InfoCard
            icon={<Wallet className="h-5 w-5" />}
            title="Your Funds, Your Control"
            description="Deposited tokens remain yours and can be withdrawn at any time"
            color="text-purple-500"
          />
          <InfoCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Automatic Processing"
            description="Bids are processed instantly, settlements are automatic"
            color="text-emerald-500"
          />
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-6 animate-in fade-in duration-500 delay-1000">
          <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20 backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-4">Ready to Start Bidding?</h3>
            <p className="text-muted-foreground mb-6">
              Start by minting some tokens from the faucet, then deposit them to your AAC balance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" variant="gradient" className="group">
                <Link href={APP_ROUTES.faucet}>
                  <Droplets className="h-5 w-5" />
                  Get Tokens Now
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="group">
                <Link href={APP_ROUTES.home}>
                  Browse Auctions
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StepCardProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
  actionLabel: string;
  actionHref: string;
  gradient: string;
  delay: string;
}

function StepCard({
  number,
  icon,
  title,
  description,
  details,
  actionLabel,
  actionHref,
  gradient,
  delay
}: StepCardProps) {
  return (
    <div
      className="group relative animate-in fade-in slide-in-from-left-8 duration-500"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Connecting line (not shown for last item) */}
      <div className="hidden md:block absolute left-[2.75rem] top-20 bottom-0 w-0.5 bg-gradient-to-b from-border to-transparent -z-10" />

      <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
        {/* Step Number & Icon */}
        <div className="flex items-start gap-4 mb-4">
          <div className={cn(
            'relative flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg',
            gradient
          )}>
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-background border-2 border-current rounded-full flex items-center justify-center text-xs font-bold">
              {number}
            </span>
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold mb-2">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Details List */}
        <ul className="space-y-3 mb-6 ml-[4.5rem]">
          {details.map((detail, index) => (
            <li key={index} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{detail}</span>
            </li>
          ))}
        </ul>

        {/* Action Button */}
        <div className="ml-[4.5rem]">
          <Button asChild variant="outline" className="group/btn">
            <Link href={actionHref}>
              {actionLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

function InfoCard({ icon, title, description, color }: InfoCardProps) {
  return (
    <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors">
      <div className={cn(
        'w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center mb-4',
        color
      )}>
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

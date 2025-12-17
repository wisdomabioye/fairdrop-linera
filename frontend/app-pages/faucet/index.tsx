'use client';

import { FaucetForm } from '@/components/faucet';
import { Sparkles, Zap, Gift } from 'lucide-react';

export default function FaucetPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-4 animate-in fade-in duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Free Test Tokens
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            Token Faucet
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get free test tokens instantly to participate in auctions and explore the Fairdrop platform
          </p>
        </div>

        {/* Main Faucet Form */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <FaucetForm />
        </div>

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Instant Delivery"
            description="Tokens are credited to your wallet immediately after minting"
          />
          <FeatureCard
            icon={<Gift className="h-6 w-6" />}
            title="No Limits"
            description="Mint as many tokens as you need for testing and experimentation"
          />
          <FeatureCard
            icon={<Sparkles className="h-6 w-6" />}
            title="Multiple Tokens"
            description="Choose from different token types for various use cases"
          />
        </div>

        {/* Info Section */}
        <div className="mt-16 text-center space-y-4 animate-in fade-in duration-500 delay-500">
          <div className="max-w-2xl mx-auto p-6 rounded-lg bg-muted/50 border border-border/50">
            <h3 className="text-lg font-semibold mb-2">About Test Tokens</h3>
            <p className="text-sm text-muted-foreground">
              These tokens are for testing purposes only and have no real-world value.
              Use them to explore auction bidding, transfers, and other platform features
              without any cost or risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-6 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

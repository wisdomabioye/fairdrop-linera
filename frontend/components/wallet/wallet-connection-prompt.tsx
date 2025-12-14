'use client';

import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useWalletConnection } from 'linera-react-client';
import { APP_ROUTES } from '@/config/app.route';

export interface WalletConnectionPromptProps {
  title?: string;
  description?: string;
  showAlternativeAction?: boolean;
  alternativeActionText?: string;
  alternativeActionHref?: string;
  onAlternativeAction?: () => void;
  className?: string;
}

export function WalletConnectionPrompt({
  title = 'Connect Your Wallet',
  description = 'Connect your wallet to access this feature. You\'ll be able to interact with auctions and manage your account.',
  showAlternativeAction = true,
  alternativeActionText = 'Browse active auctions',
  alternativeActionHref = APP_ROUTES.activeAuctions,
  onAlternativeAction,
  className,
}: WalletConnectionPromptProps) {
  const router = useRouter();
  const { isConnecting, connect } = useWalletConnection();

  const handleAlternativeAction = () => {
    if (onAlternativeAction) {
      onAlternativeAction();
    } else if (alternativeActionHref) {
      router.push(alternativeActionHref);
    }
  };

  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6">
        <div className="rounded-full bg-primary/10 p-6">
          <Wallet className="h-12 w-12 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground max-w-md">{description}</p>
        </div>

        <Button
          size="lg"
          onClick={connect}
          disabled={isConnecting}
          className="gap-2"
        >
          {isConnecting ? (
            <>
              <Spinner className="h-4 w-4" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </>
          )}
        </Button>

        {showAlternativeAction && (
          <div className="pt-4 border-t w-full">
            <p className="text-sm text-muted-foreground">
              Don't have a wallet?{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={handleAlternativeAction}
              >
                {alternativeActionText}
              </Button>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

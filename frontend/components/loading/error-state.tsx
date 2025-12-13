/**
 * Error State Component
 *
 * Reusable component for displaying error states with retry functionality
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  className
}: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center min-h-[400px]',
        className
      )}
    >
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>

      <h3 className="text-xl font-semibold mb-2">{title}</h3>

      <p className="text-muted-foreground max-w-md mb-6">{errorMessage}</p>

      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

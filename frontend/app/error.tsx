'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16">
        {/* Error Icon */}
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl" />
            <div className="relative bg-destructive/10 border-2 border-destructive/20 rounded-full p-6">
              <AlertTriangle className="h-16 w-16 text-destructive animate-pulse" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-4 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Something Went Wrong
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            We encountered an unexpected error. Don't worry, our team has been notified and we're working on it.
          </p>
        </div>

        {/* Error Details (Development Only) */}
        {isDevelopment && error.message && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Alert variant="destructive" className="bg-destructive/5 backdrop-blur-xl border-destructive/20">
              <Bug className="h-4 w-4" />
              <AlertDescription className="mt-2">
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Error Details:</p>
                  <pre className="text-xs overflow-x-auto p-3 bg-background/50 rounded-lg border border-destructive/10">
                    {error.message}
                  </pre>
                  {error.digest && (
                    <p className="text-xs text-muted-foreground">
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* What Happened Card */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              What can you do?
            </h3>
            <ul className="text-sm text-muted-foreground space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5">1.</span>
                <span>Try refreshing the page or clicking the retry button below</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5">2.</span>
                <span>Go back to the homepage and try again</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5">3.</span>
                <span>If the problem persists, contact support with the error ID</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <Button
            onClick={reset}
            size="lg"
            variant="default"
            className="group"
          >
            <RefreshCw className="h-5 w-5 transition-transform group-hover:rotate-180 duration-500" />
            Try Again
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="group"
          >
            <Link href="/">
              <Home className="h-5 w-5 transition-transform group-hover:scale-110" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        {error.digest && (
          <p className="mt-12 text-center text-sm text-muted-foreground/70 animate-in fade-in duration-700 delay-700">
            Error ID: <code className="px-2 py-1 bg-muted/50 rounded text-xs">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}

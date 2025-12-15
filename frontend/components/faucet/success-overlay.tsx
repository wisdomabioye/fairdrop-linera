'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SuccessOverlayProps {
  show: boolean;
  amount: string;
  tokenSymbol: string;
  onClose?: () => void;
  duration?: number;
}

export function SuccessOverlay({
  show,
  amount,
  tokenSymbol,
  onClose,
  duration = 3000,
}: SuccessOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 max-w-md w-full animate-in zoom-in-95 duration-500">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-success/20 rounded-full animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-success/30 to-success/10 border-2 border-success flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-3">
            <h3 className="text-2xl font-bold text-foreground">Mint Successful!</h3>
            <p className="text-muted-foreground">
              You've successfully minted
            </p>
            <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-3xl font-bold text-primary tabular-nums">
                {amount}
              </span>
              <span className="text-xl font-semibold text-muted-foreground">
                {tokenSymbol}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your new balance will be reflected shortly
            </p>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
          <div className="absolute top-8 right-6 w-3 h-3 rounded-full bg-success/50 animate-pulse delay-100" />
          <div className="absolute bottom-6 left-6 w-2 h-2 rounded-full bg-secondary/50 animate-pulse delay-200" />
          <div className="absolute bottom-8 right-4 w-2 h-2 rounded-full bg-primary/50 animate-pulse delay-300" />
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { WalletConfig } from '@/config/app.wallets';

interface WalletSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  wallets: WalletConfig[];
  onWalletSelect: (walletId: string) => Promise<void>;
  isConnecting?: boolean;
}

export function WalletSelectionDialog({
  open,
  onClose,
  wallets,
  onWalletSelect,
  isConnecting = false,
}: WalletSelectionDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [walletStates, setWalletStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check wallet installation status
  useEffect(() => {
    if (open && mounted) {
      const states: Record<string, boolean> = {};
      wallets.forEach(wallet => {
        states[wallet.id] = wallet.checkInstalled();
      });
      setWalletStates(states);
    }
  }, [open, mounted, wallets]);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setSelectedWallet(null);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!mounted || (!open && !isVisible)) return null;

  const handleClose = () => {
    if (isConnecting) return;
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleWalletClick = async (wallet: WalletConfig) => {
    if (isConnecting) return;

    const isInstalled = walletStates[wallet.id];

    if (isInstalled) {
      setSelectedWallet(wallet.id);
      try {
        await onWalletSelect(wallet.id);
      } catch (error) {
        setSelectedWallet(null);
        console.error('Wallet connection failed:', error);
      }
    } else {
      window.open(wallet.downloadUrl, '_blank');
    }
  };

  const dialogContent = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className={`relative w-full max-w-lg transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Cosmic background particles */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute top-6 left-6 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-6 right-6 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
        </div>

        {/* Dialog content */}
        <div className="relative bg-gradient-to-br from-background/95 to-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative p-5 pb-4 border-b border-white/10">
            <button
              onClick={handleClose}
              disabled={isConnecting}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-glass hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close dialog"
            >
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-text-primary mb-1">
                  Connect Your Wallet
                </h2>
                <p className="text-sm text-text-secondary leading-snug">
                  Choose a wallet to connect to Fairdrop and start bidding on exclusive auctions.
                </p>
              </div>
            </div>

            {/* Web3 Intro */}
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-text-primary mb-0.5">New to Web3 Wallets?</h3>
                  <p className="text-xs text-text-secondary leading-snug">
                    A Web3 wallet is your gateway to blockchain applications. It securely stores your digital assets
                    and allows you to interact with decentralized apps like Fairdrop.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Options */}
          <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
            {wallets.map((wallet) => {
              const isInstalled = walletStates[wallet.id] ?? false;
              const isSelected = selectedWallet === wallet.id;
              const isLoading = isConnecting && isSelected;

              return (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletClick(wallet)}
                  disabled={isConnecting}
                  className={`group relative w-full p-4 rounded-xl border transition-all duration-300 overflow-hidden ${
                    isInstalled
                      ? 'bg-gradient-to-br from-glass to-glass/50 border-white/10 hover:border-primary/50 hover:from-white/5 hover:to-glass/50'
                      : 'bg-glass/30 border-white/5 hover:border-secondary/30 hover:bg-glass/50'
                  } ${
                    isSelected ? 'border-primary shadow-xl shadow-primary/30 ring-2 ring-primary/20' : ''
                  } ${
                    isConnecting ? 'cursor-not-allowed opacity-60' : 'hover:scale-[1.02] cursor-pointer'
                  }`}
                >
                  {/* Glow effect for selected */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
                  )}

                  <div className="flex items-center gap-4 relative z-10">
                    {/* Wallet Icon */}
                    <div className={`relative w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0 transition-all ${
                      isInstalled
                        ? 'bg-gradient-to-br from-white/10 to-white/5 shadow-lg'
                        : 'bg-white/5'
                    } ${isSelected ? 'scale-110 shadow-primary/50' : 'group-hover:scale-105'}`}>
                      {isLoading ? (
                        <div className="relative">
                          <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                          <div className="absolute inset-0 w-6 h-6 border-3 border-primary/30 border-t-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse' }} />
                        </div>
                      ) : (
                        <span className="drop-shadow-lg">{wallet.icon}</span>
                      )}

                      {/* Checkmark for installed wallets */}
                      {isInstalled && !isLoading && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-card flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Wallet Info */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-text-primary truncate">
                          {wallet.name}
                        </h3>
                        {isInstalled ? (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gradient-to-r from-success/20 to-success/10 text-success border border-success/40 shadow-sm whitespace-nowrap">
                            ✓ Ready
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary/10 text-secondary/80 border border-secondary/30 whitespace-nowrap">
                            Install
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                        {wallet.description}
                      </p>
                    </div>

                    {/* Action Icon */}
                    <div className="shrink-0">
                      {isInstalled ? (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <svg className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/30 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                          <svg className="w-5 h-5 text-secondary group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced download hint for non-installed wallets */}
                  {!isInstalled && (
                    <div className="mt-3 pt-3 border-t border-white/10 relative z-10">
                      <div className="flex items-start gap-2 text-xs">
                        <div className="w-5 h-5 rounded bg-info/10 border border-info/30 flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-text-secondary font-medium mb-0.5">Not installed on this device</p>
                          <p className="text-text-secondary/70">Click to visit download page and install {wallet.name}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Connecting state overlay */}
                  {isLoading && (
                    <div className="mt-3 pt-3 border-t border-white/10 relative z-10">
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                        <span className="ml-1 font-medium">Connecting to {wallet.name}...</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 pt-3 border-t border-white/10 bg-glass/30">
            <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Your wallet credentials are secure and never stored by Fairdrop</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

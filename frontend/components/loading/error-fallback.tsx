/**
 * ErrorFallback Component
 *
 * Blockchain-themed error screen for Linera initialization failures.
 * Provides clear error messaging with retry functionality.
 */

'use client';

import { useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorFallbackProps {
    error?: Error | string;
    onRetry?: () => void;
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
    const [showDetails, setShowDetails] = useState(false);

    const errorMessage = typeof error === 'string' ? error : error?.message;
    const errorStack = typeof error === 'object' && error?.stack ? error.stack : null;

    const handleRetry = () => {
        if (onRetry) {
            onRetry();
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="dark fixed inset-0 bg-background flex items-center justify-center">
            <div className="relative flex flex-col items-center justify-center gap-8 max-w-2xl mx-auto px-6">
                {/* Error Animation Container */}
                <div className="relative w-32 h-32">
                    {/* Outer pulsing ring - Error gradient */}
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-destructive border-r-destructive/50 animate-pulse-subtle"
                         style={{ animationDuration: '2s' }} />

                    {/* Middle broken ring - Warning gradient */}
                    <div className="absolute inset-2 rounded-full border-4 border-dashed border-warning/30 animate-pulse-subtle"
                         style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />

                    {/* Center error icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                            {/* Glow effect */}
                            <div className="absolute inset-0 rounded-full bg-destructive/20 blur-xl animate-glow" />
                            {/* Icon */}
                            <AlertCircle className="relative w-12 h-12 text-destructive animate-pulse-subtle" />
                        </div>
                    </div>

                    {/* Orbiting warning indicators */}
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-destructive/40" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-destructive/40" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-destructive/40" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-destructive/40" />
                    </div>
                </div>

                {/* Error Content */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <h2 className="text-3xl font-bold text-destructive animate-fade-in">
                        Connection Failed
                    </h2>

                    <p className="text-lg text-muted-foreground max-w-md animate-fade-in">
                        Unable to initialize connection to the Linera blockchain network
                    </p>

                    {/* Error Message */}
                    {errorMessage && (
                        <div className="mt-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-fade-in">
                            <p className="text-sm text-destructive font-mono">
                                {errorMessage}
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleRetry}
                            className="group flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-primary/20"
                        >
                            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                            Retry Connection
                        </button>

                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-semibold transition-all hover:scale-105 active:scale-95"
                        >
                            Go Home
                        </button>
                    </div>

                    {/* Technical Details (Collapsible) */}
                    {errorStack && (
                        <div className="mt-6 w-full max-w-xl">
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                            >
                                {showDetails ? (
                                    <>
                                        <ChevronUp className="w-4 h-4" />
                                        Hide Technical Details
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="w-4 h-4" />
                                        Show Technical Details
                                    </>
                                )}
                            </button>

                            {showDetails && (
                                <div className="mt-3 p-4 bg-muted/50 rounded-lg border border-border animate-fade-in">
                                    <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap font-mono">
                                        {errorStack}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Help Text */}
                    <p className="text-xs text-muted-foreground mt-4 max-w-md">
                        If this issue persists, please check your network connection or try again later.
                        The blockchain network may be temporarily unavailable.
                    </p>
                </div>

                {/* Background decorative elements */}
                <div className="absolute -z-10 inset-0 overflow-hidden pointer-events-none">
                    {/* Floating broken chain links */}
                    <div className="absolute top-1/4 left-1/4 w-6 h-6 border-2 border-destructive/20 rounded rotate-45 animate-pulse-subtle"
                         style={{ animationDelay: '0s', animationDuration: '3s' }} />
                    <div className="absolute top-3/4 right-1/4 w-4 h-4 border-2 border-warning/20 rounded rotate-12 animate-pulse-subtle"
                         style={{ animationDelay: '1s', animationDuration: '3s' }} />
                    <div className="absolute bottom-1/3 left-1/3 w-5 h-5 border-2 border-destructive/20 rounded -rotate-12 animate-pulse-subtle"
                         style={{ animationDelay: '2s', animationDuration: '3s' }} />

                    {/* Broken connection lines */}
                    <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                        <line x1="25%" y1="25%" x2="45%" y2="45%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-destructive animate-pulse-subtle" />
                        <line x1="75%" y1="75%" x2="55%" y2="55%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-destructive animate-pulse-subtle" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

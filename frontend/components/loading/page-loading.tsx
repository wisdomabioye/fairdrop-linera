/**
 * PageLoading Component
 *
 * Blockchain and auction-themed loading animation with multiple elements.
 * Used as fallback while Linera client initializes.
 */

'use client';

import { useEffect, useState } from 'react';

export function PageLoading() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setTimeout(() => setProgress(30), 100);
        setTimeout(() => setProgress(50), 600);
        setTimeout(() => setProgress(75), 1200);
        setTimeout(() => setProgress(95), 1800);
    }, []);
    return (
        <div className="dark fixed inset-0 bg-background flex items-center justify-center">
            <div className="relative flex flex-col items-center justify-center gap-8">
                {/* Main Animation Container */}
                <div className="relative w-32 h-32">
                    {/* Outer rotating ring - Primary gradient */}
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/50 animate-spin"
                         style={{ animationDuration: '2s' }} />

                    {/* Middle pulsing ring - Accent gradient */}
                    <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-accent border-l-accent/50 animate-spin"
                         style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />

                    {/* Inner rotating dots ring */}
                    <div className="absolute inset-4 animate-spin" style={{ animationDuration: '3s' }}>
                        {/* Blockchain nodes/dots positioned around circle */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary shadow-glow-primary animate-pulse-subtle" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent shadow-glow-accent animate-pulse-subtle"
                             style={{ animationDelay: '0.5s' }} />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-success shadow-glow-success animate-pulse-subtle"
                             style={{ animationDelay: '1s' }} />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-warning shadow-glow-warning animate-pulse-subtle"
                             style={{ animationDelay: '1.5s' }} />
                    </div>

                    {/* Center core - Pulsing gradient */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full gradient-primary-vivid animate-glow" />
                    </div>

                    {/* Orbiting auction gavel icon (represented by small squares) */}
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-sm bg-foreground/20 rotate-45" />
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-sm bg-foreground/20 rotate-45" />
                    </div>
                </div>

                {/* Loading Text */}
                <div className="flex flex-col items-center gap-3">
                    <h2 className="text-2xl font-semibold text-gradient-primary animate-pulse-subtle">
                        Initializing Linera Chain
                    </h2>

                    {/* Loading dots animation */}
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce"
                             style={{ animationDelay: '0s' }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce"
                             style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce"
                             style={{ animationDelay: '0.4s' }} />
                    </div>

                    {/* Shimmer bar */}
                    <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full gradient-primary-r transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Status text */}
                    <p className="text-sm text-muted-foreground mt-2 animate-fade-in">
                        Connecting to blockchain network...
                    </p>
                </div>

                {/* Background decorative elements */}
                <div className="absolute -z-10 inset-0 overflow-hidden pointer-events-none">
                    {/* Floating blockchain blocks */}
                    <div className="absolute top-1/4 left-1/4 w-4 h-4 border-2 border-primary/20 rounded animate-pulse-subtle"
                         style={{ animationDelay: '0s', animationDuration: '3s' }} />
                    <div className="absolute top-3/4 right-1/4 w-3 h-3 border-2 border-accent/20 rounded animate-pulse-subtle"
                         style={{ animationDelay: '1s', animationDuration: '3s' }} />
                    <div className="absolute bottom-1/3 left-1/3 w-5 h-5 border-2 border-success/20 rounded animate-pulse-subtle"
                         style={{ animationDelay: '2s', animationDuration: '3s' }} />

                    {/* Connecting lines (subtle) */}
                    <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                        <line x1="25%" y1="25%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1" className="text-primary animate-pulse-subtle" />
                        <line x1="75%" y1="75%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1" className="text-accent animate-pulse-subtle" />
                        <line x1="33%" y1="66%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1" className="text-success animate-pulse-subtle" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

import { Loader2, Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Main Spinner */}
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full blur-2xl opacity-30 animate-pulse" />

          {/* Rotating gradient ring */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
            <div className="relative bg-background rounded-full p-1 m-1">
              <div className="bg-gradient-to-br from-card via-card/80 to-card rounded-full p-8 backdrop-blur-xl border border-border/50 shadow-2xl">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
            </div>
          </div>

          {/* Floating sparkles */}
          <div className="absolute -top-4 -right-4 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2s' }}>
            <Sparkles className="h-6 w-6 text-primary/50" />
          </div>
          <div className="absolute -bottom-4 -left-4 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '2s' }}>
            <Sparkles className="h-6 w-6 text-purple-500/50" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-3 animate-pulse">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Loading
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Preparing your experience...
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}

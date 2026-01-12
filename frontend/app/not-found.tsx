import Link from 'next/link';
import { Home, Search, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 text-center">
        {/* 404 with floating animation */}
        <div className="relative mb-8">
          <h1 className="text-9xl md:text-[12rem] font-bold bg-gradient-to-br from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
            404
          </h1>
          <div className="absolute -top-6 -right-6 animate-bounce">
            <Sparkles className="h-12 w-12 text-primary/50" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Page Not Found
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Oops! The page you're looking for seems to have wandered off into the blockchain.
            It might have been moved, deleted, or never existed.
          </p>
        </div>

        {/* Suggestions Card */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center justify-center gap-2">
              <Search className="h-4 w-4" />
              Here's what you can do
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-sm mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Check the URL for typos or errors</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Go back to the homepage and navigate from there</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Use the navigation menu to find what you need</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <Button
            asChild
            size="lg"
            variant="gradient"
            className="group"
          >
            <Link href="/">
              <Home className="h-5 w-5 transition-transform group-hover:scale-110" />
              Back to Home
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="group"
          >
            <Link href="javascript:history.back()">
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              Go Back
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <p className="mt-12 text-sm text-muted-foreground/70 animate-in fade-in duration-700 delay-700">
          If you believe this is a mistake, please let us know.
        </p>
      </div>
    </div>
  );
}

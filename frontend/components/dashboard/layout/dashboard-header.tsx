'use client';

import { Search, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { WalletConnect } from '@/components/wallet/wallet-connect';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  className?: string;
}

export function DashboardHeader({ className }: DashboardHeaderProps) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'transition-all duration-300',
        className
      )}
      style={{
        marginLeft: sidebarCollapsed ? '5rem' : '16rem',
      }}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search auctions..."
              className="w-full pl-10 pr-4 h-10 bg-muted/50 border-border/50 focus:bg-background"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {/* Notification Badge (example) */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Wallet Connect / User Menu */}
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}

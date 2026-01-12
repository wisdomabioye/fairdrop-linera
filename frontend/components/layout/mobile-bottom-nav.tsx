'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, LayoutDashboard, Plus, Gavel, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import { APP_ROUTES } from '@/config/app.route';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { setMobileMenuOpen } = useUIStore();

  // Always show all nav items
  const navItems = [
    { name: 'Explore', href: APP_ROUTES.home, icon: Compass, show: true },
    { name: 'Dashboard', href: APP_ROUTES.bidSummary, icon: LayoutDashboard, show: true },
    { name: 'Create', href: APP_ROUTES.creatorCreate, icon: Plus, show: true, highlight: true },
    { name: 'Auctions', href: APP_ROUTES.creatorAuctions, icon: Gavel, show: true },
    { name: 'Menu', href: '#', icon: Menu, show: true, action: () => setMobileMenuOpen(true) },
  ].filter(item => item.show);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 shadow-lg">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          if (item.action) {
            return (
              <button
                key={item.name}
                onClick={item.action}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all',
                  'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.name}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                item.highlight && !isActive && 'text-primary'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5',
                item.highlight && !isActive && 'stroke-2'
              )} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
	
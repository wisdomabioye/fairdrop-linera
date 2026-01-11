'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Compass,
  Zap,
  CheckCircle,
  LayoutDashboard,
  TrendingUp,
  Trophy,
  Gavel,
  BarChart,
  Wallet,
  Plus,
  Droplet,
  ChevronLeft,
  Rocket,
  LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AppLogo } from '@/components/layout/logo';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
  show?: boolean; // Conditional display
}

interface DashboardSidebarProps {
  className?: string;
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  // Navigation sections - Always show all sections
  const navigation: NavSection[] = [
    {
      title: 'Discover',
      show: true,
      items: [
        { name: 'Explore Auctions', href: '/', icon: Compass },
        { name: 'Ending Soon', href: '/?filter=ending-soon', icon: Zap },
        { name: 'Recently Settled', href: '/?filter=settled', icon: CheckCircle },
      ],
    },
    {
      title: 'My Activity',
      show: true,
      items: [
        { name: 'My Dashboard', href: '/my', icon: LayoutDashboard },
        { name: 'My Bids', href: '/my/bids', icon: TrendingUp },
        { name: 'My Wins', href: '/my/settlements', icon: Trophy },
      ],
    },
    {
      title: 'Creator',
      show: true,
      items: [
        { name: 'My Auctions', href: '/creator/auctions', icon: Gavel },
        { name: 'Analytics', href: '/creator/analytics', icon: BarChart },
        { name: 'Withdrawals', href: '/creator/withdrawals', icon: Wallet },
      ],
    },
  ];

  const isActiveRoute = (href: string) => {
    // Split href into path and query
    const [hrefPath, hrefQuery] = href.split('?');

    // Check pathname match first
    if (pathname !== hrefPath) {
      return false;
    }

    // Build current full path with query params
    const currentQuery = searchParams.toString();
    const currentFullPath = currentQuery ? `${pathname}?${currentQuery}` : pathname;

    // Compare full URLs (path + query)
    return currentFullPath === href;
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out',
        'bg-card border-r border-border/50 shadow-lg',
        sidebarCollapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo & Collapse Toggle */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
          <AppLogo />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              'h-8 w-8 transition-transform',
              sidebarCollapsed && 'rotate-180 mx-auto mt-2'
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {navigation.map((section) => {
            if (!section.show) return null;

            return (
              <div key={section.title} className="space-y-2">
                {!sidebarCollapsed && (
                  <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}

                {section.items.map((item) => {
                  const isActive = isActiveRoute(item.href);

                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                          sidebarCollapsed && 'justify-center'
                        )}
                      >
                        <item.icon className={cn(
                          'h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110',
                          isActive && 'text-primary-foreground'
                        )} />
                        {!sidebarCollapsed && (
                          <span className="flex-1">{item.name}</span>
                        )}
                        {!sidebarCollapsed && item.badge && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/20 text-primary">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}

                {/* Creator Get Started CTA */}
                {section.title === 'Creator' && (
                  <Link href="/creator/get-started">
                    <div className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      'bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30',
                      'hover:from-primary/20 hover:to-primary/10 hover:border-primary/50 hover:shadow-md',
                      'text-primary group',
                      sidebarCollapsed && 'justify-center'
                    )}>
                      <Rocket className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      {!sidebarCollapsed && (
                        <span>Get Started</span>
                      )}
                    </div>
                  </Link>
                )}
              </div>
            );
          })}

          {sidebarCollapsed && <Separator className="my-4" />}
        </nav>

        {/* Actions Section (Bottom) */}
        <div className="p-4 border-t border-border/50 space-y-2">
          {!sidebarCollapsed && (
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Actions
            </h3>
          )}

          {/* Create Auction - Prominent Button */}
          <Link href="/create-auction">
            <Button
              className={cn(
                'w-full gap-2 shadow-md hover:shadow-lg transition-all',
                sidebarCollapsed && 'px-0'
              )}
              size={sidebarCollapsed ? 'icon' : 'default'}
            >
              <Plus className="h-4 w-4" />
              {!sidebarCollapsed && <span>Create Auction</span>}
            </Button>
          </Link>

          {/* Faucet Link */}
          <Link href="/faucet">
            <div
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                'text-muted-foreground hover:bg-muted/50 hover:text-foreground group',
                sidebarCollapsed && 'justify-center'
              )}
            >
              <Droplet className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
              {!sidebarCollapsed && <span>Faucet</span>}
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}

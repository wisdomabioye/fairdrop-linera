'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Plus,
  Droplet,
  ChevronLeft,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AppLogo } from '@/components/layout/logo';
import { useUIStore } from '@/store/ui-store';
import { navigation } from './nav-link';
import { APP_ROUTES } from '@/config/app.route';

interface DashboardSidebarProps {
  className?: string;
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  

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

                {/* Collector How-bid-works CTA */}
                {section.title === 'Collector' && (
                  <Link href={APP_ROUTES.howBidWorks}>
                    <div className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      'bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/30',
                      'hover:from-accent/20 hover:to-accent/10 hover:border-accent/50 hover:shadow-md',
                      'text-accent group',
                      sidebarCollapsed && 'justify-center'
                    )}>
                      <Rocket className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      {!sidebarCollapsed && (
                        <span>How Bid Works</span>
                      )}
                    </div>
                  </Link>
                )}

                {/* Creator Get Started CTA */}
                {section.title === 'Creator' && (
                  <Link href={APP_ROUTES.creatorGetStarted}>
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
          <Link href={APP_ROUTES.creatorCreate}>
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
          <Link href={APP_ROUTES.faucet}>
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
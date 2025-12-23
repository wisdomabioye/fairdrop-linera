'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Rocket,
  X,
  LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AppLogo } from '@/components/layout/logo';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
  show?: boolean;
}

export function MobileSidebarDrawer() {
  const pathname = usePathname();
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  // Always show all navigation sections
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

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <DrawerContent className="h-[85vh]">
        <DrawerHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <DrawerTitle>
              <AppLogo />
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto p-4 space-y-6">
          {navigation.map((section) => {
            if (!section.show) return null;

            return (
              <div key={section.title} className="space-y-2">
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>

                {section.items.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                    >
                      <div
                        className={cn(
                          'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}

                {section.title === 'Creator' && (
                  <Link href="/creator/get-started" onClick={handleLinkClick}>
                    <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 hover:from-primary/20 hover:to-primary/10 text-primary">
                      <Rocket className="h-5 w-5 flex-shrink-0" />
                      <span>Get Started</span>
                    </div>
                  </Link>
                )}
              </div>
            );
          })}

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Actions
            </h3>

            <Link href="/create-auction" onClick={handleLinkClick}>
              <Button className="w-full gap-2 shadow-md">
                <Plus className="h-4 w-4" />
                Create Auction
              </Button>
            </Link>

            <Link href="/faucet" onClick={handleLinkClick}>
              <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                <Droplet className="h-5 w-5 flex-shrink-0" />
                <span>Faucet</span>
              </div>
            </Link>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

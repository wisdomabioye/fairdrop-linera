'use client';

import { DashboardSidebar } from './dashboard-sidebar';
import { DashboardHeader } from './dashboard-header';
import { GlobalActivityBar } from './global-activity-bar';
import { MobileBottomNav } from './mobile-bottom-nav';
import { MobileSidebarDrawer } from './mobile-sidebar-drawer';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="relative min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>

      {/* Mobile Sidebar Drawer */}
      <div className="lg:hidden">
        <MobileSidebarDrawer />
      </div>

      {/* Main Content */}
      <div
        className={cn(
          'min-h-screen transition-all duration-300',
          'lg:ml-64',
          sidebarCollapsed && 'lg:ml-20'
        )}
      >
        {/* Header */}
        <DashboardHeader />

        {/* Global Activity Bar */}
        <GlobalActivityBar />

        {/* Page Content */}
        <main className={cn('p-6 pb-24 lg:pb-6', className)}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}

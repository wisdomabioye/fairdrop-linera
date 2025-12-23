'use client';

import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore, type ViewMode } from '@/store/ui-store';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  className?: string;
}

export function ViewToggle({ className }: ViewToggleProps) {
  const { viewMode, setViewMode } = useUIStore();

  return (
    <div className={cn(
      'inline-flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/50',
      className
    )}>
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('grid')}
        className={cn(
          'gap-2 transition-all',
          viewMode === 'grid'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'hover:bg-background/80'
        )}
        aria-label="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="text-xs font-medium">Grid</span>
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('list')}
        className={cn(
          'gap-2 transition-all',
          viewMode === 'list'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'hover:bg-background/80'
        )}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
        <span className="text-xs font-medium">List</span>
      </Button>
    </div>
  );
}

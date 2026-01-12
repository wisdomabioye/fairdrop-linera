/**
 * Auction Skeleton Components
 *
 * Loading skeleton components that match the AuctionCard layout
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AuctionCardSkeletonProps {
  className?: string;
}

/**
 * Skeleton loader that matches AuctionCard layout
 */
export function AuctionCardSkeleton({ className }: AuctionCardSkeletonProps = {}) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardHeader className="space-y-2">
        {/* Image Placeholder */}
        <Skeleton className="w-full h-40 rounded-lg" />

        {/* Item Name */}
        <Skeleton className="h-6 w-3/4" />

        {/* Current Price */}
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Countdown */}
        <Skeleton className="h-4 w-24" />

        {/* Supply Progress */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-3 w-12 ml-auto" />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export interface AuctionSkeletonGridProps {
  count?: number;
  className?: string;
}

/**
 * Grid of skeleton cards for list loading states
 */
export function AuctionSkeletonGrid({ count = 6, className }: AuctionSkeletonGridProps = {}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <AuctionCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Compact skeleton for list items
 */
export function AuctionListItemSkeleton({ className }: AuctionCardSkeletonProps = {}) {
  return (
    <div className={cn('flex items-center gap-4 p-4 border rounded-lg animate-pulse', className)}>
      <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

/**
 * Skeleton for table row that matches AuctionTable layout
 */
export function AuctionTableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-4 py-4">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-4 py-4">
        <Skeleton className="h-4 w-28" />
      </td>
      <td className="px-4 py-4">
        <Skeleton className="h-4 w-12" />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </td>
    </tr>
  );
}

export interface AuctionSkeletonTableProps {
  count?: number;
}

/**
 * Table skeleton that matches AuctionTable structure
 */
export function AuctionSkeletonTable({ count = 6 }: AuctionSkeletonTableProps = {}) {
  return (
    <div className="w-full border border-border/50 rounded-xl overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Auction
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Time Remaining
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Supply
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bids
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border/30">
            {Array.from({ length: count }).map((_, index) => (
              <AuctionTableRowSkeleton key={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

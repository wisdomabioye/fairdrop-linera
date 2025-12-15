'use client';

import { useState } from 'react';
import { History, Droplet, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTokenAmount } from '@/lib/utils/auction-utils';

export interface MintRecord {
  id: string;
  amount: string;
  tokenSymbol: string;
  timestamp: Date;
}

export interface MintHistoryProps {
  records: MintRecord[];
  maxVisible?: number;
  className?: string;
}

export function MintHistory({
  records,
  maxVisible = 5,
  className,
}: MintHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (records.length === 0) {
    return null;
  }

  const visibleRecords = isExpanded ? records : records.slice(0, maxVisible);
  const hasMore = records.length > maxVisible;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    if (seconds > 5) return `${seconds}s ago`;
    return 'Just now';
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Recent Mints</h3>
          <span className="text-xs text-muted-foreground">({records.length})</span>
        </div>
      </div>

      <div className="space-y-2">
        {visibleRecords.map((record, index) => (
          <div
            key={record.id}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition-all',
              'animate-in fade-in slide-in-from-top-1',
              index === 0 && 'border-primary/30 bg-primary/5'
            )}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  index === 0 ? 'bg-primary/20' : 'bg-muted'
                )}
              >
                <Droplet
                  className={cn('w-4 h-4', index === 0 ? 'text-primary' : 'text-muted-foreground')}
                />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  +{formatTokenAmount(record.amount, 0, 0)} {record.tokenSymbol}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(record.timestamp)}</span>
                </div>
              </div>
            </div>

            {index === 0 && (
              <div className="px-2 py-1 rounded-md bg-success/10 border border-success/20">
                <span className="text-xs font-medium text-success">Latest</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show {records.length - maxVisible} More
            </>
          )}
        </button>
      )}
    </div>
  );
}

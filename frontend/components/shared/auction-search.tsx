'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { useAuctionStore } from '@/store/auction-store';
import { APP_ROUTES } from '@/config/app.route';
import { AuctionStatus, type AuctionSummary } from '@/lib/gql/types';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface AuctionSearchProps {
  className?: string;
  maxResults?: number;
}

const statusConfig = {
  [AuctionStatus.Active]: {
    icon: TrendingUp,
    color: 'bg-success/10 text-success border-success/20',
  },
  [AuctionStatus.Scheduled]: {
    icon: Clock,
    color: 'bg-info/10 text-info border-info/20',
  },
  [AuctionStatus.Settled]: {
    icon: CheckCircle2,
    color: 'bg-muted text-muted-foreground border-border',
  },
  [AuctionStatus.Cancelled]: {
    icon: CheckCircle2,
    color: 'bg-muted text-muted-foreground border-border',
  },
};

// Memoized search results component to prevent re-renders
const SearchResults = React.memo(({
  filteredAuctions,
  search,
  onSelectAuction
}: {
  filteredAuctions: AuctionSummary[];
  search: string;
  onSelectAuction: (auctionId: number) => void;
}) => {
  return (
    <Command shouldFilter={false} className="border-none">
      <CommandList className="max-h-[400px]">
        <CommandEmpty className="py-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <Search className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No auctions found' : 'Start typing to search auctions'}
            </p>
          </div>
        </CommandEmpty>
        {filteredAuctions.length > 0 && (
          <CommandGroup heading="Search Results" className="p-2">
            {filteredAuctions.map((auction) => {
              const StatusIcon = statusConfig[auction.status]?.icon || TrendingUp;
              const statusColor = statusConfig[auction.status]?.color || statusConfig[AuctionStatus.Active].color;

              return (
                <CommandItem
                  key={auction.auctionId}
                  value={String(auction.auctionId)}
                  onSelect={() => onSelectAuction(auction.auctionId)}
                  className="cursor-pointer rounded-lg p-3 hover:bg-muted/50 transition-colors duration-150 mb-1"
                >
                  <div className="flex items-center gap-3 w-full min-w-0">
                    {/* Auction Image */}
                    <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                      {auction.image ? (
                        <Image
                          src={auction.image}
                          alt={auction.itemName}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <StatusIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Auction Info */}
                    <div className="flex flex-col flex-1 min-w-0 gap-1">
                      <span className="font-medium truncate text-sm">
                        {auction.itemName}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">ID: {auction.auctionId}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs px-1.5 py-0 h-5 font-normal',
                            statusColor
                          )}
                        >
                          {auction.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
});

SearchResults.displayName = 'SearchResults';

export function AuctionSearch({ className, maxResults = 6 }: AuctionSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Use a selector to only subscribe to what we need, not the entire store
  const allAuctionsCache = useAuctionStore((state) => state.allAuctionsCache);

  // Convert cache to array only when search changes (not on every cache update)
  const filteredAuctions = React.useMemo(() => {
    if (!search.trim()) {
      return [];
    }

    const searchLower = search.toLowerCase();
    const allAuctions = Array.from(allAuctionsCache.values())
      .filter((entry) => entry.data !== null)
      .map((entry) => entry.data!);

    return allAuctions
      .filter((auction) =>
        auction.itemName.toLowerCase().includes(searchLower)
      )
      .slice(0, maxResults);
  }, [search, maxResults]); // Removed allAuctionsCache from deps to prevent re-computation on every cache update

  const handleSelectAuction = React.useCallback((auctionId: number) => {
    setOpen(false);
    setSearch('');
    router.push(APP_ROUTES.auction(String(auctionId)));
  }, [router]);

  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (!open && value) {
      setOpen(true);
    }
  }, [open]);

  const handleInputFocus = React.useCallback(() => {
    if (search) {
      setOpen(true);
    }
  }, [search]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search auctions by name..."
        className="w-full pl-10 pr-4 h-10 bg-muted/50 border-border/50 focus:bg-background cursor-text transition-all duration-200 hover:bg-muted/70"
        value={search}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
      />

      <Popover open={open && search.length > 0} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="absolute inset-0 pointer-events-none" />
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[500px]"
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <SearchResults
            filteredAuctions={filteredAuctions}
            search={search}
            onSelectAuction={handleSelectAuction}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

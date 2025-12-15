'use client';

import { Coins, ChevronDown, Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { TokenInfo } from '@/config/app.token-store';

export interface TokenSelectorProps {
  tokens: TokenInfo[];
  selectedTokenId: string;
  onSelectToken: (tokenId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TokenSelector({
  tokens,
  selectedTokenId,
  onSelectToken,
  disabled = false,
  className,
}: TokenSelectorProps) {
  const selectedToken = tokens.find(t => t.appId === selectedTokenId);

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor="token-select" className="text-sm font-medium">
        Select Token
      </Label>

      <Select
        value={selectedTokenId}
        onValueChange={onSelectToken}
        disabled={disabled}
      >
        <SelectTrigger
          id="token-select"
          className={cn(
            'h-auto min-h-[4rem] px-4 py-3',
            'border-2 hover:border-primary/50 transition-all',
            'focus:ring-2 focus:ring-primary/20',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <SelectValue>
            {selectedToken ? (
              <div className="flex items-center gap-3 py-1">
                {/* Token Icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center">
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
                  {/* Sparkle indicator for popular tokens */}
                  {selectedToken.symbol === 'TKN' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Token Info */}
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-base text-foreground truncate">
                    {selectedToken.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedToken.symbol}
                  </p>
                </div>

                {/* Dropdown Icon */}
                <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
              </div>
            ) : (
              <span className="text-muted-foreground">Select a token...</span>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent className="max-h-[300px]">
          {tokens.map((token) => {
            const isSelected = token.appId === selectedTokenId;

            return (
              <SelectItem
                key={token.appId}
                value={token.appId}
                className={cn(
                  'px-3 py-3 cursor-pointer',
                  'focus:bg-primary/10 hover:bg-primary/5',
                  isSelected && 'bg-primary/10'
                )}
              >
                <div className="flex items-center gap-3 py-1">
                  {/* Token Icon */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center border transition-all',
                        isSelected
                          ? 'bg-gradient-to-br from-primary/30 to-primary/20 border-primary/50'
                          : 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20'
                      )}
                    >
                      <Coins
                        className={cn(
                          'h-5 w-5 transition-colors',
                          isSelected ? 'text-primary' : 'text-primary/70'
                        )}
                      />
                    </div>

                    {/* Sparkle for popular tokens */}
                    {token.symbol === 'TKN' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-sm">
                        <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base text-foreground truncate">
                        {token.name}
                      </p>
                      {token.symbol === 'TKN' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground">
                        {token.symbol}
                      </p>
                      {token.appId && (
                        <span className="text-xs text-muted-foreground/60 font-mono truncate max-w-[120px]">
                          {token.appId.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Helper Text */}
      {selectedToken && (
        <p className="text-xs text-muted-foreground pl-1">
          Chain ID: <span className="font-mono">{selectedToken.appId.slice(0, 16)}...</span>
        </p>
      )}
    </div>
  );
}

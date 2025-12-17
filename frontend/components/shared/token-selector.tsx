'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { TokenInfo } from '@/config/app.token-store';

export interface TokenSelectorProps {
  tokens: TokenInfo[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  excludeTokenId?: string; // Token to exclude from the list
  error?: string;
  label?: string;
  showLabel?: boolean;
  helperText?: string;
  className?: string;
}

export function TokenSelector({
  tokens,
  value,
  onValueChange,
  disabled,
  placeholder = 'Select token...',
  excludeTokenId,
  error,
  label = 'Select Token',
  showLabel = false,
  helperText,
  className,
}: TokenSelectorProps) {
  const [open, setOpen] = useState(false);

  // Filter out excluded token
  const availableTokens = useMemo(() => {
    return excludeTokenId
      ? tokens.filter((token) => token.appId !== excludeTokenId)
      : tokens;
  }, [tokens, excludeTokenId]);

  const selectedToken = availableTokens.find((token) => token.appId === value);

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <Label htmlFor="token-select" className="text-sm font-medium">
          {label}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="token-select"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full h-auto min-h-[4rem] justify-between px-4 py-3',
              'border-2 hover:border-primary/50 transition-all',
              'focus-visible:ring-2 focus-visible:ring-primary/20',
              !value && 'text-muted-foreground',
              error && 'border-destructive hover:border-destructive',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {selectedToken ? (
              <div className="flex items-center gap-3 w-full py-1">
                {/* Token Icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center">
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
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
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span>{placeholder}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </div>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by name, symbol, or app ID..." />
            <CommandList>
              <CommandEmpty>No token found.</CommandEmpty>
              <CommandGroup>
                {availableTokens.map((token) => {
                  const isSelected = token.appId === value;

                  return (
                    <CommandItem
                      key={token.appId}
                      value={`${token.name} ${token.symbol} ${token.appId}`}
                      onSelect={() => {
                        onValueChange(token.appId);
                        setOpen(false);
                      }}
                      className={cn(
                        'px-3 py-3 cursor-pointer',
                        'hover:bg-primary/5',
                        isSelected && 'bg-primary/10'
                      )}
                    >
                      <div className="flex items-center gap-3 w-full py-1">
                        {/* Check Icon */}
                        <Check
                          className={cn(
                            'h-4 w-4 flex-shrink-0',
                            isSelected ? 'opacity-100 text-primary' : 'opacity-0'
                          )}
                        />

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
                        </div>

                        {/* Token Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base text-foreground truncate">
                            {token.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm text-muted-foreground">
                              {token.symbol}
                            </p>
                            <span className="text-xs text-muted-foreground/60 font-mono truncate">
                              {token.appId.slice(0, 12)}...
                            </span>
                          </div>
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Helper Text or Error */}
      {error ? (
        <p className="text-sm text-destructive pl-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground pl-1">{helperText}</p>
      ) : selectedToken ? (
        <p className="text-xs text-muted-foreground pl-1">
          App ID: <span className="font-mono">{selectedToken.appId.slice(0, 20)}...</span>
        </p>
      ) : null}
    </div>
  );
}

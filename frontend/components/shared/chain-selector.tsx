'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Network, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandGroup,
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

export type ChainType = 'public' | 'wallet';

export interface ChainOption {
  type: ChainType;
  label: string;
  description: string;
  available: boolean;
}

export interface ChainSelectorProps {
  value: ChainType;
  onValueChange: (value: ChainType) => void;
  publicChainAvailable?: boolean;
  walletChainAvailable?: boolean;
  disabled?: boolean;
  showLabel?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
}

const CHAIN_OPTIONS: Omit<ChainOption, 'available'>[] = [
  {
    type: 'public',
    label: 'Public Chain',
    description: 'View balances • Read-only',
  },
  {
    type: 'wallet',
    label: 'Wallet Chain',
    description: 'Mint & transfer tokens',
  },
];

export function ChainSelector({
  value,
  onValueChange,
  publicChainAvailable = true,
  walletChainAvailable = true,
  disabled,
  showLabel = true,
  label = 'Select Chain',
  error,
  helperText,
  className,
}: ChainSelectorProps) {
  const [open, setOpen] = useState(false);

  const chains: ChainOption[] = CHAIN_OPTIONS.map((chain) => ({
    ...chain,
    available:
      chain.type === 'public' ? publicChainAvailable : walletChainAvailable,
  }));

  const selectedChain = chains.find((chain) => chain.type === value);
  const ChainIcon = selectedChain?.type === 'wallet' ? Wallet : Network;

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <Label htmlFor="chain-select" className="text-sm font-medium">
          {label}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="chain-select"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full h-auto min-h-[4rem] justify-between px-4 py-3',
              'border-2 hover:border-primary/50 transition-all',
              'focus-visible:ring-2 focus-visible:ring-primary/20',
              error && 'border-destructive hover:border-destructive',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {selectedChain ? (
              <div className="flex items-center gap-3 w-full py-1">
                {/* Chain Icon */}
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border',
                      selectedChain.type === 'wallet'
                        ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/10 border-blue-500/30'
                        : 'bg-gradient-to-br from-purple-500/20 to-purple-500/10 border-purple-500/30'
                    )}
                  >
                    <ChainIcon
                      className={cn(
                        'h-5 w-5',
                        selectedChain.type === 'wallet'
                          ? 'text-blue-500'
                          : 'text-purple-500'
                      )}
                    />
                  </div>
                </div>

                {/* Chain Info */}
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-base text-foreground truncate">
                    {selectedChain.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedChain.description}
                  </p>
                </div>

                {/* Dropdown Icon */}
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-muted-foreground">Select chain...</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </div>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandList>
              <CommandGroup>
                {chains.map((chain) => {
                  const isSelected = chain.type === value;
                  const Icon = chain.type === 'wallet' ? Wallet : Network;

                  return (
                    <CommandItem
                      key={chain.type}
                      value={chain.type}
                      disabled={!chain.available}
                      onSelect={() => {
                        if (chain.available) {
                          onValueChange(chain.type);
                          setOpen(false);
                        }
                      }}
                      className={cn(
                        'px-3 py-3 cursor-pointer',
                        'hover:bg-primary/5',
                        isSelected && 'bg-primary/10',
                        !chain.available && 'opacity-50 cursor-not-allowed'
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

                        {/* Chain Icon */}
                        <div className="relative flex-shrink-0">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center border transition-all',
                              chain.type === 'wallet'
                                ? isSelected
                                  ? 'bg-gradient-to-br from-blue-500/30 to-blue-500/20 border-blue-500/50'
                                  : 'bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20'
                                : isSelected
                                ? 'bg-gradient-to-br from-purple-500/30 to-purple-500/20 border-purple-500/50'
                                : 'bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-5 w-5 transition-colors',
                                chain.type === 'wallet'
                                  ? isSelected
                                    ? 'text-blue-500'
                                    : 'text-blue-500/70'
                                  : isSelected
                                  ? 'text-purple-500'
                                  : 'text-purple-500/70'
                              )}
                            />
                          </div>
                        </div>

                        {/* Chain Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-base text-foreground truncate">
                              {chain.label}
                            </p>
                            {!chain.available && (
                              <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                                Unavailable
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {chain.description}
                          </p>
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && (
                          <div
                            className={cn(
                              'flex-shrink-0 w-2 h-2 rounded-full',
                              chain.type === 'wallet'
                                ? 'bg-blue-500'
                                : 'bg-purple-500'
                            )}
                          />
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
      ) : null}
    </div>
  );
}

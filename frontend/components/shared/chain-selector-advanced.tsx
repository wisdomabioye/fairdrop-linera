'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Check, ChevronsUpDown, Pencil, Eye } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ChainOption {
  chainId: string;
  label: string;
  canWrite: boolean;
}

export interface ChainSelectorAdvancedProps {
  value: string | null;
  onChainChange: (chainId: string, canWrite: boolean) => void;
  walletChainId: string | null;
  publicChainId: string | null;
  allowCustom?: boolean;
  disabled?: boolean;
  className?: string;
}

// Validation helper (moved outside component to avoid recreation)
const isValidChainId = (chainId: string): boolean => {
  return /^[a-f0-9]{32,64}$/i.test(chainId.trim());
};

// Truncate helper (moved outside)
const truncateChainId = (chainId: string): string => {
  return `${chainId.slice(0, 8)}...${chainId.slice(-8)}`;
};

export const ChainSelectorAdvanced = memo(function ChainSelectorAdvanced({
  value,
  onChainChange,
  walletChainId,
  publicChainId,
  allowCustom = true,
  disabled = false,
  className,
}: ChainSelectorAdvancedProps) {
  const [chains, setChains] = useState<ChainOption[]>([]);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Initialize default chains
  useEffect(() => {
    const defaultChains: ChainOption[] = [];

    if (walletChainId) {
      defaultChains.push({
        chainId: walletChainId,
        label: 'Wallet Chain',
        canWrite: true,
      });
    }

    if (publicChainId && publicChainId !== walletChainId) {
      defaultChains.push({
        chainId: publicChainId,
        label: 'Public Chain',
        canWrite: false,
      });
    }

    setChains(defaultChains);
  }, [walletChainId, publicChainId]);

  // Handle adding custom chain (memoized callback)
  const handleAddCustomChain = useCallback((chainId: string) => {
    const trimmedChainId = chainId.trim();

    if (!isValidChainId(trimmedChainId)) {
      toast.error('Invalid chain ID format');
      return;
    }

    setChains((prev) => {
      // Check if already exists
      if (prev.some((c) => c.chainId === trimmedChainId)) {
        toast.info('Chain already in list');
        return prev;
      }

      // Determine if this is the wallet chain
      const isWallet = trimmedChainId === walletChainId;

      const newChain: ChainOption = {
        chainId: trimmedChainId,
        label: isWallet ? 'Wallet Chain' : 'Custom Chain',
        canWrite: isWallet,
      };

      return [...prev, newChain];
    });

    // Select the newly added chain
    const isWallet = trimmedChainId === walletChainId;
    onChainChange(trimmedChainId, isWallet);
    setSearchValue('');
    setOpen(false);
    toast.success('Chain added');
  }, [walletChainId, onChainChange]);

  // Handle search input change (debounced validation)
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);

    // Auto-add if valid chain ID is pasted
    if (allowCustom && value.length >= 32 && isValidChainId(value)) {
      handleAddCustomChain(value);
    }
  }, [allowCustom, handleAddCustomChain]);

  // Handle chain selection
  const handleSelectChain = useCallback((chainId: string) => {
    const chain = chains.find((c) => c.chainId === chainId);
    if (chain) {
      onChainChange(chainId, chain.canWrite);
      setOpen(false);
      setSearchValue('');
    }
  }, [chains, onChainChange]);

  // Filter chains based on search
  const filteredChains = useMemo(() => {
    if (!searchValue) return chains;

    const lowerSearch = searchValue.toLowerCase();
    return chains.filter(
      (chain) =>
        chain.label.toLowerCase().includes(lowerSearch) ||
        chain.chainId.toLowerCase().includes(lowerSearch)
    );
  }, [chains, searchValue]);

  // Get selected chain (memoized)
  const selectedChain = useMemo(
    () => chains.find((c) => c.chainId === value),
    [chains, value]
  );

  // Show "Add custom chain" prompt
  const showAddPrompt = allowCustom && searchValue.length >= 32 && isValidChainId(searchValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between h-auto min-h-[3rem] px-3 py-2', className)}
        >
          {selectedChain ? (
            <div className="flex items-center gap-2 w-full py-1">
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{selectedChain.label}</span>
                  {selectedChain.canWrite ? (
                    <Badge variant="default" className="text-xs flex-shrink-0">
                      <Pencil className="h-3 w-3 mr-1" />
                      Write
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      <Eye className="h-3 w-3 mr-1" />
                      Read
                    </Badge>
                  )}
                </div>
                <code className="text-xs text-muted-foreground">
                  {truncateChainId(selectedChain.chainId)}
                </code>
              </div>
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
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or paste chain ID..."
            value={searchValue}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            <CommandEmpty>
              {showAddPrompt ? (
                <div className="p-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddCustomChain(searchValue)}
                  >
                    Add custom chain
                  </Button>
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {allowCustom ? 'Paste a valid chain ID to add' : 'No chains found'}
                </div>
              )}
            </CommandEmpty>

            <CommandGroup>
              {filteredChains.map((chain) => (
                <CommandItem
                  key={chain.chainId}
                  value={chain.chainId}
                  onSelect={() => handleSelectChain(chain.chainId)}
                  className="px-3 py-3 cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 flex-shrink-0',
                      value === chain.chainId ? 'opacity-100' : 'opacity-0'
                    )}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{chain.label}</span>
                      {chain.canWrite ? (
                        <Badge variant="default" className="text-xs">
                          <Pencil className="h-3 w-3 mr-1" />
                          Write
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          Read
                        </Badge>
                      )}
                    </div>
                    <code className="text-xs text-muted-foreground block truncate">
                      {truncateChainId(chain.chainId)}
                    </code>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

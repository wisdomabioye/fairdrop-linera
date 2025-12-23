'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Spinner } from '@/components/ui/spinner';
import { useAuctionMutations } from '@/hooks';
import { UIC_APP_ID } from '@/config/app.config';
import { millisecondsToMicroseconds, formatAbsoluteTime } from '@/lib/utils/auction-utils';
import { useLineraApplication, useWalletConnection } from 'linera-react-client';
import { useSyncStatus } from '@/providers';
import type { AuctionParam } from '@/lib/gql/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { APP_ROUTES } from '@/config/app.route';

export interface CreateAuctionFormProps {
  onSuccess?: (auctionId: string) => void;
  onCancel?: () => void;
}

export function CreateAuctionForm({
  onSuccess,
  onCancel
}: CreateAuctionFormProps) {
  const router = useRouter();
  const uicApp = useLineraApplication(UIC_APP_ID);
  const { isConnected, isConnecting, connect, address } = useWalletConnection();
  const { isWalletClientSyncing } = useSyncStatus();

  // Form state
  const [formData, setFormData] = useState({
    itemName: '',
    totalSupply: '',
    startPrice: '',
    floorPrice: '',
    priceDecayAmount: '',
    priceDecayInterval: '',
  });

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mutation hook
  const { createAuction, isCreating } = useAuctionMutations({
    uicApp: uicApp.app,
    onCreateSuccess: (auctionId) => {
      toast.success('Auction created successfully!', {
        description: ``
      });
      if (onSuccess) {
        onSuccess(auctionId);
      } else {
        router.push(APP_ROUTES.myAuctions);
      }
    },
    onError: (error) => {
      toast.error('Failed to create auction', {
        description: error.message
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic field validation
    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (!formData.totalSupply || parseInt(formData.totalSupply) < 1) {
      newErrors.totalSupply = 'Total supply must be at least 1';
    }

    if (!formData.startPrice || BigInt(formData.startPrice) <= BigInt(0)) {
      newErrors.startPrice = 'Start price must be greater than 0';
    }

    if (!formData.floorPrice || BigInt(formData.floorPrice) <= BigInt(0)) {
      newErrors.floorPrice = 'Floor price must be greater than 0';
    }

    if (!formData.priceDecayAmount || BigInt(formData.priceDecayAmount) <= BigInt(0)) {
      newErrors.priceDecayAmount = 'Price decay amount must be greater than 0';
    }

    if (!formData.priceDecayInterval || parseInt(formData.priceDecayInterval) < 1) {
      newErrors.priceDecayInterval = 'Price decay interval must be at least 1 second';
    }

    // Price validation
    if (formData.startPrice && formData.floorPrice) {
      if (BigInt(formData.floorPrice) > BigInt(formData.startPrice)) {
        newErrors.floorPrice = 'Floor price must be less than or equal to start price';
      }
    }

    // Date validation
    if (!startDate) {
      newErrors.startTime = 'Start time is required';
    }

    if (!endDate) {
      newErrors.endTime = 'End time is required';
    } else if (startDate && endDate.getTime() <= startDate.getTime()) {
      newErrors.endTime = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !startDate || !endDate || !uicApp.app) {
      return;
    }

    if (!isConnected || !uicApp.app.walletClient) {
      throw new Error('Please connect your wallet');
    }

    // Convert dates to microseconds
    const startTime = millisecondsToMicroseconds(startDate.getTime());
    const endTime = millisecondsToMicroseconds(endDate.getTime());

    const params: AuctionParam = {
      image: '',
      itemName: formData.itemName.trim(),
      totalSupply: parseInt(formData.totalSupply),
      startPrice: formData.startPrice,
      floorPrice: formData.floorPrice,
      priceDecayAmount: formData.priceDecayAmount,
      priceDecayInterval: parseInt(formData.priceDecayInterval),
      startTime,
      endTime,
      creator: address!
    };

    await createAuction(params);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Auction</CardTitle>
        <CardDescription>
          Set up a descending-price auction with uniform clearing
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name *</Label>
              <Input
                id="itemName"
                name="itemName"
                value={formData.itemName}
                onChange={handleInputChange}
                placeholder="e.g., Limited Edition NFT Collection"
                disabled={isCreating}
              />
              {errors.itemName && (
                <p className="text-sm text-destructive">{errors.itemName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalSupply">Total Supply *</Label>
              <Input
                id="totalSupply"
                name="totalSupply"
                type="number"
                min="1"
                value={formData.totalSupply}
                onChange={handleInputChange}
                placeholder="e.g., 1000"
                disabled={isCreating}
              />
              {errors.totalSupply && (
                <p className="text-sm text-destructive">{errors.totalSupply}</p>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pricing</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startPrice">Start Price (per unit of supply) *</Label>
                <Input
                  id="startPrice"
                  name="startPrice"
                  type="text"
                  value={formData.startPrice}
                  onChange={handleInputChange}
                  placeholder="e.g., 18"
                  disabled={isCreating}
                />
                {errors.startPrice && (
                  <p className="text-sm text-destructive">{errors.startPrice}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="floorPrice">Floor Price (per unit of supply) *</Label>
                <Input
                  id="floorPrice"
                  name="floorPrice"
                  type="text"
                  value={formData.floorPrice}
                  onChange={handleInputChange}
                  placeholder="e.g., 3"
                  disabled={isCreating}
                />
                {errors.floorPrice && (
                  <p className="text-sm text-destructive">{errors.floorPrice}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceDecayAmount">Price Decay Amount *</Label>
                <Input
                  id="priceDecayAmount"
                  name="priceDecayAmount"
                  type="text"
                  value={formData.priceDecayAmount}
                  onChange={handleInputChange}
                  placeholder="e.g., 1"
                  disabled={isCreating}
                />
                {errors.priceDecayAmount && (
                  <p className="text-sm text-destructive">{errors.priceDecayAmount}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceDecayInterval">Decay Interval (seconds) *</Label>
                <Input
                  id="priceDecayInterval"
                  name="priceDecayInterval"
                  type="number"
                  min="1"
                  value={formData.priceDecayInterval}
                  onChange={handleInputChange}
                  placeholder="e.g., 3000"
                  disabled={isCreating}
                />
                {errors.priceDecayInterval && (
                  <p className="text-sm text-destructive">{errors.priceDecayInterval}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 flex gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Price Decay Mechanism</p>
                <p>
                  The price will decrease by the decay amount every decay interval,
                  until it reaches the floor price.
                </p>
              </div>
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Timing</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <DateTimePicker
                  date={startDate}
                  setDate={setStartDate}
                  disabled={(date) => date < new Date(Date.now() - 86400000)}
                  formatDate={(date) => formatAbsoluteTime(date.getTime())}
                  disablePicker={isCreating}
                />
                {errors.startTime && (
                  <p className="text-sm text-destructive">{errors.startTime}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>End Time *</Label>
                <DateTimePicker
                  date={endDate}
                  setDate={setEndDate}
                  disabled={(date) => !startDate || date <= startDate}
                  formatDate={(date) => formatAbsoluteTime(date.getTime())}
                  disablePicker={isCreating}
                />
                {errors.endTime && (
                  <p className="text-sm text-destructive">{errors.endTime}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isCreating}
                className="flex-1"
              >
                Cancel
              </Button>
            )}

            {
              isConnected ?
              <Button
                type="submit"
                disabled={isCreating || !uicApp.app || isWalletClientSyncing}
                className={cn('gap-2', onCancel ? 'flex-1' : 'w-full')}
              >
                {isCreating ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Creating Auction...
                  </>
                ) :
                isWalletClientSyncing ?
                  <>
                    <Spinner className="h-4 w-4" />
                    Wallet is Syncing...
                  </>
                :
                (
                  'Create Auction'
                )}
              </Button>
              :
              <Button
                type="button"
                className={cn('gap-2', onCancel ? 'flex-1' : 'w-full')}
                onClick={() => connect()}
              >
                {isConnecting ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Connecting Wallet...
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </Button>
            }
            
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

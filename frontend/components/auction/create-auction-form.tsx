'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLineraApplication, useWalletConnection } from 'linera-react-client';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Spinner } from '@/components/ui/spinner';
import { useAuctionMutations } from '@/hooks';
import { millisecondsToMicroseconds, formatAbsoluteTime } from '@/lib/utils/auction-utils';
import { TokenSelector } from '@/components/shared';
import { ImageUpload } from '@/components/shared';
import { StepIndicator, type Step } from '@/components/shared';
import { AuctionPreview } from './auction-preview';
import { UIC_APP_ID } from '@/config/app.config';
import { APP_ROUTES } from '@/config/app.route';
import { getTokenList } from '@/config/app.token-store';
import { useSyncStatus } from '@/providers';
import type { AuctionParam } from '@/lib/gql/types';
import { cn } from '@/lib/utils';


export interface CreateAuctionFormProps {
  onSuccess?: (auctionId: string) => void;
  onCancel?: () => void;
}

const STEPS: Step[] = [
  { id: 'basic', name: 'Basic Info', description: 'Item details' },
  { id: 'pricing', name: 'Pricing', description: 'Price settings' },
  { id: 'config', name: 'Configuration', description: 'Tokens & timing' },
  { id: 'review', name: 'Review', description: 'Preview & create' },
];

export function CreateAuctionFormMultistep({
  onSuccess,
  onCancel
}: CreateAuctionFormProps) {
  const router = useRouter();
  const uicApp = useLineraApplication(UIC_APP_ID);
  const { isConnected, isConnecting, connect, address } = useWalletConnection();
  const { isWalletClientSyncing } = useSyncStatus();

  // Current step
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [formData, setFormData] = useState<Omit<AuctionParam, 'startTime' | 'endTime'>>({
    itemName: '',
    image: '',
    maxBidAmount: 0,
    auctionTokenApp: '',
    paymentTokenApp: '',
    totalSupply: 0,
    startPrice: '',
    floorPrice: '',
    priceDecayAmount: '',
    priceDecayInterval: 0,
    creator: ''
  });

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get available tokens
  const tokens = getTokenList();
  const paymentToken = tokens.find(t => t.appId === formData.paymentTokenApp);
  const auctionToken = tokens.find(t => t.appId === formData.auctionTokenApp);

  // Mutation hook
  const { createAuction, isCreating } = useAuctionMutations({
    uicApp: uicApp.app,
    onCreateSuccess: (auctionId) => {
      toast.success('Auction created successfully!');
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

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      // Basic Info validation
      if (!formData.itemName.trim()) {
        newErrors.itemName = 'Item name is required';
      }
      if (!formData.image.trim()) {
        newErrors.image = 'Image is required';
      }
      if (!formData.totalSupply || Number(formData.totalSupply) < 1) {
        newErrors.totalSupply = 'Total supply must be at least 1';
      }
    }

    if (step === 1) {
      // Pricing validation
      if (!formData.startPrice || BigInt(formData.startPrice) <= BigInt(0)) {
        newErrors.startPrice = 'Start price must be greater than 0';
      }
      if (!formData.floorPrice || BigInt(formData.floorPrice) <= BigInt(0)) {
        newErrors.floorPrice = 'Floor price must be greater than 0';
      }
      if (formData.startPrice && formData.floorPrice) {
        if (BigInt(formData.floorPrice) > BigInt(formData.startPrice)) {
          newErrors.floorPrice = 'Floor price must be less than or equal to start price';
        }
      }
      if (!formData.priceDecayAmount || BigInt(formData.priceDecayAmount) <= BigInt(0)) {
        newErrors.priceDecayAmount = 'Price decay amount must be greater than 0';
      }
      if (!formData.priceDecayInterval || Number(formData.priceDecayInterval) < 1) {
        newErrors.priceDecayInterval = 'Price decay interval must be at least 1 second';
      }
    }

    if (step === 2) {
      // Configuration validation
      if (!formData.paymentTokenApp.trim()) {
        newErrors.paymentTokenApp = 'Payment token is required';
      }
      if (!formData.auctionTokenApp.trim()) {
        newErrors.auctionTokenApp = 'Auction token is required';
      }
      if (formData.paymentTokenApp === formData.auctionTokenApp) {
        newErrors.auctionTokenApp = 'Auction token must be different from payment token';
      }
      if (formData.maxBidAmount < 0) {
        newErrors.maxBidAmount = 'Max bid amount cannot be negative';
      }
      if (!startDate) {
        newErrors.startTime = 'Start time is required';
      }
      if (!endDate) {
        newErrors.endTime = 'End time is required';
      } else if (startDate && endDate.getTime() <= startDate.getTime()) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate || !uicApp.app) {
      return;
    }

    if (!isConnected || !uicApp.app.walletClient) {
      throw new Error('Please connect your wallet');
    }

    // Convert dates to microseconds
    const startTime = millisecondsToMicroseconds(startDate.getTime());
    const endTime = millisecondsToMicroseconds(endDate.getTime());

    const params: AuctionParam = {
      itemName: formData.itemName.trim(),
      image: formData.image.trim(),
      maxBidAmount: Number(formData.maxBidAmount),
      totalSupply: Number(formData.totalSupply),
      startPrice: formData.startPrice,
      floorPrice: formData.floorPrice,
      priceDecayAmount: formData.priceDecayAmount,
      priceDecayInterval: Number(formData.priceDecayInterval),
      startTime,
      endTime,
      creator: address!,
      paymentTokenApp: formData.paymentTokenApp.trim(),
      auctionTokenApp: formData.auctionTokenApp.trim(),
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
        <div className="mt-6">
          <StepIndicator steps={STEPS} currentStep={currentStep} />
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
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
                  />
                  {errors.itemName && (
                    <p className="text-sm text-destructive">{errors.itemName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Item Image *</Label>
                  <ImageUpload
                    value={formData.image}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, image: value }));
                      if (errors.image) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.image;
                          return newErrors;
                        });
                      }
                    }}
                    error={errors.image}
                  />
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
                  />
                  {errors.totalSupply && (
                    <p className="text-sm text-destructive">{errors.totalSupply}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Number of units available in this auction
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pricing */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing Configuration</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startPrice">Start Price (per unit) *</Label>
                    <Input
                      id="startPrice"
                      name="startPrice"
                      type="text"
                      value={formData.startPrice}
                      onChange={handleInputChange}
                      placeholder="e.g., 18"
                    />
                    {errors.startPrice && (
                      <p className="text-sm text-destructive">{errors.startPrice}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="floorPrice">Floor Price (per unit) *</Label>
                    <Input
                      id="floorPrice"
                      name="floorPrice"
                      type="text"
                      value={formData.floorPrice}
                      onChange={handleInputChange}
                      placeholder="e.g., 3"
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
            </div>
          )}

          {/* Step 3: Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Token & Timing Configuration</h3>

                <div className="space-y-2">
                  <Label>Payment Token *</Label>
                  <TokenSelector
                    tokens={tokens}
                    value={formData.paymentTokenApp}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, paymentTokenApp: value }));
                      if (errors.paymentTokenApp) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.paymentTokenApp;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Select payment token..."
                    excludeTokenId={formData.auctionTokenApp}
                    error={errors.paymentTokenApp}
                  />
                  <p className="text-xs text-muted-foreground">
                    Token that bidders will use to pay for items
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Auction Token *</Label>
                  <TokenSelector
                    tokens={tokens}
                    value={formData.auctionTokenApp}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, auctionTokenApp: value }));
                      if (errors.auctionTokenApp) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.auctionTokenApp;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Select auction token..."
                    excludeTokenId={formData.paymentTokenApp}
                    error={errors.auctionTokenApp}
                  />
                  <p className="text-xs text-muted-foreground">
                    Token that will be distributed to winning bidders
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxBidAmount">Max Bid Amount (per bidder)</Label>
                  <Input
                    id="maxBidAmount"
                    name="maxBidAmount"
                    type="number"
                    min="0"
                    value={formData.maxBidAmount}
                    onChange={handleInputChange}
                    placeholder="0 for unlimited"
                  />
                  {errors.maxBidAmount && (
                    <p className="text-sm text-destructive">{errors.maxBidAmount}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Maximum amount each bidder can purchase (0 = unlimited)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time *</Label>
                    <DateTimePicker
                      date={startDate}
                      setDate={setStartDate}
                      disabled={(date) => date < new Date(Date.now() - 86400000)}
                      formatDate={(date) => formatAbsoluteTime(date.getTime())}
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
                    />
                    {errors.endTime && (
                      <p className="text-sm text-destructive">{errors.endTime}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && startDate && endDate && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Review Your Auction</h3>
              <AuctionPreview
                data={{
                  itemName: formData.itemName,
                  image: formData.image,
                  totalSupply: Number(formData.totalSupply),
                  startPrice: formData.startPrice,
                  floorPrice: formData.floorPrice,
                  priceDecayAmount: formData.priceDecayAmount,
                  priceDecayInterval: Number(formData.priceDecayInterval),
                  maxBidAmount: Number(formData.maxBidAmount),
                  startTime: millisecondsToMicroseconds(startDate.getTime()),
                  endTime: millisecondsToMicroseconds(endDate.getTime()),
                  paymentToken,
                  auctionToken,
                }}
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2 pt-4">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isCreating}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}

            {currentStep === 0 && onCancel && (
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

            {currentStep < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                className={cn('gap-2', currentStep === 0 && onCancel ? 'flex-1' : 'ml-auto')}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : isConnected ? (
              <Button
                type="submit"
                disabled={isCreating || !uicApp.app || isWalletClientSyncing}
                className="ml-auto gap-2"
              >
                {isCreating ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Creating Auction...
                  </>
                ) : isWalletClientSyncing ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Wallet is Syncing...
                  </>
                ) : (
                  'Create Auction'
                )}
              </Button>
            ) : (
              <Button
                type="button"
                className="ml-auto gap-2"
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
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

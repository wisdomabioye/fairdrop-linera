'use client';

import { Calendar, Clock, Coins, TrendingDown, Users, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatAbsoluteTime, microsecondsToMilliseconds } from '@/lib/utils/auction-utils';
import type { TokenInfo } from '@/config/app.token-store';

export interface AuctionPreviewData {
  itemName: string;
  image: string;
  totalSupply: number;
  startPrice: string;
  floorPrice: string;
  priceDecayAmount: string;
  priceDecayInterval: number;
  maxBidAmount: number;
  startTime: number; // microseconds
  endTime: number; // microseconds
  paymentToken?: TokenInfo;
  auctionToken?: TokenInfo;
}

export interface AuctionPreviewProps {
  data: AuctionPreviewData;
}

export function AuctionPreview({ data }: AuctionPreviewProps) {
  const formatPrice = (price: string | number) => {
    try {
      return BigInt(price).toLocaleString();
    } catch {
      return price.toString();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Image */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image */}
            {data.image && (
              <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={data.image}
                  alt={data.itemName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Basic Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-2xl font-bold">{data.itemName}</h3>
                <p className="text-muted-foreground mt-1">
                  Descending-price auction with uniform clearing
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Supply</p>
                    <p className="text-sm font-semibold">{data.totalSupply.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Max Bid Amount</p>
                    <p className="text-sm font-semibold">
                      {data.maxBidAmount === 0 ? 'Unlimited' : data.maxBidAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Details */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Pricing Details
          </h4>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Start Price</p>
              <p className="text-lg font-bold text-primary">
                {formatPrice(data.startPrice)} {data.paymentToken?.symbol || 'tokens'}
              </p>
              <p className="text-xs text-muted-foreground">per unit</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Floor Price</p>
              <p className="text-lg font-bold">
                {formatPrice(data.floorPrice)} {data.paymentToken?.symbol || 'tokens'}
              </p>
              <p className="text-xs text-muted-foreground">per unit</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Price Decay Amount
              </p>
              <p className="text-base font-semibold">
                {formatPrice(data.priceDecayAmount)} {data.paymentToken?.symbol || 'tokens'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Decay Interval
              </p>
              <p className="text-base font-semibold">{data.priceDecayInterval} seconds</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timing */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </h4>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Start Time</p>
              <p className="text-base font-semibold">
                {formatAbsoluteTime(microsecondsToMilliseconds(data.startTime))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Time</p>
              <p className="text-base font-semibold">
                {formatAbsoluteTime(microsecondsToMilliseconds(data.endTime))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tokens */}
      {(data.paymentToken || data.auctionToken) && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h4 className="font-semibold">Token Configuration</h4>
            <Separator />
            <div className="space-y-4">
              {data.paymentToken && (
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                    {data.paymentToken.symbol.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Payment Token</p>
                    <p className="text-sm font-semibold">{data.paymentToken.name}</p>
                    <p className="text-xs text-muted-foreground">{data.paymentToken.symbol}</p>
                    <p className="text-xs text-muted-foreground/70 font-mono truncate">
                      {data.paymentToken.appId}
                    </p>
                  </div>
                </div>
              )}
              {data.auctionToken && (
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                    {data.auctionToken.symbol.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Auction Token</p>
                    <p className="text-sm font-semibold">{data.auctionToken.name}</p>
                    <p className="text-xs text-muted-foreground">{data.auctionToken.symbol}</p>
                    <p className="text-xs text-muted-foreground/70 font-mono truncate">
                      {data.auctionToken.appId}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Auction Utility Functions
 *
 * Provides helper functions for auction-related calculations and formatting
 */

import { AuctionSummary, AuctionStatus } from '@/lib/gql/types';

// ============ TIMESTAMP CONVERSION UTILITIES ============
/**
 * Convert microseconds (from blockchain) to milliseconds (JavaScript standard)
 * Used when receiving timestamps from queries
 */
export function microsecondsToMilliseconds(microseconds: number): number {
  return Math.floor(microseconds / 1000);
}

/**
 * Convert milliseconds (JavaScript) to microseconds (for blockchain)
 * Used when sending timestamps to mutations
 */
export function millisecondsToMicroseconds(milliseconds: number): number {
  return milliseconds * 1000;
}

/**
 * Normalize auction timestamps from microseconds to milliseconds
 * This should be called on auction data received from the backend
 */
export function normalizeAuctionTimestamps(auction: AuctionSummary): AuctionSummary {
  return {
    ...auction,
    startTime: microsecondsToMilliseconds(auction.startTime),
    endTime: microsecondsToMilliseconds(auction.endTime),
  };
}

/**
 * Normalize bid record timestamp from microseconds to milliseconds
 */
export function normalizeBidTimestamp(timestamp: number): number {
  return microsecondsToMilliseconds(timestamp);
}

// ============ PRICE CALCULATION ============
/**
 * Calculate the current price of an auction at a given timestamp
 * Accounts for price decay over time
 *
 * NOTE: Expects timestamps in milliseconds (already normalized)
 */
export function calculateCurrentPrice(
  auction: AuctionSummary,
  timestamp: number = Date.now()
): string {
  const {
    startPrice,
    floorPrice,
    priceDecayAmount,
    priceDecayInterval,
    startTime,
    status
  } = auction;

  // If auction hasn't started yet, return start price
  if (timestamp < startTime) {
    return startPrice;
  }

  // If auction is settled or ended, use the final current price from summary
  if (status === AuctionStatus.Settled || status === AuctionStatus.Ended) {
    return auction.currentPrice || floorPrice;
  }

  // Calculate time elapsed since auction start (in milliseconds)
  const elapsed = timestamp - startTime;

  // Calculate number of decay intervals that have passed
  // priceDecayInterval is in seconds, convert to milliseconds
  const intervals = Math.floor(elapsed / (priceDecayInterval * 1000));

  // Calculate total decay
  const decay = BigInt(priceDecayAmount) * BigInt(intervals);

  // Calculate current price
  const currentPrice = BigInt(startPrice) - decay;

  // Price cannot go below floor price
  return currentPrice < BigInt(floorPrice)
    ? floorPrice
    : currentPrice.toString();
}

// ============ TIME FORMATTING ============
/**
 * Format remaining time in human-readable format
 * Returns strings like "2d 5h 30m" or "5h 30m 15s"
 *
 * NOTE: Expects endTime in milliseconds (already normalized)
 */
export function formatTimeRemaining(endTime: number): string {
  const now = Date.now();
  const remaining = endTime - now;

  if (remaining <= 0) {
    return 'Ended';
  }

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 *
 * NOTE: Expects timestamp in milliseconds (already normalized)
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 0) return `${seconds}s ago`;
  return 'just now';
}

/**
 * Format absolute timestamp to readable date
 * e.g., "Jan 15, 2025 3:30 PM"
 *
 * NOTE: Expects timestamp in milliseconds (already normalized)
 */
export function formatAbsoluteTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(timestamp));
}

// ============ STATUS AND BADGES ============
/**
 * Get badge configuration for auction status
 * Returns variant, text, and className for styling
 *
 * NOTE: Expects auction.endTime in milliseconds (already normalized)
 */
export function getAuctionStatusBadge(auction: AuctionSummary): {
  variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  text: string;
  className: string;
} {
  const now = Date.now();
  const { status, endTime } = auction;

  if (status === AuctionStatus.Active) {
    const timeRemaining = endTime - now;
    // Less than 1 hour remaining
    if (timeRemaining < 60 * 60 * 1000) {
      return {
        variant: 'warning',
        text: 'Ending Soon',
        className: 'gradient-auction-ending'
      };
    }
    return {
      variant: 'primary',
      text: 'Active',
      className: 'gradient-auction-active'
    };
  }

  if (status === AuctionStatus.Settled) {
    return {
      variant: 'success',
      text: 'Settled',
      className: 'gradient-auction-winning'
    };
  }

  if (status === AuctionStatus.Ended) {
    return {
      variant: 'secondary',
      text: 'Ended',
      className: ''
    };
  }

  if (status === AuctionStatus.Schedule) {
    return {
      variant: 'default',
      text: 'Scheduled',
      className: ''
    };
  }

  // Cancelled
  return {
    variant: 'destructive',
    text: 'Cancelled',
    className: ''
  };
}

// ============ ADDRESS FORMATTING ============
/**
 * Truncate blockchain address for display
 * e.g., "0x1234...5678"
 */
export function truncateAddress(
  address: string,
  start: number = 6,
  end: number = 4
): string {
  if (address.length <= start + end) {
    return address;
  }
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

// ============ TOKEN AMOUNT FORMATTING ============
/**
 * Format token amounts with proper decimals
 * Converts from wei-like values to human-readable format
 */
export function formatTokenAmount(
  amount: string,
  decimals: number = 18,
  maxDecimals: number = 4
): string {
  try {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const remainder = value % divisor;

    // If no remainder, just return whole number
    if (remainder === BigInt(0)) {
      return whole.toString();
    }

    // Format decimal part
    const decimalPart = remainder
      .toString()
      .padStart(decimals, '0')
      .slice(0, maxDecimals)
      .replace(/0+$/, ''); // Remove trailing zeros

    if (decimalPart.length === 0) {
      return whole.toString();
    }

    return `${whole}.${decimalPart}`;
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
}

// ============ SUPPLY CALCULATIONS ============
/**
 * Calculate the supply percentage sold
 * Returns a number between 0 and 100
 */
export function calculateSupplyPercentage(sold: number, totalSupply: number): number {
  if (totalSupply === 0) return 0;
  return Math.round((sold / totalSupply) * 100);
}

/**
 * Get color class for supply percentage
 * Used for progress bars and indicators
 */
export function getSupplyColor(percentage: number): string {
  if (percentage < 30) return 'bg-blue-500';
  if (percentage < 70) return 'bg-orange-500';
  return 'bg-green-500';
}

// ============ AUCTION STATUS CHECKS ============
/**
 * Check if auction is ending soon (less than 1 hour remaining)
 *
 * NOTE: Expects endTime in milliseconds (already normalized)
 */
export function isEndingSoon(endTime: number): boolean {
  const remaining = endTime - Date.now();
  return remaining > 0 && remaining < 60 * 60 * 1000;
}

/**
 * Check if auction is ending very soon (less than 5 minutes remaining)
 *
 * NOTE: Expects endTime in milliseconds (already normalized)
 */
export function isEndingVerySoon(endTime: number): boolean {
  const remaining = endTime - Date.now();
  return remaining > 0 && remaining < 5 * 60 * 1000;
}

// ============ BID CALCULATIONS ============
/**
 * Calculate total cost for a bid
 * quantity × currentPrice
 */
export function calculateBidCost(quantity: number, currentPrice: string): string {
  const price = BigInt(currentPrice);
  const total = price * BigInt(quantity);
  return total.toString();
}

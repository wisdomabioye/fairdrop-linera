/**
 * Application Route Configuration
 *
 * Centralized route definitions for the Fairdrop auction application
 */

export const APP_ROUTES = {
  home: '/',

  auction: (auctionId: string) => `/auctions/${auctionId}`,

  // Creator routes
  creator: '/creator',
  creatorAuctions: '/creator/auctions',
  creatorCreate: '/creator/create',
  creatorGetStarted: '/creator/get-started',
  // Bid routes
  bidSummary: '/my',
  myBids: '/my/bids',
  
  // Token routes
  faucet: '/faucet',
  walletBalance: '/token/wallet-balance',
  aacBalance: '/token/aac-balance',
} as const;

export type AppRoute = typeof APP_ROUTES[keyof typeof APP_ROUTES];
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
  howBidWorks: '/how-bid-works',
  // Token routes
  faucet: '/faucet',
  myToken: '/token/my-tokens',
  aacBalance: '/token/aac-balance',
} as const;

export type AppRoute = typeof APP_ROUTES[keyof typeof APP_ROUTES];
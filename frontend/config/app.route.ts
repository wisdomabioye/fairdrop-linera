/**
 * Application Route Configuration
 *
 * Centralized route definitions for the Fairdrop auction application
 */

export const APP_ROUTES = {
  home: '/',
  faucet: '/faucet',
  activeAuctions: '/active-auction',
  settledAuctions: '/settled-auction',
  createAuction: '/create-auction',
  myAuctions: '/my-auctions',
  auctionDetail: (id: string | number) => `/auctions/${id}`,
  auctionDetailLegacy: (id: string | number) => `/auction-detail?id=${id}`, // Keep old route for reference
} as const;

export type AppRoute = typeof APP_ROUTES[keyof typeof APP_ROUTES];
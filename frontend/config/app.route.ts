/**
 * Application Route Configuration
 *
 * Centralized route definitions for the Fairdrop auction application
 */

export const APP_ROUTES = {
  home: '/',
  activeAuctions: '/active-auction',
  settledAuctions: '/settled-auction',
  createAuction: '/create-auction',
  myAuctions: '/my-auctions',
  auctionDetail: (id: string | number) => `/auction-detail?id=${id}`,
} as const;

export type AppRoute = typeof APP_ROUTES[keyof typeof APP_ROUTES];
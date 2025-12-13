/** Indexer App Id */
export const INDEXER_APP_ID = process.env.NEXT_PUBLIC_INDEXER_APP!;
/** Auction app AAC App Id */
export const AUCTION_APP_ID = process.env.NEXT_PUBLIC_AAC_APP!;
/** UIC App Id - same as AAC App Id */
export const UIC_APP_ID = process.env.NEXT_PUBLIC_AAC_APP!;
/** The chain where AAC app is running */
export const AAC_CHAIN_ID = process.env.NEXT_PUBLIC_AAC_CHAIN!;
/** The indexer chain Id - can be initialize on most chains */
export const INDEXER_CHAIN_ID = process.env.NEXT_PUBLIC_INDEXER_CHAIN_ID!;

export interface AppInfo {
    name: string;
    title: string;
    description: string;
    tagline: string;
    email: string;
    version: string;
}

export const APP_INFO: AppInfo = {
    name: 'Fairdrop',
    title: 'Fairdrop - Fair Price Discovery Through Descending Auctions',
    description: 'Decentralized, transparent, and market-driven auction protocol using descending-price (Dutch-style) model with uniform clearing. Every participant pays the same fair price discovered by true market demand on Linera blockchain.',
    tagline: 'Fair Price Discovery for Web3',
    email: 'xpldevelopers@gmail.com',
    version: '1.0.0'
} as const;
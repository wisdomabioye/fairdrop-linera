/** Indexer App Id */
export const INDEXER_APP_ID = process.env.NEXT_PUBLIC_INDEXER_APP_ID!;
/** 
 * Auction app AAC App Id 
 * */
export const AAC_APP_ID = process.env.NEXT_PUBLIC_AAC_APP_ID!;
/** 
 * The chain where AAC app is running.
 * This is usually our public-chain
 * */
export const AAC_CHAIN_ID = process.env.NEXT_PUBLIC_AAC_CHAIN_ID!;
/** The indexer chain Id - can be initialize on most chains */
export const INDEXER_CHAIN_ID = process.env.NEXT_PUBLIC_INDEXER_CHAIN_ID!;

export interface AppInfo {
    name: string;
    title: string;
    description: string;
    tagline: string;
    email: string;
    version: string;
    logo: Record<string, string>
}

export const APP_INFO: AppInfo = {
    name: 'Fairdrop',
    title: 'Fairdrop - Fair Price Discovery Through Descending Auctions',
    description: 'Decentralized, transparent, and market-driven auction protocol using descending-price (Dutch-style) model with uniform clearing. Every participant pays the same fair price discovered by true market demand on Linera blockchain.',
    tagline: 'Fair Price Discovery for Web3',
    email: 'xpldevelopers@gmail.com',
    version: '1.0.0',
    logo: {
        favicon: '/logo/favicon.svg',
        fairdropThemed: '/logo/fairdrop-themed.svg',
        fairdropHorizontal: '/logo/fairdrop-full.svg',
        fairdropModern: '/logo/fairdrop-modern.svg',
        fairdropMono: '/logo/fairdrop.svg'
    }
} as const;
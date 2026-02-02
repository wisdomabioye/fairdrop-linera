type ApplicationId = string;

export type TokenInfo = {
    name: string;
    symbol: string;
    appId: string;
}


const LUSD_APP_ID = '0dd7d7cc44f6d39aefb523ff35799317171871f19ae7986188329bbe18d400df';
const FUSD_APP_ID = '94270beb3ed4cc20086ff7f7c93f136acba8f9593a26a7f28a2742b2d20a53b4';
const XUSD_APP_ID = '216cf9a3ba751985c3a3d2a1dd3932bf9d6056503ecca240e21f6539ebd1d9cd';
const SPL_APP_ID = '24ed70e663bf7da8e5ec128a8d5eae1b126de3b3857f610a3996505fa0065ca4';
const DIGI_APP_ID = '3c8bd6cbacc0ee6d028daba8dd4abd84b782077eb5f6a935ea3464729ee9efed';
const FAIR_APP_ID = '9bf7002f3a59f5899664f7cbcf4313cad6b3fb9057c3e4c0c04a55f26114e99d';

/** List of supported tokens for auction payment */
export const PAYMENT_TOKEN: Record<ApplicationId, TokenInfo> = {
    [LUSD_APP_ID]: {
        name: 'LN USD Token [Payment]',
        symbol: 'LUSD',
        appId: LUSD_APP_ID,
    },
    [FUSD_APP_ID]: {
        name: 'fUSD Token [Payment]',
        symbol: 'fUSD',
        appId: FUSD_APP_ID,
    },
    [XUSD_APP_ID]: {
        name: 'xUSD Token [Payment]',
        symbol: 'xUSD',
        appId: XUSD_APP_ID,
    }
} as const

/** List of token that can be auctioned (for development purpose) */
export const AUCTION_TOKEN: Record<ApplicationId, TokenInfo> = {
    [SPL_APP_ID]: {
        name: 'SPleen Token [Auction]',
        symbol: 'SPL',
        appId: SPL_APP_ID,
    },
    [DIGI_APP_ID]: {
        name: 'DIGI Token [Auction]',
        symbol: 'DIGI',
        appId: DIGI_APP_ID,
    },
    [FAIR_APP_ID]: {
        name: 'Fair Token [Auction]',
        symbol: 'FAIR',
        appId: FAIR_APP_ID,
    }
} as const


export const TOKEN_STORE: Record<ApplicationId, TokenInfo> = {
    ...PAYMENT_TOKEN,
    ...AUCTION_TOKEN
}

export const getTokenList = (): TokenInfo[] => {
    return Object.values(TOKEN_STORE);
}

export const getPaymentTokenList = (): TokenInfo[] => {
    return Object.values(PAYMENT_TOKEN);
}

export const getAuctionTokenList = (): TokenInfo[] => {
    return Object.values(AUCTION_TOKEN);
}

export const getTokenByIndex = (index: number): TokenInfo | undefined => {
    return Object.values(TOKEN_STORE)[index];
}

export const getTokenByAppId = (appId: string): TokenInfo => {
    return TOKEN_STORE[appId];
}


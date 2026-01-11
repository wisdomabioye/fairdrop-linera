type ApplicationId = string;

export type TokenInfo = {
    name: string;
    symbol: string;
    appId: string;
}


const LUSD_APP_ID = 'b1c4bab3cfd110483ccae7ce34f49d175001e4ca15e60c73b495e4d317f7296f';
const FUSD_APP_ID = 'bbc1f2463322145869dfbc92531ee8179f7fd33c3a4f1138824976dcb329bff6';
const XUSD_APP_ID = '441a74103ad629d68492dd3aef06527e5e0968e8d8bd6ebcda245d19753971bb';
const SPL_APP_ID = '88482a20daab9be60921e7d9bd8daa94753c779c855fac6e32890606122d11ec';
const DIGI_APP_ID = '3064eeb745aed61f14782c6bc4826e2d55712ca93f7805a86b8727f94a0afb75';
const FAIR_APP_ID = '1c2686a275dfa34110f483a755b048c1ed32f0b136d8a84ce52b4dd2df592d62';

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


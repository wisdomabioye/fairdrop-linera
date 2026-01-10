type ApplicationId = string;

export type TokenInfo = {
    name: string;
    symbol: string;
    appId: string;
}


const LUSD_APP_ID = '6f0b5c1c79c7a2f1f0bbd1ae1407788cbf02fcbe3c0d2f589f73d593bc3d31af';
const FUSD_APP_ID = '413b030e15c3ae91fe8379d5ad3fef7e30e5de36bfb6b4bf33febd2dceac84a7';
const XUSD_APP_ID = '07e95721ac98bca199d8fae91bb4cb19246195349a71ed9d86215996148b90aa';
const SPL_APP_ID = 'b1d4b85ce5d63e97a3134111aaf9be9e5e0e210078ae8e0395c8f3612b4a91ce';
const DIGI_APP_ID = 'c433e8e86d836f18d28eb111688b0f501ae3a32b9b07be11b07ffa041d4677c5';
const FAIR_APP_ID = 'a1178930ef5bf4d77cf8f34028b153575534b02dc9340367562333c566671523';

/** List of supported tokens for auction payment */
export const PAYMENT_TOKEN: Record<ApplicationId, TokenInfo> = {
    [LUSD_APP_ID]: {
        name: 'LN USD Token',
        symbol: 'LUSD',
        appId: LUSD_APP_ID,
    },
    [FUSD_APP_ID]: {
        name: 'fUSD Token',
        symbol: 'fUSD',
        appId: FUSD_APP_ID,
    },
    [XUSD_APP_ID]: {
        name: 'xUSD Token',
        symbol: 'xUSD',
        appId: XUSD_APP_ID,
    }
} as const

/** List of token that can be auctioned (for development purpose) */
export const AUCTION_TOKEN: Record<ApplicationId, TokenInfo> = {
    [SPL_APP_ID]: {
        name: 'SPleen Token',
        symbol: 'SPL',
        appId: SPL_APP_ID,
    },
    [DIGI_APP_ID]: {
        name: 'DIGI Token',
        symbol: 'DIGI',
        appId: DIGI_APP_ID,
    },
    [FAIR_APP_ID]: {
        name: 'Fair Token',
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


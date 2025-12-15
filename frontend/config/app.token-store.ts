type ApplicationId = string;

export type TokenInfo = {
    name: string;
    symbol: string;
    appId: string;
}

export const TOKEN_STORE: Record<ApplicationId, TokenInfo> = {
    [process.env.NEXT_PUBLIC_LUSD_APP_ID!]: {
        name: 'LN USD Token',
        symbol: 'LUSD',
        appId: process.env.NEXT_PUBLIC_LUSD_APP_ID!
    },
    [process.env.NEXT_PUBLIC_FUSD_APP_ID!]: {
        name: 'fUSD Token',
        symbol: 'fUSD',
        appId: process.env.NEXT_PUBLIC_FUSD_APP_ID!
    }
}

export const getTokenList = (): TokenInfo[] => {
    return Object.values(TOKEN_STORE);
}


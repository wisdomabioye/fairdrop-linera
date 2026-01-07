type ApplicationId = string;

export type TokenInfo = {
    name: string;
    symbol: string;
    appId: string;
    id: number
}


const LUSD_APP_ID = '90c35bf5f9f580bfe75c38f3fd6ec07e2386d43a3e561d9b9a3b47eabc96be2d';
const FUSD_APP_ID = 'b025bec560dffb150616b687b0aff00c94dd46f4448a5929e3c6d4b35712e386';

export const TOKEN_STORE: Record<ApplicationId, TokenInfo> = {
    [LUSD_APP_ID]: {
        name: 'LN USD Token',
        symbol: 'LUSD',
        appId: LUSD_APP_ID,
        id: 0,
    },
    [FUSD_APP_ID]: {
        name: 'fUSD Token',
        symbol: 'fUSD',
        appId: FUSD_APP_ID,
        id: 1
    }
}

export const getTokenList = (): TokenInfo[] => {
    return Object.values(TOKEN_STORE);
}

export const getTokenByIndex = (index: number): TokenInfo | undefined => {
    return Object.values(TOKEN_STORE).find(token => token.id === index);
}


import type { ApplicationClient } from 'linera-react-client';

/**
 * Normalized chain interface that abstracts wallet vs public chain differences
 */
export interface FungibleChain {
    query<T>(query: string): Promise<T>;
    mutate<T>(mutation: string): Promise<T>;
}

/**
 * Chain type discriminator
 */
export type FungibleChainType = 'wallet' | 'public';

/**
 * Creates a normalized chain adapter from either wallet or public client
 *
 * @param app - The application client instance
 * @param type - Either 'wallet' or 'public'
 * @returns A normalized chain with consistent query/mutate interface, or null if unavailable
 *
 * @example
 * ```typescript
 * // For wallet chain interactions
 * const walletChain = createFungibleChain(fungibleApp, 'wallet');
 *
 * // For public chain interactions
 * const publicChain = createFungibleChain(fungibleApp, 'public');
 * ```
 */
export function createFungibleChain(
    app: ApplicationClient | null,
    type: FungibleChainType
): FungibleChain | null {
    if (!app) return null;

    if (type === 'wallet') {
        if (!app.wallet) return null;
        return {
            query: <T>(query: string) => app.wallet!.query<T>(query),
            mutate: <T>(mutation: string) => app.wallet!.mutate<T>(mutation),
        };
    }

    // type === 'public'
    if (!app.public) return null;
    return {
        query: <T>(query: string) => app.public!.query<T>(query),
        mutate: <T>(mutation: string) => app.public!.systemMutate<T>(mutation),
    };
}

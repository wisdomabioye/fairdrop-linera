'use client'

/** Eagerly load needed data needed as soon as page loaded and linera is ready */
import { useLineraClient, useLineraApplication } from 'linera-react-client';
// import { useSyncStatus } from './sync-provider';
import { 
    useCachedActiveAuctions,
    useCachedSettledAuctions,
    useCachedAuctionsByCreator,
    // useFungibleQuery,
} from '@/hooks';
import { AAC_APP_ID } from '@/config/app.config';

export function EagerLoader({
    children
}: {
    children: React.ReactNode;
}) {
    const aacApp = useLineraApplication(AAC_APP_ID);
    const { /* isInitialized, isConnected, */ walletAddress } = useLineraClient();
    // const { isPublicClientSyncing, isWalletClientSyncing } = useSyncStatus();
    
    useCachedActiveAuctions({
        aacApp: aacApp.app,
        limit: 10,
        offset: 0,
        skip: false,
        enablePolling: true,
    })

    useCachedSettledAuctions({
        aacApp: aacApp.app,
        limit: 10,
        offset: 0,
        skip: false,
        enablePolling: true,
    })

    useCachedAuctionsByCreator({
        creator: walletAddress ?? '',
        aacApp: aacApp.app,
        limit: 20,
        offset: 0,
        skip: !walletAddress,
        enablePolling: !!walletAddress,
    })


    return (
        children
    )
}
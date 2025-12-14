'use client';

// import { useEffect } from 'react';
// import { useLineraApplication } from 'linera-react-client';
import { /* useIndexerInitialization, */ useAuctionNotifications } from '@/hooks';
import {
    // INDEXER_APP_ID,
    // AAC_APP_ID,
} from '@/config/app.config';
// import { toast } from 'sonner';

export function IndexerProvider({ children }: { children: React.ReactNode }) {
    // const indexerApp = useLineraApplication(INDEXER_APP_ID);
    // const publicChainId = indexerApp.app?.publicClient.getChainId()!;

    // console.log('publicClient chainId: ', publicChainId)
    // Initialize indexer
    // const { initialized, initializing, error, recheck } = useIndexerInitialization({
    //     indexerChainId: publicChainId, // use the currently claimed chain
    //     aacChain: publicChainId, // use the currently claimed chain
    //     auctionApp: AAC_APP_ID,
    //     indexerApp: indexerApp.app
    // });

    // Listen to notifications and auto-revalidate
    useAuctionNotifications();

    // Show initialization toast
    // useEffect(() => {
    //     if (initializing) {
    //         toast.loading('Initializing indexer...', {
    //             id: 'indexer-init',
    //             description: 'Setting up auction indexing service'
    //         });
    //     }
    // }, [initializing]);

    // Show success toast
    // useEffect(() => {
    //     if (initialized) {
    //         toast.success('Indexer ready', {
    //             id: 'indexer-init',
    //             description: 'Auction data is now being indexed',
    //             duration: 2000
    //         });
    //     }
    // }, [initialized]);

    // Show error toast with retry button
    // useEffect(() => {
    //     if (error) {
    //         toast.error('Indexer initialization failed', {
    //             id: 'indexer-init',
    //             description: error.message,
    //             action: {
    //                 label: 'Retry',
    //                 onClick: () => recheck()
    //             },
    //             duration: Infinity // Keep error visible until dismissed or retried
    //         });
    //     }
    // }, [error, recheck]);

    // Always return children - don't block rendering
    return <>{children}</>;
}
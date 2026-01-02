import { useLineraChain, useLineraClient } from 'linera-react-client';
import { AAC_CHAIN_ID } from '@/config/app.config';

export function useChain() {
    const { walletChainId, /* publicChainId, */ isConnected, isInitialized } = useLineraClient();
    const publicChain = useLineraChain(AAC_CHAIN_ID);
    const walletChain = useLineraChain(walletChainId || ''); // returns null if wallet is not connected

    return {
        isConnected, isInitialized,
        publicChain: publicChain.chain,
        walletChain: walletChain.chain,
    };
}
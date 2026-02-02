import { useEffect } from 'react';
import { useAacApp } from './use-aac-app';
import { useAuctionMutations } from './use-auction-mutations';

export function useAacTrigger() {
    const aacApp = useAacApp();
    const { trigger } = useAuctionMutations({aacApp: aacApp.app});

    const _trigger = async() => {
        await trigger();
    }

    useEffect(() => {
    if (aacApp.app) {
        _trigger();
    }
    }, [aacApp.app])

    return null;
}
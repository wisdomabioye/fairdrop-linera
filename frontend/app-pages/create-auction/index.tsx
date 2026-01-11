'use client';

import { CreateAuctionFormMultistep } from '@/components/auction/create-auction-form';
import { useWalletConnection } from 'linera-react-client';
import { useAacApp, useAuctionMutations } from '@/hooks';
import { useAuctionStore } from '@/store/auction-store';

export default function CreateAuctionPage() {
    const aacApp = useAacApp();
    const { trigger } = useAuctionMutations({aacApp: aacApp.app});
    const { invalidateActiveAuctions, invalidateAuctionsByCreator } = useAuctionStore();
    const { address } = useWalletConnection();

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <CreateAuctionFormMultistep
                onSuccess={async() => {
                    await trigger();
                    if (address) {
                        invalidateAuctionsByCreator(address);
                        invalidateActiveAuctions
                    }
                }}
            />
        </div>
    );
}
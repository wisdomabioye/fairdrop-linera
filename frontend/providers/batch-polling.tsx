'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { getTokenList } from '@/config/app.token-store';
import {
    useUserPortfolio,
    useDashboard,
    useAacApp,
    type UseUserPortfolioResult,
    type UseDashboardResult,
} from '@/hooks';
import { useWalletConnection } from 'linera-react-client';

interface BatchPollingContextValue {
    userPortfolio: UseUserPortfolioResult;
    dashboardData: UseDashboardResult;
}

const BatchPollingContext = createContext<BatchPollingContextValue | null>(null);

export function useBatchPolling() {
    const context = useContext(BatchPollingContext);
    if (!context) {
        throw new Error('useBatchPolling must be used within a BatchPollingProvider');
    }
    return context;
}

export function BatchPollingProvider({children}: {children: ReactNode}) {
    const aacApp = useAacApp();
    const { address } = useWalletConnection();

    // Memoize tokenApps to prevent unnecessary re-renders
    const tokenApps = useMemo(() => getTokenList().map(t => t.appId), []);

    // Fetch current user batch data (balance, bids, auctions)
    const userPortfolio = useUserPortfolio({
        aacApp: aacApp.app,
        skip: !address || !aacApp,
        tokenApps,
        enablePolling: false,
        pollInterval: 30_000,
    });

    // Fetch dashboard data (stats, auctions)
    const dashboardData = useDashboard({
        aacApp: aacApp.app,
        offset: 0,
        limit: 20,
        enablePolling: false,
        pollInterval: 30_000,
    });

    // Memoize context value to prevent re-renders when data hasn't actually changed
    const contextValue = useMemo(() => ({
        userPortfolio,
        dashboardData,
    }), [
        // User portfolio data
        userPortfolio.allUserBids,
        userPortfolio.totalQuantity,
        userPortfolio.totalPaid,
        userPortfolio.creatorAuctions,
        userPortfolio.balances,
        userPortfolio.loading,
        userPortfolio.isFetching,
        userPortfolio.status,
        userPortfolio.error,
        userPortfolio.isStale,
        userPortfolio.refetch,
        userPortfolio.getBidsByAuctionId,
        // Dashboard data
        dashboardData.activeAuctions,
        dashboardData.globalStats,
        dashboardData.loading,
        dashboardData.isFetching,
        dashboardData.status,
        dashboardData.error,
        dashboardData.isStale,
        dashboardData.refetch,
    ]);

    return (
        <BatchPollingContext.Provider value={contextValue}>
            {children}
        </BatchPollingContext.Provider>
    );
}
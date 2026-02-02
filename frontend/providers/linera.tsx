'use client'
import { LineraProvider, LogLevel } from 'linera-react-client';
import { PageLoading, ErrorFallback } from '@/components/loading';
import { SyncProvider } from './sync-provider';
// import { EagerLoader } from './eager-loader';
import { BatchPollingProvider } from './batch-polling';

export function AppLineraProvider({ children }: {children: React.ReactNode}) {

  return (
    <LineraProvider
      faucetUrl={process.env.NEXT_PUBLIC_FAUCET_URL!}
      readOnlyWallet={{
        constantAddress: '0x0000000000000000000000000000000000000013'
      }}
      fallback={<PageLoading />}
      errorFallback={() => <ErrorFallback />}
      skipProcessInbox={false}
      logging={{
        enabled: true,
        level: LogLevel.DEBUG
      }}
    >
      <SyncProvider>
        {/* <EagerLoader> */}
        <BatchPollingProvider>
          {children}
        </BatchPollingProvider>
        {/* </EagerLoader> */}
      </SyncProvider>
    </LineraProvider>
  )
}
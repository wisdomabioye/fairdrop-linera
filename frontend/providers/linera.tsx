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
      logging={{
        enabled: true,
        level: LogLevel.DEBUG
      }}

      // Linera Client config
      init={{
        skipProcessInbox: false,
        cacheTtlMs: 500,
        cacheMaxSize: 1,
        maxRequestTtlMs: 200,
        sendTimeout: { secs: 5, nanos: 0 },
        recvTimeout: { secs: 10, nanos: 0 },
        retryDelay: { secs: 1, nanos: 0 },
        maxRetries: 10,
        allowFastBlocks: true,
        // longLivedServices: true, // Crashes the app
        chainWorkerTtl: { secs: 10, nanos: 0 },
        quorumGracePeriod: 0,
        // blobDownloadTimeout: { secs: 5, nanos: 0 },
        alternativePeersRetryDelayMs: 200,
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
'use client'
import { LineraProvider, LogLevel } from 'linera-react-client';
import { PageLoading } from '@/components/loading';
import { SyncProvider } from './sync-provider';
import { EagerLoader } from './eager-loader';

export function AppLineraProvider({ children }: {children: React.ReactNode}) {

  return (
    <LineraProvider
      faucetUrl={process.env.NEXT_PUBLIC_FAUCET_URL!}
      readOnlyWallet={{ constantAddress: '0x3000000000000000000000000000000000000004' }}
      fallback={<PageLoading />}
      skipProcessInbox={true}
      logging={{
        enabled: true,
        level: LogLevel.DEBUG
      }}
    >
      <SyncProvider>
        <EagerLoader>
          {children}
        </EagerLoader>
      </SyncProvider>
    </LineraProvider>
  )
}
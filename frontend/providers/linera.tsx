'use client'
import { LineraProvider, LogLevel } from 'linera-react-client';
import { PageLoading } from '@/components/loading';
import { SyncProvider } from './sync-provider';

export function AppLineraProvider({ children }: {children: React.ReactNode}) {

  return (
    <LineraProvider
      faucetUrl={process.env.NEXT_PUBLIC_FAUCET_URL!}
      readOnlyWallet={{ constantAddress: '0x3000000000000000000000000000000000000003' }}
      fallback={<PageLoading />}
      skipProcessInbox={false}
      logging={{
        enabled: true,
        level: LogLevel.DEBUG
      }}
    >
      <SyncProvider>
        {children}
      </SyncProvider>
    </LineraProvider>
  )
}
import MyTokensWalletBalance from '@/app-dashboard/wallet-balance';

export const dynamic = 'force-static';
export const revalidate = false;

export default function MyTokensPage() {
  return <MyTokensWalletBalance />;
}

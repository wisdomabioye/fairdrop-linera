import MyTokensWalletBalance from '@/app-dashboard/my-tokens';

export const dynamic = 'force-static';
export const revalidate = false;

export default function MyTokensPage() {
  return <MyTokensWalletBalance />;
}

import AACBalances from '@/app-pages/aac-balances';

export const dynamic = 'force-static';
export const revalidate = false;

export default function AACBalancesPage() {
  return <AACBalances />;
}

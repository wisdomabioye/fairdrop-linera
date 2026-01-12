import AACBalances from '@/app-dashboard/aac-balances';

export const dynamic = 'force-static';
export const revalidate = false;

export default function AACBalancesPage() {
  return <AACBalances />;
}

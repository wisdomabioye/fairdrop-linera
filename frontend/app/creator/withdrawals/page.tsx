import CreatorWithdrawals from '@/app-pages/creator/withdrawals';

export const dynamic = 'force-static';
export const revalidate = false;

export default function CreatorWithdrawalsPage() {
  return <CreatorWithdrawals />;
}

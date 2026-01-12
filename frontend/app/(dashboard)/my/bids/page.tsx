import { ComingSoon } from '@/components/loading';

export const dynamic = 'force-static';
export const revalidate = false;

export default function MyBidsPage() {
  return <ComingSoon title="My Bids" />;
}
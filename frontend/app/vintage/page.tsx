import ActiveAuctions from '@/app-pages/active-auction';

export const dynamic = 'force-static';
export const revalidate = false;

export default function ActiveAuctionsPage() {
  return <ActiveAuctions />;
}

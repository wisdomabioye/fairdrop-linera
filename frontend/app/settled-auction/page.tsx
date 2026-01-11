import SettledAuctions from '@/app-pages/settled-auction';

export const dynamic = 'force-static';
export const revalidate = false;

export default function SettledAuctionsPage() {
  return <SettledAuctions />;
}

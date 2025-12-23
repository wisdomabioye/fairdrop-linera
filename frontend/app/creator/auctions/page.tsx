import CreatorAuctions from '@/app-pages/creator/auctions';

export const dynamic = 'force-static';
export const revalidate = false;

export default function CreatorAuctionsPage() {
  return <CreatorAuctions />;
}

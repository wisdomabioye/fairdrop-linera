import AuctionDetailPage from '@/app-pages/auction-detail';

export const dynamic = 'force-static';
export const revalidate = false;

export default function AuctionDetail() {
  return <AuctionDetailPage />;
}

import MyAuctionsPage from '@/app-pages/my-auctions';

export const dynamic = 'force-static';
export const revalidate = false;

export default function MyAuctions() {
  return <MyAuctionsPage />;
}

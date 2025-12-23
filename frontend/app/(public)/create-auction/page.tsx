import CreateAuctionPage from '@/app-pages/create-auction';

export const dynamic = 'force-static';
export const revalidate = false;

export default function CreateAuction() {
  return <CreateAuctionPage />;
}

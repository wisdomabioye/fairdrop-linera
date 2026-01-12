import MyCreatedAuctions from "@/app-dashboard/my-auctions";

export const dynamic = 'force-static';
export const revalidate = false;

export default function CreatorAuctionsPage() {
  return <MyCreatedAuctions />;
}
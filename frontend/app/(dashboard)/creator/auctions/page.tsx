import MyCreatedAuctions from "@/app-dashboard/create-auction";

export const dynamic = 'force-static';
export const revalidate = false;

export default function CreatorAuctionsPage() {
  return <MyCreatedAuctions />;
}
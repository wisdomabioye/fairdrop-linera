import MyBids from "@/app-dashboard/my-bids";

export const dynamic = 'force-static';
export const revalidate = false;

export default function MyBidsPage() {
  return <MyBids />;
}
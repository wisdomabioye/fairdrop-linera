import MySettlements from '@/app-pages/dashboard/my-settlements';

export const dynamic = 'force-static';
export const revalidate = false;

export default function MySettlementsPage() {
  return <MySettlements />;
}

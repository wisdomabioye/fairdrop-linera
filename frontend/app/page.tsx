import DashboardOverview from '@/app-pages/dashboard/overview';

export const dynamic = 'force-static';
export const revalidate = false;

export default function HomePage() {
  return <DashboardOverview />;
}

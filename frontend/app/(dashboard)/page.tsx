import DashboardOverview from '@/app-dashboard/home';

export const dynamic = 'force-static';
export const revalidate = false;

export default function HomePage() {
  return <DashboardOverview />;
}
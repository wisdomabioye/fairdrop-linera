import PersonalDashboard from '@/app-pages/dashboard/personal';

export const dynamic = 'force-static';
export const revalidate = false;

export default function PersonalDashboardPage() {
  return <PersonalDashboard />;
}

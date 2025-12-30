import MyTokens from '@/app-pages/my-tokens';

export const dynamic = 'force-static';
export const revalidate = false;

export default function MyTokensPage() {
  return <MyTokens />;
}

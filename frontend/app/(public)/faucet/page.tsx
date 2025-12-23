import Faucet from '@/app-pages/faucet';

export const dynamic = 'force-static';
export const revalidate = false;

export default function FaucetPage() {
  return <Faucet />;
}

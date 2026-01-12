import { APP_ROUTES } from '@/config/app.route';
import {
  Compass,
  Zap,
  CheckCircle,
  LayoutDashboard,
  TrendingUp,
  BarChart,
  Wallet,
  Rocket,
  LucideIcon,
  Gift,
  Wallet2,
  PlusIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
  show?: boolean; // Conditional display
}


// Navigation sections - Always show all sections
export const navigation: NavSection[] = [
    {
        title: 'Discover',
        show: true,
        items: [
        { name: 'Explore Auctions', href: APP_ROUTES.home, icon: Compass },
        { name: 'Ending Soon', href: APP_ROUTES.home+'?filter=ending-soon', icon: Zap },
        { name: 'Recently Settled', href: APP_ROUTES.home+'?filter=settled', icon: CheckCircle },
        ],
    },
    {
        title: 'My Activity',
        show: true,
        items: [
        { name: 'My Dashboard', href: APP_ROUTES.bidSummary, icon: LayoutDashboard },
        { name: 'My Bids', href: APP_ROUTES.myBids, icon: TrendingUp },
        ],
    },
    {
        title: 'Creator',
        show: true,
        items: [
        { name: 'Overview', href: APP_ROUTES.creator, icon: BarChart },
        { name: 'My Auctions', href: APP_ROUTES.creatorAuctions, icon: Rocket },
        { name: 'Create Auction', href: APP_ROUTES.creatorCreate, icon: PlusIcon },
        ],
    },
    {
        title: 'Tokens',
        show: true,
        items: [
        { name: 'Wallet Balance', href: APP_ROUTES.walletBalance, icon: Wallet2 },
        { name: 'AAC Balance', href: APP_ROUTES.aacBalance, icon: Wallet },
        { name: 'Faucet', href: APP_ROUTES.faucet, icon: Gift },
        ],
    },
];
export interface WalletConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  downloadUrl: string;
  checkInstalled: () => boolean;
}

export const SUPPORTED_WALLETS: WalletConfig[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'The most popular Web3 wallet with support for thousands of tokens and dApps.',
    icon: '🦊',
    downloadUrl: 'https://metamask.io/download/',
    checkInstalled: () => {
      return typeof window !== 'undefined' && !!(window as any).ethereum?.isMetaMask;
    },
  },
  // {
  //   id: 'walletconnect',
  //   name: 'WalletConnect',
  //   description: 'Connect with mobile wallets like Trust Wallet, Rainbow, and 300+ others.',
  //   icon: '🔗',
  //   downloadUrl: 'https://walletconnect.com/',
  //   checkInstalled: () => {
  //     // WalletConnect doesn't require installation, it's always "available"
  //     return true;
  //   },
  // },
  // {
  //   id: 'coinbase',
  //   name: 'Coinbase Wallet',
  //   description: 'Self-custody wallet from Coinbase with easy onramp to buy crypto.',
  //   icon: '💰',
  //   downloadUrl: 'https://www.coinbase.com/wallet',
  //   checkInstalled: () => {
  //     return typeof window !== 'undefined' && !!(window as any).ethereum?.isCoinbaseWallet;
  //   },
  // },
];

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { AppLineraProvider } from '@/providers';
import { ThemeProvider } from '@/components/theme';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { APP_INFO } from '@/config/app.config';

import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});


export const metadata: Metadata = {
  title: APP_INFO.title,
  description: APP_INFO.description,
  keywords: [
    'Fairdrop',
    'Linera',
    'blockchain',
    'auction',
    'Dutch auction',
    'descending price',
    'uniform clearing',
    'Web3',
    'decentralized',
  ],
  authors: [{ name: APP_INFO.name }],
  openGraph: {
    title: APP_INFO.title,
    description: APP_INFO.description,
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className='dark' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <AppLineraProvider>
              <Header />
              <main className="flex-1 flex flex-col">
                {children}
              </main>
              <Footer />
          </AppLineraProvider>

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            expand={true}
            richColors
            closeButton
            duration={4000}
            toastOptions={{
              classNames: {
                // toast: 'bg-card border border-white/10 backdrop-blur-xl shadow-2xl',
                // title: 'text-text-primary font-semibold',
                // description: 'text-text-secondary text-sm',
                // actionButton: 'bg-primary text-white hover:bg-primary/90',
                // cancelButton: 'bg-glass hover:bg-white/10',
                // closeButton: 'bg-glass border border-white/10 hover:bg-white/10',
                // error: 'border-error/30 bg-error/5',
                // success: 'border-success/30 bg-success/5',
                // warning: 'border-warning/30 bg-warning/5',
                // info: 'border-info/30 bg-info/5',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

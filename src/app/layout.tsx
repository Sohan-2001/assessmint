
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { AppHeader } from '@/components/layout/AppHeader';
import { AiPanelProvider } from '@/contexts/AiPanelContext';
import { Inter, Poppins } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AssessMint - Modern Exam Platform',
  description: 'Create, manage, and take exams with ease using AssessMint, an AI-enhanced assessment tool.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <head />
      <body className="font-body antialiased">
        <Providers>
          <AiPanelProvider>
            <div className="flex min-h-screen flex-col">
              <AppHeader />
              <main className="flex-grow">{children}</main>
            </div>
          </AiPanelProvider>
        </Providers>
      </body>
    </html>
  );
}

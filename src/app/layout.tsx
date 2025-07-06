
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
  weight: ['400', '500', '600', '700'],
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
      <head>
        {/* Font <link> tags are now handled by next/font and can be removed */}
      </head>
      <body className="font-body antialiased">
        <Providers>
          <AiPanelProvider> {/* Provider wraps content that might use/trigger the panel */}
            <div className="flex min-h-screen flex-col">
              <AppHeader />
              <main className="flex-grow">{children}</main>
              {/* Optional Footer can be added here */}
            </div>
          </AiPanelProvider>
        </Providers>
      </body>
    </html>
  );
}

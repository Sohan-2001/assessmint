
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { AppHeader } from '@/components/layout/AppHeader';
import { AiPanelProvider } from '@/contexts/AiPanelContext';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
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

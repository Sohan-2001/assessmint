import type { ReactNode } from 'react';
import Link from 'next/link';
import { BookOpenCheck } from 'lucide-react';

export default function AuthPageLayout({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-4 sm:p-6 lg:p-8">
      <div className="absolute top-6 left-6">
        <Link href="/" className="flex items-center gap-2" aria-label="AssessMint Home">
          <BookOpenCheck className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline font-bold text-primary">AssessMint</span>
        </Link>
      </div>
      {children}
    </div>
  );
}

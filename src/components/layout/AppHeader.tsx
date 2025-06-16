
"use client";

import Link from 'next/link';
import { BookOpenCheck, LogIn, LogOut, UserPlus, Settings, LayoutDashboard, ScrollText, ListChecks, FileText, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from 'next/navigation';
import { useAiPanel } from '@/contexts/AiPanelContext'; // Import the hook

export function AppHeader() {
  const { isAuthenticated, userRole, logout, isLoading } = useAuth();
  const { setIsAiPanelOpen } = useAiPanel(); // Consume the context
  const router = useRouter();

  const handleLogout = () => {
    logout();
  };

  const getInitials = (role: string | null) => {
    if (!role) return "U";
    return role.charAt(0).toUpperCase();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="AssessMint Home">
          <BookOpenCheck className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline font-bold text-primary">AssessMint</span>
        </Link>
        <nav className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : isAuthenticated ? (
            <>
              {userRole === 'setter' && (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/setter/dashboard"><LayoutDashboard className="mr-2" />Dashboard</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/setter/create-exam"><FileText className="mr-2" />Create Exam</Link>
                  </Button>
                  <Button variant="ghost" onClick={() => setIsAiPanelOpen(true)}>
                    <SparklesIcon className="mr-2" />AI Questions
                  </Button>
                </>
              )}
              {userRole === 'taker' && (
                <Button variant="ghost" asChild>
                  <Link href="/taker/exams"><ListChecks className="mr-2" />Available Exams</Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                       {/* Placeholder for user image */}
                      <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(userRole)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userRole === 'setter' ? 'Exam Setter' : 'Exam Taker'}
                      </p>
                      {/* <p className="text-xs leading-none text-muted-foreground">
                        user@example.com 
                      </p> */}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* <DropdownMenuItem onClick={() => router.push(userRole === 'setter' ? '/setter/settings' : '/taker/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem> */}
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Exam Setter</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/setter-sign-in')}>
                    <LogIn className="mr-2 h-4 w-4" /> Sign In
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/setter-sign-up')}>
                    <UserPlus className="mr-2 h-4 w-4" /> Sign Up
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>Exam Taker</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/taker-sign-in')}>
                    <LogIn className="mr-2 h-4 w-4" /> Sign In
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/taker-sign-up')}>
                    <UserPlus className="mr-2 h-4 w-4" /> Sign Up
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

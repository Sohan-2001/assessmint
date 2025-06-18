
"use client";

import Link from 'next/link';
import { BookOpenCheck, LogIn, LogOut, UserPlus, LayoutDashboard, ListChecks, FileText, SparklesIcon, Menu } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose, 
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from 'next/navigation';
import { useAiPanel } from '@/contexts/AiPanelContext';
import { useState } from 'react'; 

export function AppHeader() {
  const { isAuthenticated, userRole, logout, isLoading } = useAuth();
  const { setIsAiPanelOpen } = useAiPanel();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false); 
  };

  const getInitials = (role: string | null) => {
    if (!role) return "U";
    return role.charAt(0).toUpperCase();
  };

  const commonMobileLinkStyles = "w-full justify-start py-3 text-base";
  const commonMobileIconStyles = "mr-3 h-5 w-5";

  const navigateAndCloseMobileMenu = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  const openAiPanelAndCloseMobileMenu = () => {
    setIsAiPanelOpen(true);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="AssessMint Home">
          <BookOpenCheck className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline font-bold text-primary">AssessMint</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-x-1 lg:gap-x-2">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : isAuthenticated ? (
            <>
              {userRole === 'setter' && (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/setter/dashboard"><LayoutDashboard className="mr-2 h-5 w-5" />Dashboard</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/setter/create-exam"><FileText className="mr-2 h-5 w-5" />Create Exam</Link>
                  </Button>
                  <Button variant="ghost" onClick={() => setIsAiPanelOpen(true)}>
                    <SparklesIcon className="mr-2 h-5 w-5" />AI Questions
                  </Button>
                </>
              )}
              {userRole === 'taker' && (
                <Button variant="ghost" asChild>
                  <Link href="/taker/exams"><ListChecks className="mr-2 h-5 w-5" />Available Exams</Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
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
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
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
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black">Exam Setter</Button>
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
                  <Button className="bg-slate-300 hover:bg-slate-400 text-black">Exam Taker</Button>
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

        {/* Mobile Navigation Trigger */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-xs p-0 bg-card flex flex-col">
              <SheetHeader className="p-6 border-b">
                <SheetTitle asChild>
                  <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                    <BookOpenCheck className="h-7 w-7 text-primary" />
                    <span className="text-xl font-headline font-bold text-primary">AssessMint</span>
                  </Link>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex-grow p-6 space-y-3">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-8 w-full animate-pulse rounded-md bg-muted"></div>
                    <div className="h-8 w-full animate-pulse rounded-md bg-muted"></div>
                  </div>
                ) : isAuthenticated ? (
                  <>
                    {userRole === 'setter' && (
                      <>
                        <Button variant="ghost" className={commonMobileLinkStyles} onClick={() => navigateAndCloseMobileMenu('/setter/dashboard')}>
                          <LayoutDashboard className={commonMobileIconStyles} />Dashboard
                        </Button>
                        <Button variant="ghost" className={commonMobileLinkStyles} onClick={() => navigateAndCloseMobileMenu('/setter/create-exam')}>
                          <FileText className={commonMobileIconStyles} />Create Exam
                        </Button>
                        <Button variant="ghost" className={commonMobileLinkStyles} onClick={openAiPanelAndCloseMobileMenu}>
                          <SparklesIcon className={commonMobileIconStyles} />AI Questions
                        </Button>
                      </>
                    )}
                    {userRole === 'taker' && (
                      <Button variant="ghost" className={commonMobileLinkStyles} onClick={() => navigateAndCloseMobileMenu('/taker/exams')}>
                        <ListChecks className={commonMobileIconStyles} />Available Exams
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="block px-2 py-1 text-sm font-medium text-muted-foreground">Exam Setter</span>
                    <Button variant="ghost" className={commonMobileLinkStyles} onClick={() => navigateAndCloseMobileMenu('/setter-sign-in')}>
                      <LogIn className={commonMobileIconStyles} /> Sign In
                    </Button>
                    <Button variant="ghost" className={commonMobileLinkStyles} onClick={() => navigateAndCloseMobileMenu('/setter-sign-up')}>
                      <UserPlus className={commonMobileIconStyles} /> Sign Up
                    </Button>
                    <DropdownMenuSeparator className="my-3"/>
                    <span className="block px-2 py-1 text-sm font-medium text-muted-foreground">Exam Taker</span>
                     <Button variant="ghost" className={commonMobileLinkStyles} onClick={() => navigateAndCloseMobileMenu('/taker-sign-in')}>
                      <LogIn className={commonMobileIconStyles} /> Sign In
                    </Button>
                    <Button variant="ghost" className={commonMobileLinkStyles} onClick={() => navigateAndCloseMobileMenu('/taker-sign-up')}>
                      <UserPlus className={commonMobileIconStyles} /> Sign Up
                    </Button>
                  </>
                )}
              </nav>
              
              {isAuthenticated && (
                <div className="mt-auto p-6 border-t">
                   <div className="flex items-center mb-4">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(userRole)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {userRole === 'setter' ? 'Exam Setter' : 'Exam Taker'}
                        </p>
                      </div>
                    </div>
                  <Button variant="ghost" className={commonMobileLinkStyles} onClick={handleLogout}>
                    <LogOut className={commonMobileIconStyles} />Log out
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

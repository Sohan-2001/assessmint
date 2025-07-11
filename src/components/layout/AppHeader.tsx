
"use client";

import Link from 'next/link';
import { BookOpenCheck, LogIn, LogOut, UserPlus, LayoutDashboard, ListChecks, SparklesIcon, Menu, Info, X, Shield } from 'lucide-react';
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
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from 'next/navigation';
import { useAiPanel } from '@/contexts/AiPanelContext';
import { useState } from 'react';
import { Role } from '@/lib/types'; 
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UnlockSecurityDialog } from './UnlockSecurityDialog';


export function AppHeader() {
  const { isAuthenticated, userRole, logout, isLoading } = useAuth();
  const { setIsAiPanelOpen } = useAiPanel();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false); 
  };

  const getInitials = (role: Role | null) => {
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
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="AssessMint Home">
          <BookOpenCheck className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline font-bold text-primary">AssessMint</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-x-1 lg:gap-x-2">
          <Button variant="ghost" asChild>
            <Link href="/about">About</Link>
          </Button>
          <UnlockSecurityDialog />
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : isAuthenticated ? (
            <>
              {userRole === Role.SETTER && (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/setter/dashboard">Dashboard</Link>
                  </Button>
                  <Button variant="ghost" onClick={() => setIsAiPanelOpen(true)}>
                    <SparklesIcon className="mr-2 h-4 w-4" />AI Generator
                  </Button>
                </>
              )}
              {userRole === Role.TAKER && (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/taker/dashboard">Dashboard</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/taker/exams">Available Exams</Link>
                  </Button>
                </>
              )}
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-primary/50">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{getInitials(userRole)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userRole === Role.SETTER ? 'Exam Setter' : 'Exam Taker'}
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
                  <Button>Exam Setter</Button>
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
                   <Button variant="secondary">Exam Taker</Button>
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
              <ThemeToggle />
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
                <Button variant="ghost" className={commonMobileLinkStyles} onClick={() => navigateAndCloseMobileMenu('/about')}>
                  <Info className={commonMobileIconStyles} />About AssessMint
                </Button>
                 <SheetClose asChild>
                  <div className="-ml-2">
                    <UnlockSecurityDialog />
                  </div>
                 </SheetClose>
                <DropdownMenuSeparator className="my-3"/>
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-8 w-full animate-pulse rounded-md bg-muted"></div>
                    <div className="h-8 w-full animate-pulse rounded-md bg-muted"></div>
                  </div>
                ) : isAuthenticated ? (
                  <>
                    {userRole === Role.SETTER && (
                      <>
                        <Button variant="ghost" className={commonMobileLinkStyles} onClick={() => navigateAndCloseMobileMenu('/setter/dashboard')}>
                          <LayoutDashboard className={commonMobileIconStyles} />Dashboard
                        </Button>
                        <Button variant="ghost" className={commonMobileLinkStyles} onClick={openAiPanelAndCloseMobileMenu}>
                          <SparklesIcon className={commonMobileIconStyles} />AI Questions
                        </Button>
                      </>
                    )}
                    {userRole === Role.TAKER && (
                      <>
                        <Button variant="ghost" className={commonMobileLinkStyles} onClick={() => navigateAndCloseMobileMenu('/taker/dashboard')}>
                          <LayoutDashboard className={commonMobileIconStyles} />Dashboard
                        </Button>
                        <Button variant="ghost" className={commonMobileLinkStyles} onClick={() => navigateAndCloseMobileMenu('/taker/exams')}>
                          <ListChecks className={commonMobileIconStyles} />Available Exams
                        </Button>
                      </>
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
              
              {isAuthenticated ? (
                <div className="mt-auto p-6 border-t">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(userRole)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {userRole === Role.SETTER ? 'Exam Setter' : 'Exam Taker'}
                          </p>
                        </div>
                      </div>
                      <ThemeToggle />
                    </div>
                  <Button variant="ghost" className={commonMobileLinkStyles} onClick={handleLogout}>
                    <LogOut className={commonMobileIconStyles} />Log out
                  </Button>
                </div>
              ) : (
                <div className="mt-auto p-6 border-t flex justify-end">
                    <ThemeToggle />
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

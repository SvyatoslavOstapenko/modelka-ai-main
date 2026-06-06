'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AuthModal } from '@/components/auth/auth-modal';
import { BillingDialog } from '@/components/billing/billing-dialog';
import { Logo } from '@/components/logo';
import { Sparkles, Images, Coins, Menu, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

// ============================================
// CONSTANTS
// ============================================

const NAV_ITEMS: NavItem[] = [
  {
    href: '/app',
    label: 'Примерить',
    icon: Sparkles,
  },
  {
    href: '/gallery',
    label: 'Галерея',
    icon: Images,
  },
];

// ============================================
// HEADER COMPONENT
// ============================================

export function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = session?.user;
  const credits = user?.credits ?? 0;
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/' });
      toast.success('Вы вышли из аккаунта');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Ошибка выхода. Попробуйте ещё раз.');
    }
  };

  const handleCreditClick = () => {
    setShowBillingDialog(true);
  };

  return (
    <>
      {/* ============================================ */}
      {/* GLASSMORPHISM HEADER - Light Mode Only */}
      {/* ============================================ */}
      <header
        className="sticky top-0 z-50 w-full border-b border-slate-200 bg-slate-50/80 backdrop-blur-md"
        style={{ paddingRight: 'var(--removed-body-scroll-bar-size, 0px)' }}
      >
        <div className="container flex h-16 items-center justify-between">
          {/* ============================================ */}
          {/* LEFT: Logo Lockup */}
          {/* ============================================ */}
          <Logo
            href={isAuthenticated ? '/app' : '/'}
            size="md"
            hideTextOnMobile
          />

          {/* ============================================ */}
          {/* CENTER: Navigation (Desktop) */}
          {/* ============================================ */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        'gap-2 transition-all',
                        isActive
                          ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700'
                          : 'text-slate-600 hover:text-indigo-600 hover:bg-transparent'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* ============================================ */}
          {/* RIGHT: Actions */}
          {/* ============================================ */}
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <>
                {/* Credit Badge (Desktop) */}
                <Button
                  variant="outline"
                  className="hidden md:flex items-center gap-2 rounded-full px-4 border-slate-300 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                  onClick={handleCreditClick}
                >
                  <Coins className="w-4 h-4 text-indigo-500" />
                  <span className="font-heading font-semibold text-slate-900">{credits} токенов</span>
                </Button>

                {/* Credit Badge (Mobile - Compact) */}
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden flex items-center gap-1.5 rounded-full px-3 border-slate-300"
                  onClick={handleCreditClick}
                >
                  <Coins className="w-4 h-4 text-indigo-500" />
                  <span className="font-heading font-semibold text-slate-900">{credits}</span>
                </Button>
              </>
            )}

            {/* User Dropdown (Desktop) */}
            {isAuthenticated && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full hidden md:flex"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.image || ''} alt={user.name || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Настройки</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu */}
            {isAuthenticated && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Открыть меню</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                  <SheetHeader>
                    <SheetTitle asChild>
                      <Logo size="sm" />
                    </SheetTitle>
                  </SheetHeader>

                  {/* Mobile Navigation */}
                  <nav className="flex flex-col gap-2 mt-8">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <div
                            className={cn(
                              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                              isActive
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600'
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-base font-medium">{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Mobile User Profile */}
                  {user && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-slate-50/50">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.image || ''} alt={user.name || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {user.name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4" />
                        Выйти
                      </Button>
                    </div>
                  )}
                </SheetContent>
              </Sheet>
            )}

            {/* Sign In Button (Unauthenticated) */}
            {!isAuthenticated && !isLoading && (
              <Button onClick={() => setShowAuthModal(true)}>Войти</Button>
            )}

            {/* Loading State */}
            {isLoading && (
              <Button variant="ghost" className="h-10 w-10 rounded-full" disabled>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>...</AvatarFallback>
                </Avatar>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />

      {/* Billing Dialog */}
      <BillingDialog open={showBillingDialog} onOpenChange={setShowBillingDialog} />
    </>
  );
}

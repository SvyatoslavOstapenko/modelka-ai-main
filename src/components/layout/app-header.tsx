'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import {
  Menu,
  Image,
  Edit3,
  User,
  CreditCard,
  LogOut,
  Settings,
  Coins,
  ChevronDown,
  MoreHorizontal,
  Package,
  Shirt,
  Wand2,
  Users,
  Clapperboard,
  Palette,
  Wrench,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useCredits } from '@/contexts/credits-context';

// ============================================
// NAVIGATION CONFIG
// ============================================

// Основные пункты (всегда видны на десктопе ≥1200px)
const PRIMARY_NAV = [
  {
    label: 'Товар на модели',
    href: '/app/generate/product-to-model',
    icon: Package,
  },
  {
    label: 'Примерка',
    href: '/app/generate/try-on',
    icon: Shirt,
  },
  {
    label: 'Редактор',
    href: '/app/generate/edit',
    icon: Edit3,
  },
  {
    label: 'Галерея',
    href: '/app/gallery',
    icon: Image,
  },
];

// Инструменты (выпадающее меню на десктопе)
const TOOLS_NAV = [
  {
    label: 'Замена модели',
    href: '/app/generate/model-swap',
    icon: Users,
    description: 'Заменить модель на фото',
  },
  {
    label: 'Смена фона',
    href: '/app/generate/background-change',
    icon: Palette,
    description: 'Заменить фон на изображении',
  },
  {
    label: 'Лицо → виртуальная модель',
    href: '/app/generate/face-to-model',
    icon: User,
    description: 'Создать модель из фото лица',
  },
  {
    label: 'Создание модели по описанию',
    href: '/app/generate/model-create',
    icon: Wand2,
    description: 'Сгенерировать модель по промпту',
  },
  {
    label: 'Видео из фото',
    href: '/app/generate/video',
    icon: Clapperboard,
    description: 'Создать видео из изображения',
  },
];

// Для планшета (768-1199px) - сокращённое меню
const TABLET_PRIMARY_NAV = [
  {
    label: 'Товар на модели',
    href: '/app/generate/product-to-model',
    icon: Package,
  },
  {
    label: 'Примерка',
    href: '/app/generate/try-on',
    icon: Shirt,
  },
  {
    label: 'Галерея',
    href: '/app/gallery',
    icon: Image,
  },
];

// Всё остальное для планшета уходит в "Ещё"
const TABLET_MORE_NAV = [
  {
    label: 'Редактор',
    href: '/app/generate/edit',
    icon: Edit3,
    description: 'Редактирование фото',
  },
  ...TOOLS_NAV,
];

// Для мобильного - группы
const MOBILE_NAV_GROUPS = [
  {
    title: 'Основное',
    items: [
      {
        label: 'Товар на модели',
        href: '/app/generate/product-to-model',
        icon: Package,
      },
      {
        label: 'Примерка',
        href: '/app/generate/try-on',
        icon: Shirt,
      },
      {
        label: 'Редактор',
        href: '/app/generate/edit',
        icon: Edit3,
      },
      {
        label: 'Галерея',
        href: '/app/gallery',
        icon: Image,
      },
    ],
  },
  {
    title: 'Инструменты',
    items: TOOLS_NAV,
  },
];

// ============================================
// COMPONENTS
// ============================================

export function AppHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { credits } = useCredits();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userInitial = session?.user?.name?.[0]?.toUpperCase() || 'П';

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const isToolActive = TOOLS_NAV.some((tool) => pathname === tool.href);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Logo
          href="/app"
          size="md"
          variant="dark"
          hideTextOnMobile
          className="hover:opacity-80 transition-opacity"
        />

        {/* Desktop Navigation (≥1200px) */}
        <nav className="hidden xl:flex items-center gap-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'gap-1.5 font-medium text-slate-300 hover:text-white hover:bg-slate-800/50',
                    isActive && 'bg-slate-800/70 text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}

          {/* Инструменты dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'gap-1.5 font-medium text-slate-300 hover:text-white hover:bg-slate-800/50',
                  isToolActive && 'bg-slate-800/70 text-white'
                )}
              >
                <Wrench className="w-4 h-4" />
                Инструменты
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {TOOLS_NAV.map((tool) => {
                const Icon = tool.icon;
                return (
                  <DropdownMenuItem key={tool.href} asChild>
                    <Link href={tool.href} className="cursor-pointer flex items-start gap-3 py-3">
                      <Icon className="w-4 h-4 mt-0.5 text-slate-400" />
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{tool.label}</span>
                        {tool.description && (
                          <span className="text-xs text-muted-foreground">{tool.description}</span>
                        )}
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Tablet Navigation (768-1199px) */}
        <nav className="hidden md:flex xl:hidden items-center gap-1">
          {TABLET_PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'gap-1.5 font-medium text-slate-300 hover:text-white hover:bg-slate-800/50',
                    isActive && 'bg-slate-800/70 text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}

          {/* Ещё dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1.5 font-medium text-slate-300 hover:text-white hover:bg-slate-800/50',
                  (pathname === '/app/generate/edit' || isToolActive) && 'bg-slate-800/70 text-white'
                )}
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="hidden lg:inline">Ещё</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {TABLET_MORE_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="cursor-pointer flex items-start gap-3 py-3">
                      <Icon className="w-4 h-4 mt-0.5 text-slate-400" />
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        )}
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Credits Badge */}
          <Link href="/app/billing">
            <Badge
              variant="outline"
              className="gap-1.5 px-3 py-1.5 cursor-pointer hover:bg-primary/20 transition-colors border-slate-700 bg-slate-800/50"
            >
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-slate-100">{credits}</span>
              <span className="text-slate-400 hidden sm:inline">токенов</span>
            </Badge>
          </Link>

          {/* User Menu (Desktop) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="hidden md:flex">
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || 'Пользователь'} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session?.user?.name || 'Пользователь'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Профиль
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/billing" className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Тарифы
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Настройки
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu (<768px) */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-slate-100 hover:text-white">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Открыть меню</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <MobileNav pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

// ============================================
// MOBILE NAV
// ============================================

interface MobileNavProps {
  pathname: string;
  onNavigate: () => void;
}

function MobileNav({ pathname, onNavigate }: MobileNavProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-6 border-b border-slate-800">
        <div className="flex justify-center">
          <Logo size="md" variant="dark" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {MOBILE_NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-6">
            <h3 className="px-6 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 px-6 py-3 hover:bg-slate-800/50 transition-colors text-slate-300',
                      isActive && 'bg-primary/20 text-white font-medium'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

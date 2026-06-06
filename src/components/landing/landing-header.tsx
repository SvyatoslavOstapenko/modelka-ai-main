'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

interface LandingHeaderProps {
  onOpenAuthModal: () => void;
}

const navLinks = [
  { href: '#features', label: 'Преимущества' },
  { href: '#how-it-works', label: 'Как это работает' },
  { href: '#examples', label: 'Примеры' },
  { href: '#pricing', label: 'Тарифы' },
  { href: '#cases', label: 'Кейсы' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingHeader({ onOpenAuthModal }: LandingHeaderProps) {
  const { status } = useSession();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCTAClick = () => {
    if (isAuthenticated) {
      router.push('/app');
    } else {
      onOpenAuthModal();
    }
  };

  const scrollToSection = (href: string) => {
    setIsMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/50'
          : 'bg-transparent'
      )}
    >
      <div className="container">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo href="/" size="md" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors whitespace-nowrap"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-4">
            {isAuthenticated ? (
              <Button onClick={() => router.push('/app')}>
                Перейти в приложение
              </Button>
            ) : (
              <Button onClick={onOpenAuthModal} className="gradient-primary whitespace-nowrap">
                Начать бесплатно
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200">
          <div className="container py-4">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-left text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors py-2"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-4 border-t border-slate-200">
                <Button className="w-full" onClick={handleCTAClick}>
                  {isAuthenticated ? 'Перейти в приложение' : 'Начать бесплатно'}
                </Button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

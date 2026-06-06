'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// ============================================
// BRAND CONSTANTS
// ============================================

export const BRAND_NAME = 'Modelka AI';

// ============================================
// LOGO COMPONENT TYPES
// ============================================

interface LogoProps {
    /** Show text alongside icon */
    showText?: boolean;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Optional link href (if not provided, renders as div) */
    href?: string;
    /** Hide text on mobile (show only icon) */
    hideTextOnMobile?: boolean;
    /** Theme variant - light or dark */
    variant?: 'light' | 'dark';
    /** Additional className for the container */
    className?: string;
    /** Text className override */
    textClassName?: string;
}

// ============================================
// SIZE CONFIGURATIONS
// ============================================

const sizeConfig = {
    sm: {
        icon: 'h-7 w-7',
        text: 'text-lg',
        gap: 'gap-2',
    },
    md: {
        icon: 'h-9 w-9',
        text: 'text-xl',
        gap: 'gap-3',
    },
    lg: {
        icon: 'h-12 w-12',
        text: 'text-2xl',
        gap: 'gap-4',
    },
};

// ============================================
// THEME CONFIGURATIONS
// ============================================

const themeConfig = {
    light: {
        text: 'text-slate-900',
        aiText: 'bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent',
    },
    dark: {
        text: 'text-white',
        aiText: 'bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent',
    },
};

// ============================================
// LOGO COMPONENT
// ============================================

export function Logo({
    showText = true,
    size = 'md',
    href,
    hideTextOnMobile = false,
    variant = 'light',
    className,
    textClassName,
}: LogoProps) {
    const config = sizeConfig[size];
    const theme = themeConfig[variant];

    const content = (
        <>
            {/* Neon Icon with Drop Shadow */}
            <div
                className={cn(
                    'relative shrink-0 drop-shadow-[0_4px_6px_rgba(99,102,241,0.25)]',
                    config.icon
                )}
            >
                <Image
                    src="/logo-icon-neon.webp"
                    alt={`${BRAND_NAME} Logo`}
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            {/* Logo Text with AI Gradient */}
            {showText && (
                <span
                    className={cn(
                        'font-heading font-extrabold tracking-tight whitespace-nowrap',
                        config.text,
                        hideTextOnMobile && 'hidden md:block',
                        textClassName
                    )}
                >
                    <span className={theme.text}>Modelka</span>{' '}
                    <span className={theme.aiText}>AI</span>
                </span>
            )}
        </>
    );

    const containerClassName = cn(
        'flex items-center',
        config.gap,
        className
    );

    if (href) {
        return (
            <Link href={href} className={containerClassName}>
                {content}
            </Link>
        );
    }

    return <div className={containerClassName}>{content}</div>;
}

// ============================================
// LOGO ICON ONLY COMPONENT
// ============================================

interface LogoIconProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function LogoIcon({ size = 'md', className }: LogoIconProps) {
    const config = sizeConfig[size];

    return (
        <div
            className={cn(
                'relative shrink-0 drop-shadow-[0_4px_6px_rgba(99,102,241,0.25)]',
                config.icon,
                className
            )}
        >
            <Image
                src="/logo-icon-neon.webp"
                alt={`${BRAND_NAME} Logo`}
                fill
                className="object-contain"
                priority
            />
        </div>
    );
}

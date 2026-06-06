'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SellerLockTooltipProps {
    children: React.ReactNode;
    /** Показывать ли тултип (обычно !hasSellerAccess) */
    showTooltip: boolean;
    /** Дополнительные классы для span обёртки */
    className?: string;
}

/**
 * Тултип для заблокированных функций Seller пакета
 * Оборачивает элемент и показывает тултип при наведении если showTooltip = true
 */
export function SellerLockTooltip({ children, showTooltip, className }: SellerLockTooltipProps) {
    if (!showTooltip) {
        return <>{children}</>;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className={className}>{children}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-3">
                <p className="font-medium">Доступно с пакета Seller</p>
                <p className="text-xs text-muted-foreground mt-1">Обновите пакет для доступа к этой функции</p>
                <a href="/app/billing" className="text-xs text-primary hover:underline mt-2 block">Обновить пакет</a>
            </TooltipContent>
        </Tooltip>
    );
}


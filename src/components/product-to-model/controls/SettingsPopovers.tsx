'use client';

import { Maximize2, MonitorUp, Images, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SellerLockTooltip } from '@/components/ui/seller-lock-tooltip';
import { cn } from '@/lib/utils';
import { ASPECT_RATIOS, RESOLUTIONS } from '../shared/constants';

interface SettingsPopoversProps {
  // Соотношение сторон
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  isRatioOpen: boolean;
  setIsRatioOpen: (open: boolean) => void;

  // Разрешение
  resolution: string;
  setResolution: (res: string) => void;
  isResolutionOpen: boolean;
  setIsResolutionOpen: (open: boolean) => void;

  // Количество вариантов
  numVariants: number;
  setNumVariants: (num: number) => void;
  isVariantsOpen: boolean;
  setIsVariantsOpen: (open: boolean) => void;

  // Права доступа
  hasSellerAccess: boolean;
}

/**
 * Компонент с поповерами настроек для десктопа
 * Содержит три поповера: соотношение сторон, разрешение и количество изображений
 */
export function SettingsPopovers({
  aspectRatio,
  setAspectRatio,
  isRatioOpen,
  setIsRatioOpen,
  resolution,
  setResolution,
  isResolutionOpen,
  setIsResolutionOpen,
  numVariants,
  setNumVariants,
  isVariantsOpen,
  setIsVariantsOpen,
  hasSellerAccess
}: SettingsPopoversProps) {
  return (
    <>
      {/* Поповер соотношения сторон */}
      <Popover open={isRatioOpen} onOpenChange={setIsRatioOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-11 w-[75px] justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-muted-foreground"
          >
            <Maximize2 className="w-4 h-4" />
            {aspectRatio}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-2">
          <div className="space-y-1">
            {ASPECT_RATIOS.map((ratio) => (
              <Button
                key={ratio}
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start",
                  aspectRatio === ratio && "bg-primary/10 text-primary font-medium"
                )}
                onClick={() => {
                  setAspectRatio(ratio);
                  setIsRatioOpen(false);
                }}
              >
                {ratio}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Поповер разрешения */}
      <Popover open={isResolutionOpen} onOpenChange={setIsResolutionOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-11 w-[70px] justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-muted-foreground"
          >
            <MonitorUp className="w-4 h-4" />
            {resolution}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2">
          <div className="space-y-1">
            {RESOLUTIONS.map((res) => {
              const isLocked = res.locked && !hasSellerAccess;
              return (
                <SellerLockTooltip key={res.value} showTooltip={isLocked}>
                  <Button
                    variant={resolution === res.value ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start h-auto py-2 flex-col items-start"
                    onClick={() => {
                      if (!isLocked) {
                        setResolution(res.value);
                        setIsResolutionOpen(false);
                      }
                    }}
                    disabled={isLocked}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-medium flex items-center">
                        {isLocked && <Lock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />}
                        {res.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 text-wrap text-left">{res.description}</span>
                  </Button>
                </SellerLockTooltip>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Поповер количества вариантов */}
      <Popover open={isVariantsOpen} onOpenChange={setIsVariantsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-11 w-[60px] justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-muted-foreground"
          >
            <Images className="w-4 h-4" />
            {numVariants}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-2">
          <div className="space-y-1">
            {[1, 2, 3, 4].map((num) => {
              const isLocked = num > 1 && !hasSellerAccess;
              return (
                <Tooltip key={num}>
                  <TooltipTrigger asChild>
                    <span className="block">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start",
                          numVariants === num && "bg-primary/10 text-primary font-medium"
                        )}
                        onClick={() => {
                          if (!isLocked) {
                            setNumVariants(num);
                            setIsVariantsOpen(false);
                          }
                        }}
                        disabled={isLocked}
                      >
                        {num} {num === 1 ? 'Изображение' : num <= 4 ? 'Изображения' : 'Изображений'}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isLocked && (
                    <TooltipContent side="left" className="max-w-xs p-3">
                      <p className="font-medium">Доступно с пакета Seller</p>
                      <p className="text-xs text-muted-foreground mt-1">Обновите пакет для генерации нескольких изображений</p>
                      <a href="/app/billing" className="text-xs text-primary hover:underline mt-2 block">Обновить пакет</a>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

/**
 * AppCard - Темная карточка с glassmorphism эффектом
 *
 * Используется только внутри /app роута для Neon Studio стиля.
 * НЕ заменяет базовый Card компонент из ui/, который используется на лендинге.
 */

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

// ============================================
// ТИПЫ
// ============================================

export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Добавить Neon glow эффект при hover */
  glowOnHover?: boolean;
  /** Цвет glow эффекта */
  glowColor?: 'violet' | 'blue' | 'emerald' | 'pink' | 'amber' | 'cyan' | 'red' | 'indigo';
}

// ============================================
// КОНСТАНТЫ
// ============================================

const GLOW_COLORS = {
  violet: 'group-hover:shadow-violet-500/20',
  blue: 'group-hover:shadow-blue-500/20',
  emerald: 'group-hover:shadow-emerald-500/20',
  pink: 'group-hover:shadow-pink-500/20',
  amber: 'group-hover:shadow-amber-500/20',
  cyan: 'group-hover:shadow-cyan-500/20',
  red: 'group-hover:shadow-red-500/20',
  indigo: 'group-hover:shadow-indigo-500/20',
};

// ============================================
// КОМПОНЕНТ
// ============================================

/**
 * Темная карточка с glassmorphism эффектом для /app роута
 *
 * @example
 * ```tsx
 * <AppCard glowOnHover glowColor="violet">
 *   <h3>Заголовок</h3>
 *   <p>Содержимое карточки</p>
 * </AppCard>
 * ```
 */
export const AppCard = forwardRef<HTMLDivElement, AppCardProps>(
  ({ className, glowOnHover = false, glowColor = 'violet', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Базовые стили
          'group relative rounded-xl border',
          // Glassmorphism
          'bg-slate-900/50 backdrop-blur-md',
          'border-slate-800',
          // Тени и transitions
          'shadow-lg transition-all duration-300',
          // Hover состояние
          'hover:border-slate-700',
          // Neon glow при hover (если включен)
          glowOnHover && [
            'hover:shadow-2xl',
            GLOW_COLORS[glowColor],
          ],
          className
        )}
        {...props}
      >
        {/* Градиентная подсветка сверху */}
        {glowOnHover && (
          <div
            className={cn(
              'absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500',
              glowColor === 'violet' && 'from-transparent via-violet-500 to-transparent',
              glowColor === 'blue' && 'from-transparent via-blue-500 to-transparent',
              glowColor === 'emerald' && 'from-transparent via-emerald-500 to-transparent',
              glowColor === 'pink' && 'from-transparent via-pink-500 to-transparent',
              glowColor === 'amber' && 'from-transparent via-amber-500 to-transparent',
              glowColor === 'cyan' && 'from-transparent via-cyan-500 to-transparent',
              glowColor === 'red' && 'from-transparent via-red-500 to-transparent',
              glowColor === 'indigo' && 'from-transparent via-indigo-500 to-transparent',
            )}
          />
        )}

        {children}
      </div>
    );
  }
);

AppCard.displayName = 'AppCard';

/**
 * Заголовок для AppCard
 */
export const AppCardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);

AppCardHeader.displayName = 'AppCardHeader';

/**
 * Заголовок карточки
 */
export const AppCardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-xl font-semibold leading-none tracking-tight text-slate-100 group-hover:text-white transition-colors',
        className
      )}
      {...props}
    />
  )
);

AppCardTitle.displayName = 'AppCardTitle';

/**
 * Описание карточки
 */
export const AppCardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-slate-400', className)}
      {...props}
    />
  )
);

AppCardDescription.displayName = 'AppCardDescription';

/**
 * Содержимое карточки
 */
export const AppCardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);

AppCardContent.displayName = 'AppCardContent';

/**
 * Футер карточки
 */
export const AppCardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);

AppCardFooter.displayName = 'AppCardFooter';

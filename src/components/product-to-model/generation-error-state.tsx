'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Clock,
  ImageOff,
  ShieldAlert,
  Zap,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import type { ErrorCode } from '@/types/errors';

export type ErrorType = ErrorCode;

interface ErrorInfo {
  title: string;
  message: string;
  icon: typeof AlertCircle;
  variant: 'error' | 'warning' | 'info';
  canRetry: boolean;
  actionText?: string;
}

const errorMap: Record<ErrorType, ErrorInfo> = {
  BAD_REQUEST: {
    title: 'Неверный формат запроса',
    message: 'Пожалуйста, проверьте загруженные файлы и попробуйте снова.',
    icon: AlertCircle,
    variant: 'error',
    canRetry: true,
    actionText: 'Попробовать снова',
  },
  UNAUTHORIZED: {
    title: 'Ошибка авторизации',
    message: 'Пожалуйста, перезагрузите страницу и попробуйте снова.',
    icon: ShieldAlert,
    variant: 'error',
    canRetry: false,
  },
  NOT_FOUND: {
    title: 'Ресурс не найден',
    message: 'Запрошенный ресурс не найден. Попробуйте создать новую генерацию.',
    icon: XCircle,
    variant: 'error',
    canRetry: false,
  },
  RATE_LIMIT: {
    title: 'Слишком много запросов',
    message: 'Пожалуйста, подождите немного и попробуйте снова через минуту.',
    icon: Clock,
    variant: 'warning',
    canRetry: true,
    actionText: 'Попробовать снова',
  },
  CONCURRENCY_LIMIT: {
    title: 'Превышен лимит одновременных запросов',
    message: 'Дождитесь завершения текущих генераций и попробуйте снова.',
    icon: AlertTriangle,
    variant: 'warning',
    canRetry: true,
    actionText: 'Попробовать снова',
  },
  INSUFFICIENT_CREDITS: {
    title: 'Недостаточно токенов',
    message: 'У вас недостаточно токенов для генерации. Пополните баланс и попробуйте снова.',
    icon: Zap,
    variant: 'warning',
    canRetry: false,
    actionText: 'Пополнить баланс',
  },
  PLAN_RESTRICTION: {
    title: 'Недоступно на вашем пакете',
    message: 'Эта функция доступна начиная с пакета Seller. Обновите ваш пакет для доступа к премиум функциям.',
    icon: Lock,
    variant: 'warning',
    canRetry: false,
    actionText: 'Обновить пакет',
  },
  INTERNAL_ERROR: {
    title: 'Технические неполадки',
    message: 'На сервере произошла ошибка. Мы уже работаем над её устранением. Попробуйте через несколько минут.',
    icon: AlertCircle,
    variant: 'error',
    canRetry: true,
    actionText: 'Попробовать снова',
  },
  IMAGE_LOAD_ERROR: {
    title: 'Ошибка загрузки изображения',
    message: 'Не удалось загрузить ваше изображение. Пожалуйста, проверьте формат файла и попробуйте снова.',
    icon: ImageOff,
    variant: 'error',
    canRetry: true,
    actionText: 'Загрузить другое фото',
  },
  CONTENT_MODERATION: {
    title: 'Изображение не прошло проверку безопасности',
    message: 'К сожалению, загруженное изображение не прошло автоматическую проверку безопасности. Пожалуйста, попробуйте другое фото или измените описание.',
    icon: ShieldAlert,
    variant: 'warning',
    canRetry: true,
    actionText: 'Попробовать с другим фото',
  },
  VALIDATION_ERROR: {
    title: 'Неверные параметры',
    message: 'Проверьте правильность заполнения всех полей и попробуйте снова.',
    icon: AlertCircle,
    variant: 'error',
    canRetry: true,
    actionText: 'Попробовать снова',
  },
  THIRD_PARTY_ERROR: {
    title: 'Временная недоступность сервиса',
    message: 'Сервис обработки временно недоступен. Попробуйте снова через несколько минут.',
    icon: Clock,
    variant: 'warning',
    canRetry: true,
    actionText: 'Попробовать позже',
  },
  SERVICE_UNAVAILABLE: {
    title: 'Сервис перегружен',
    message: 'Сервис временно перегружен. Пожалуйста, попробуйте снова через несколько минут.',
    icon: AlertTriangle,
    variant: 'warning',
    canRetry: true,
    actionText: 'Попробовать позже',
  },
  PIPELINE_ERROR: {
    title: 'Ошибка обработки',
    message: 'Произошла ошибка при обработке изображения. Попробуйте загрузить другое фото или повторите попытку.',
    icon: XCircle,
    variant: 'error',
    canRetry: true,
    actionText: 'Попробовать снова',
  },
  NETWORK_ERROR: {
    title: 'Ошибка сети',
    message: 'Проверьте подключение к интернету и попробуйте снова.',
    icon: AlertCircle,
    variant: 'error',
    canRetry: true,
    actionText: 'Попробовать снова',
  },
  UNKNOWN_ERROR: {
    title: 'Произошла ошибка',
    message: 'Что-то пошло не так. Пожалуйста, попробуйте снова или обратитесь в поддержку.',
    icon: AlertCircle,
    variant: 'error',
    canRetry: true,
    actionText: 'Попробовать снова',
  },
};

interface GenerationErrorStateProps {
  errorType: ErrorType;
  onRetry?: () => void;
  onReset?: () => void;
  customMessage?: string;
}

export function GenerationErrorState({
  errorType,
  onRetry,
  onReset,
  customMessage,
}: GenerationErrorStateProps) {
  const errorInfo = errorMap[errorType] || errorMap.UNKNOWN_ERROR;
  const IconComponent = errorInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center p-8 space-y-6"
    >
      {/* Error Icon with Animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={`
          w-20 h-20 rounded-full flex items-center justify-center
          ${errorInfo.variant === 'error' ? 'bg-red-100 dark:bg-red-900/20' : ''}
          ${errorInfo.variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/20' : ''}
          ${errorInfo.variant === 'info' ? 'bg-blue-100 dark:bg-blue-900/20' : ''}
        `}
      >
        <IconComponent
          className={`
            w-10 h-10
            ${errorInfo.variant === 'error' ? 'text-red-600 dark:text-red-400' : ''}
            ${errorInfo.variant === 'warning' ? 'text-amber-600 dark:text-amber-400' : ''}
            ${errorInfo.variant === 'info' ? 'text-blue-600 dark:text-blue-400' : ''}
          `}
        />
      </motion.div>

      {/* Error Alert */}
      <Alert
        variant={errorInfo.variant === 'error' ? 'destructive' : 'default'}
        className="max-w-lg"
      >
        <AlertTitle className="text-lg font-semibold mb-2">
          {errorInfo.title}
        </AlertTitle>
        <AlertDescription className="text-base">
          {customMessage || errorInfo.message}
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        {errorInfo.canRetry && onRetry && (
          <Button onClick={onRetry} size="lg" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {errorInfo.actionText || 'Попробовать снова'}
          </Button>
        )}
        {onReset && (
          <Button
            onClick={onReset}
            variant="outline"
            size="lg"
            className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Начать заново
          </Button>
        )}
      </div>

      {/* Additional Help Text */}
      {errorInfo.variant === 'error' && (
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Если проблема повторяется, пожалуйста, обратитесь в{' '}
          <a href="/support" className="text-primary hover:underline">
            службу поддержки
          </a>
        </p>
      )}
    </motion.div>
  );
}

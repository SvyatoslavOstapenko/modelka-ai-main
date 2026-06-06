/**
 * Типы ошибок для клиента
 * Эти коды безопасно передавать на фронтенд
 */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'CONCURRENCY_LIMIT'
  | 'INSUFFICIENT_CREDITS'
  | 'PLAN_RESTRICTION'
  | 'INTERNAL_ERROR'
  | 'IMAGE_LOAD_ERROR'
  | 'CONTENT_MODERATION'
  | 'VALIDATION_ERROR'
  | 'THIRD_PARTY_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'PIPELINE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Стандартный ответ с ошибкой
 */
export interface ErrorResponse {
  success: false;
  errorCode: ErrorCode;
  message?: string; // Опционально, для отладки в dev режиме
}

/**
 * Маппинг ошибок Fashn API на наши коды
 */
export function mapFashnError(error: unknown): ErrorCode {
  const errorMessage = typeof error === 'string'
    ? error
    : (error as { message?: string; name?: string })?.message || String(error);

  const lowerMessage = errorMessage.toLowerCase();
  const errorName = (error as { name?: string })?.name?.toLowerCase() || '';

  // API-Level Errors (HTTP коды)
  if (lowerMessage.includes('bad request') || lowerMessage.includes('invalid request')) {
    return 'BAD_REQUEST';
  }
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('invalid api key')) {
    return 'UNAUTHORIZED';
  }
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return 'NOT_FOUND';
  }
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return 'RATE_LIMIT';
  }
  if (lowerMessage.includes('concurrency limit') || lowerMessage.includes('concurrent predictions')) {
    return 'CONCURRENCY_LIMIT';
  }
  if (lowerMessage.includes('out of credits') || lowerMessage.includes('no api credits')) {
    return 'INSUFFICIENT_CREDITS';
  }
  if (lowerMessage.includes('internal server') || lowerMessage.includes('500')) {
    return 'INTERNAL_ERROR';
  }

  // Runtime Errors
  if (
    lowerMessage.includes('image load') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('decode') ||
    errorName.includes('imageloaderror')
  ) {
    return 'IMAGE_LOAD_ERROR';
  }
  if (
    lowerMessage.includes('content moderation') ||
    lowerMessage.includes('policy') ||
    lowerMessage.includes('safety system') ||
    lowerMessage.includes('blocked by our safety') ||
    lowerMessage.includes('adjust your prompt') ||
    lowerMessage.includes('image inputs') ||
    errorName.includes('contentmoderationerror')
  ) {
    return 'CONTENT_MODERATION';
  }
  if (
    lowerMessage.includes('validation') ||
    lowerMessage.includes('invalid') ||
    errorName.includes('fashnvalidationerror') ||
    errorName.includes('inputvalidationerror')
  ) {
    return 'VALIDATION_ERROR';
  }
  if (
    lowerMessage.includes('third party') ||
    lowerMessage.includes('upstream') ||
    errorName.includes('thirdpartyerror')
  ) {
    return 'THIRD_PARTY_ERROR';
  }
  if (
    lowerMessage.includes('unavailable') ||
    lowerMessage.includes('overload') ||
    errorName.includes('unavailableerror')
  ) {
    return 'SERVICE_UNAVAILABLE';
  }
  if (lowerMessage.includes('pipeline') || errorName.includes('pipelineerror')) {
    return 'PIPELINE_ERROR';
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed')) {
    return 'NETWORK_ERROR';
  }

  // Проверка недостатка кредитов у нас (не у Fashn)
  if (lowerMessage.includes('insufficient credits') || lowerMessage.includes('недостаточно')) {
    return 'INSUFFICIENT_CREDITS';
  }

  return 'UNKNOWN_ERROR';
}

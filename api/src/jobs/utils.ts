import { logger } from '@/lib/logger'

/**
 * Formata duração em milissegundos para string legível
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`
  return `${(ms / 3600000).toFixed(1)}h`
}

/**
 * Cria um resumo de execução do job
 */
export function createJobSummary(
  jobKey: string,
  processed: number,
  errors: number,
  duration: number
): string {
  const durationStr = formatDuration(duration)
  const successRate = processed > 0 ? (((processed - errors) / processed) * 100).toFixed(1) : '0'

  return `Job ${jobKey}: ${processed} processados, ${errors} erros, ${durationStr} (${successRate}% sucesso)`
}

/**
 * Log estruturado para jobs
 */
export function logJobResult(
  jobKey: string,
  result: { processed: number; errors: number; duration: number; success: boolean }
): void {
  const summary = createJobSummary(jobKey, result.processed, result.errors, result.duration)

  if (result.success) {
    logger.info({ jobKey, ...result }, `✅ ${summary}`)
  } else {
    logger.warn({ jobKey, ...result }, `⚠️ ${summary}`)
  }
}

/**
 * Retry com backoff exponencial
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        throw lastError
      }

      const delay = baseDelay * 2 ** (attempt - 1)
      logger.warn(
        { attempt, maxRetries, delay, error: lastError.message },
        `Tentativa ${attempt} falhou, tentando novamente em ${delay}ms`
      )

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

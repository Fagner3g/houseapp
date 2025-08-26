import { z } from 'zod'

// 1) Schema só das vars que realmente usa, com prefixo VITE_
const envSchema = z.object({
  VITE_API_HOST: z.url('VITE_API_HOST deve ser uma URL válida'),
  // Opcional - para desenvolvimento local
  VITE_OPENAPI_URL: z.url().optional(),
  KUBB_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
})

// 2) Parse direto numa *narrowed* object, não no import.meta.env inteiro
const result = envSchema.safeParse({
  VITE_API_HOST: import.meta.env.VITE_API_HOST,
  VITE_OPENAPI_URL: import.meta.env.VITE_OPENAPI_URL,
  KUBB_LOG_LEVEL: import.meta.env.KUBB_LOG_LEVEL,
})

if (!result.success) {
  console.error('🚨 Variáveis de ambiente inválidas:', z.treeifyError(result.error))
  throw new Error('Falha na validação das env vars')
}

export const env = result.data

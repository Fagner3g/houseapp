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
  const issues = result.error.issues
    .map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')

  // Loga no console do navegador/SSR para facilitar diagnóstico
  // Vite/produção: esse log aparecerá no console do runtime
  // Formato compacto e legível
  // eslint-disable-next-line no-console
  console.error(`\n[ENV] Falha na validação das variáveis de ambiente (web):\n${issues}\n`)
  throw new Error('Falha na validação das env vars')
}

export const env = result.data

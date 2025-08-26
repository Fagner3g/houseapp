import z from 'zod'

const envSchema = z.object({
  // Database Connection
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().default('houseapp'),
  DB_SSL: z.preprocess(val => val === 'true', z.boolean()).default(false),

  // Legacy DATABASE_URL (optional - for backward compatibility)
  DATABASE_URL: z.url().optional(),

  JWT_SECRET: z.string(),
  WEB_URL: z.url(),
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  // Metrics
  METRICS_PREFIX: z.string().default('app_'),
  // Logging
  LOG_LEVEL: z.string().default('info'),
  LOG_FASTIFY: z.preprocess(val => val === 'true', z.boolean()).default(false),
  LOG_SQL: z.preprocess(val => val === 'true', z.boolean()).default(false),
  // WhatsApp
  EVOLUTION_BASE_URL: z.url().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map(i => `- ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')

  // Loga de forma explícita no console para facilitar diagnóstico em VPS
  // Mantém formato compacto e fácil de ler em logs
  console.error('\n[ENV] Falha na validação das variáveis de ambiente:\n' + issues + '\n')

  throw new Error('Invalid environment variables')
}

export const env = parsed.data

// Generate DATABASE_URL from individual variables if not provided
export function getDatabaseUrl(): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL
  }

  const sslParam = env.DB_SSL ? '?sslmode=require' : ''
  return `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}${sslParam}`
}

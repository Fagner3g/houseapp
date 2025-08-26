import z from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string(),
  WEB_URL: z.url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  METRICS_PREFIX: z.string().default('app_'),
  // Logging (opcional)
  LOG_FASTIFY: z.preprocess(val => val === 'true', z.boolean()).default(false),
  LOG_SQL: z.preprocess(val => val === 'true', z.boolean()).default(false),
  // WhatsApp Integration (opcional)
  EVOLUTION_BASE_URL: z.string().url().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
})

export const env = envSchema.parse(process.env)

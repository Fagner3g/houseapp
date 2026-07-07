import z from 'zod'

import { toBool } from '@/lib/helpers'

const envSchema = z.object({
  // Database Connection
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().default('houseapp_v2'),

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
  LOG_STACK: z.preprocess(toBool, z.boolean()).default(false),
  LOG_FASTIFY: z.preprocess(toBool, z.boolean()).default(false),
  LOG_SQL: z.preprocess(toBool, z.boolean()).default(false),
  // Jobs — alertas desligados em dev por padrão; defina true para testar localmente
  JOBS_ALERTS_ENABLED: z.preprocess(toBool, z.boolean()).optional(),
  // WhatsApp
  EVOLUTION_BASE_URL: z.url().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  // SMTP (Mailtrap)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Brevo API
  BREVO_API_KEY: z.string().optional(),
  MAIL_FROM_EMAIL: z.string().optional(),
  MAIL_FROM_NAME: z.string().optional(),
  BRAPI_TOKEN: z.string().optional(),
  // LLM AI providers
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  AI_REPORT_PROVIDER: z.enum(['groq', 'gemini', 'deepseek']).default('groq'),
  // Storage
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('uploads'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
})

const parsed = envSchema.parse(process.env)

export const env = {
  ...parsed,
  jobsAlertsEnabled:
    parsed.JOBS_ALERTS_ENABLED ?? parsed.NODE_ENV !== 'development',
}

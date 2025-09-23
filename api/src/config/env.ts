import z from 'zod'

import { toBool } from '@/lib/helpers'

const envSchema = z.object({
  // Database Connection
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().default('houseapp'),

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
})

export const env = envSchema.parse(process.env)

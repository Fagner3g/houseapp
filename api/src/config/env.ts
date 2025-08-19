import z from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_SECRETT: z.string(),
  WEB_URL: z.url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  METRICS_PREFIX: z.string().default('app_'),
  LOG_FASTIFY: z.preprocess(val => val === 'true', z.boolean()).default(false),
  LOG_SQL: z.preprocess(val => val === 'true', z.boolean()).default(false),
  CRON_ENABLED: z.preprocess(val => val === 'true', z.boolean()).default(false),
  MAIL_FROM: z.string().default('no-reply@houseapp.local'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
})

export const env = envSchema.parse(process.env)

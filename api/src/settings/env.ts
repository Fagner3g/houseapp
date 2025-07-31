import z from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_SECRETT: z.string(),
  WEB_URL: z.url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.number().default(3333),
})

export const env = envSchema.parse(process.env)

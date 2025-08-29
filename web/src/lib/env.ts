import { z } from 'zod'

// 1) Schema só das vars que realmente usa, com prefixo VITE_
const envSchema = z.object({
  VITE_API_HOST: z.url('VITE_API_HOST deve ser uma URL válida'),
})

// 2) Parse direto numa *narrowed* object, não no import.meta.env inteiro
const result = envSchema.safeParse({
  VITE_API_HOST: import.meta.env.VITE_API_HOST,
})

export const env = result.data

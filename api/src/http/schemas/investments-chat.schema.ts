import z from 'zod'

const llmMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

export const investmentsChatSchema = {
  body: z.object({
    message: z.string().min(1).max(2000),
    provider: z.enum(['groq', 'gemini', 'deepseek']),
    history: z.array(llmMessageSchema).max(20).default([]),
    image: z.string().optional(), // data URL base64
  }),
}

export const listAiProvidersSchema = {}

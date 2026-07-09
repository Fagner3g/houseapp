import z from 'zod'

const providerNameSchema = z.enum(['groq', 'gemini', 'deepseek'])

const slugParams = z.object({ slug: z.string() })

const chatHistorySchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
})

export const aiChatBodySchema = z.object({
  message: z.string().min(1),
  history: z.array(chatHistorySchema).optional(),
  provider: providerNameSchema.optional(),
})

export const aiActionBodySchema = z.object({
  actionId: z.string().min(1),
})

const providerResponseSchema = z.object({
  name: providerNameSchema,
  label: z.string(),
})

export const listAiProvidersSchema = {
  tags: ['AI'],
  description: 'List available LLM providers',
  operationId: 'listAiProviders',
  params: slugParams,
  response: {
    200: z.object({
      providers: z.array(providerResponseSchema),
    }),
  },
}

export const aiChatSchema = {
  tags: ['AI'],
  description: 'Stream AI chat with action previews (SSE)',
  operationId: 'aiChat',
  params: slugParams,
  body: aiChatBodySchema,
}

export const confirmAiActionSchema = {
  tags: ['AI'],
  description: 'Confirm and execute a pending AI action',
  operationId: 'confirmAiAction',
  params: slugParams,
  body: aiActionBodySchema,
  response: {
    200: z.object({
      success: z.literal(true),
      action: z.string(),
      entityId: z.string(),
      result: z.unknown(),
    }),
  },
}

export const rejectAiActionSchema = {
  tags: ['AI'],
  description: 'Reject/cancel a pending AI action',
  operationId: 'rejectAiAction',
  params: slugParams,
  body: aiActionBodySchema,
  response: {
    200: z.object({
      success: z.literal(true),
    }),
  },
}

export type AiChatBody = z.infer<typeof aiChatBodySchema>
export type AiActionBody = z.infer<typeof aiActionBodySchema>

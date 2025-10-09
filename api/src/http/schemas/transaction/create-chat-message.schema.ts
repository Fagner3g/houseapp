import z from 'zod'

const createChatMessageBodySchema = z.object({
  message: z.string().min(1, 'Mensagem é obrigatória').max(1000, 'Mensagem muito longa'),
})

const createChatMessageResponseSchema = z.object({
  id: z.string(),
  message: z.string(),
  createdAt: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string(),
    avatarUrl: z.string().optional(),
  }),
})

export const createChatMessageSchema = {
  tags: ['Transaction Chat'],
  description: 'Create a new chat message for a transaction',
  operationId: 'createChatMessage',
  params: z.object({
    slug: z.string(),
    transactionId: z.string(),
  }),
  body: createChatMessageBodySchema,
  response: {
    201: createChatMessageResponseSchema,
    404: z.object({
      message: z.string(),
    }),
    400: z.object({
      message: z.string(),
    }),
  },
}

export type CreateChatMessageSchemaParams = z.infer<typeof createChatMessageSchema.params>
export type CreateChatMessageSchemaBody = z.infer<typeof createChatMessageSchema.body>
export type CreateChatMessageSchemaResponse = z.infer<typeof createChatMessageSchema.response>

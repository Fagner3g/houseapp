import z from 'zod'

const chatMessageSchema = z.object({
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

const paginationSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  totalCount: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
})

const listChatMessagesResponseSchema = z.object({
  messages: z.array(chatMessageSchema),
  pagination: paginationSchema,
})

export const listChatMessagesSchema = {
  tags: ['Transaction Chat'],
  description: 'List chat messages for a transaction',
  operationId: 'listChatMessages',
  params: z.object({
    slug: z.string(),
    transactionId: z.string(),
  }),
  querystring: z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
  }),
  response: {
    200: listChatMessagesResponseSchema,
    404: z.object({
      message: z.string(),
    }),
  },
}

export type ListChatMessagesSchemaParams = z.infer<typeof listChatMessagesSchema.params>
export type ListChatMessagesSchemaQuerystring = z.infer<typeof listChatMessagesSchema.querystring>
export type ListChatMessagesSchemaResponse = z.infer<typeof listChatMessagesSchema.response>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatPagination = z.infer<typeof paginationSchema>

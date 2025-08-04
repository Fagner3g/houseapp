import z from 'zod'

export const validateTokenSchema = {
  tags: ['Auth'],
  description: 'Validate Token',
  operationId: 'validateToken',
  body: z.object({
    token: z.string(),
  }),
  response: {
    200: z.object({
      valid: z.boolean(),
      slug: z.string().optional(),
    }),
  },
}

export type ValidateTokenSchemaBody = z.infer<typeof validateTokenSchema.body>

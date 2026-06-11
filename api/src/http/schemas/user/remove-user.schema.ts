import { StatusCodes } from 'http-status-codes'
import z from 'zod'

export const removeUserSchema = {
  tags: ['user'],
  summary: 'Remove user from organization or delete account',
  operationId: 'removeUserFromOrg',
  params: z.object({ slug: z.string() }),
  body: z.object({
    userId: z.string(),
    mode: z.enum(['deactivate', 'delete']),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      mode: z.enum(['deactivate', 'delete']),
    }),
  },
}

export type RemoveUserBody = z.infer<typeof removeUserSchema.body>

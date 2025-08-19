import { StatusCodes } from 'http-status-codes'
import z from 'zod'

export const deleteNotificationPolicySchema = {
  tags: ['Notifications'],
  description: 'Delete notification policy',
  operationId: 'deleteNotificationPolicy',
  params: z.object({ slug: z.string(), id: z.coerce.number().int() }),
  response: {
    [StatusCodes.OK]: z.null(),
  },
}

export type DeleteNotificationPolicySchemaParams = z.infer<typeof deleteNotificationPolicySchema.params>

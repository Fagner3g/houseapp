import { StatusCodes } from 'http-status-codes'
import z from 'zod'

const policySchema = z.object({
  id: z.number(),
  scope: z.enum(['transaction', 'goal']),
  event: z.enum(['due_soon', 'overdue']),
  days_before: z.number().int().nullable().optional(),
  days_overdue: z.number().int().nullable().optional(),
  repeat_every_minutes: z.number().int().nullable().optional(),
  max_occurrences: z.number().int().nullable().optional(),
  channels: z.string(),
  active: z.boolean(),
})

export const listNotificationPoliciesSchema = {
  tags: ['Notifications'],
  description: 'List notification policies',
  operationId: 'listNotificationPolicies',
  params: z.object({ slug: z.string() }),
  response: {
    [StatusCodes.OK]: z.object({ policies: z.array(policySchema) }),
  },
}

export type ListNotificationPoliciesSchemaParams = z.infer<typeof listNotificationPoliciesSchema.params>
export type ListNotificationPoliciesSchemaResponse = z.infer<typeof listNotificationPoliciesSchema.response>[StatusCodes.OK]

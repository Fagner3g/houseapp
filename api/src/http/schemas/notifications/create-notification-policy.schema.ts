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

export const createNotificationPolicySchema = {
  tags: ['Notifications'],
  description: 'Create notification policy',
  operationId: 'createNotificationPolicy',
  params: z.object({ slug: z.string() }),
  body: z
    .object({
      scope: z.enum(['transaction', 'goal']),
      event: z.enum(['due_soon', 'overdue']),
      days_before: z.number().int().nonnegative().nullable().optional(),
      days_overdue: z.number().int().nonnegative().nullable().optional(),
      repeat_every_minutes: z.number().int().positive().nullable().optional(),
      max_occurrences: z.number().int().positive().nullable().optional(),
      channels: z.string(),
      active: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.event === 'due_soon') {
        if (data.days_before == null) {
          ctx.addIssue({
            code: 'custom',
            path: ['days_before'],
            message: 'days_before is required for due_soon',
          })
        }
        if (data.days_overdue != null) {
          ctx.addIssue({
            code: 'custom',
            path: ['days_overdue'],
            message: 'days_overdue not allowed for due_soon',
          })
        }
      }
      if (data.event === 'overdue') {
        if (data.days_overdue == null) {
          ctx.addIssue({
            code: 'custom',
            path: ['days_overdue'],
            message: 'days_overdue is required for overdue',
          })
        }
        if (data.days_before != null) {
          ctx.addIssue({
            code: 'custom',
            path: ['days_before'],
            message: 'days_before not allowed for overdue',
          })
        }
      }
    }),
  response: {
    [StatusCodes.CREATED]: z.object({ policy: policySchema }),
  },
}

export type CreateNotificationPolicySchemaParams = z.infer<typeof createNotificationPolicySchema.params>
export type CreateNotificationPolicySchemaBody = z.infer<typeof createNotificationPolicySchema.body>
export type CreateNotificationPolicySchemaResponse = z.infer<typeof createNotificationPolicySchema.response>[StatusCodes.CREATED]

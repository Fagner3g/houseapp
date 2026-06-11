import { StatusCodes } from 'http-status-codes'
import z from 'zod'

export const getAlertSettingsSchema = {
  tags: ['Alerts'],
  description: 'Get organization alert settings',
  operationId: 'getAlertSettings',
  params: z.object({ slug: z.string().nonempty() }),
  response: {
    [StatusCodes.OK]: z.object({
      defaultNotifyHour: z.number().int().min(0).max(23),
      defaultNotifyMinute: z.number().int().min(0).max(59),
    }),
  },
}

export const updateAlertSettingsSchema = {
  tags: ['Alerts'],
  description: 'Update organization alert settings',
  operationId: 'updateAlertSettings',
  params: z.object({ slug: z.string().nonempty() }),
  body: z.object({
    defaultNotifyHour: z.number().int().min(0).max(23),
    defaultNotifyMinute: z.number().int().min(0).max(59),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      defaultNotifyHour: z.number().int().min(0).max(23),
      defaultNotifyMinute: z.number().int().min(0).max(59),
    }),
  },
}

export type GetAlertSettingsSchemaParams = z.infer<typeof getAlertSettingsSchema.params>
export type UpdateAlertSettingsSchemaParams = z.infer<typeof updateAlertSettingsSchema.params>
export type UpdateAlertSettingsSchemaBody = z.infer<typeof updateAlertSettingsSchema.body>

import z from 'zod'

export const getAlertSettingsSchema = {
  tags: ['Alerts'],
  description: 'Get organization alert settings',
  operationId: 'getAlertSettings',
  params: z.object({ slug: z.string().nonempty() }),
  response: {
    200: z.object({
      defaultNotifyHour: z.number().int().min(0).max(23),
      defaultNotifyMinute: z.number().int().min(0).max(59),
      timezone: z.literal('America/Sao_Paulo'),
      notifyTimeLabel: z.string(),
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
    200: z.object({
      defaultNotifyHour: z.number().int().min(0).max(23),
      defaultNotifyMinute: z.number().int().min(0).max(59),
      timezone: z.literal('America/Sao_Paulo'),
      notifyTimeLabel: z.string(),
    }),
  },
}

export type GetAlertSettingsSchemaParams = z.infer<typeof getAlertSettingsSchema.params>
export type UpdateAlertSettingsSchemaParams = z.infer<typeof updateAlertSettingsSchema.params>
export type UpdateAlertSettingsSchemaBody = z.infer<typeof updateAlertSettingsSchema.body>

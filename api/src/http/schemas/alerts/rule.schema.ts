import { StatusCodes } from 'http-status-codes'
import z from 'zod'

const alertChannelSchema = z.enum(['in_app', 'whatsapp', 'extension'])
const alertRecipientSchema = z.enum(['owner', 'pay_to', 'both', 'none'])
const alertRuleKindSchema = z.enum(['upcoming', 'overdue'])
const alertRuleScopeSchema = z.enum(['organization', 'series'])
const alertRuleTargetSchema = z.enum(['transaction', 'reminder'])

const upcomingConfigSchema = z.object({
  daysBefore: z.array(z.number().int().min(0).max(365)).min(1),
})

const overdueConfigSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().min(1).max(365).default(1),
})

export const alertRuleDtoSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  scope: alertRuleScopeSchema,
  target: alertRuleTargetSchema,
  seriesId: z.string().nullable(),
  kind: alertRuleKindSchema,
  config: z.union([upcomingConfigSchema, overdueConfigSchema]),
  channels: z.array(alertChannelSchema),
  recipients: alertRecipientSchema,
  active: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  seriesTitle: z.string().nullable().optional(),
})

const rulePreviewItemSchema = z.object({
  ruleId: z.string(),
  kind: alertRuleKindSchema,
  occurrenceId: z.string(),
  seriesId: z.string(),
  title: z.string(),
  dueDate: z.string(),
  daysUntilDue: z.number().optional(),
  overdueDays: z.number().optional(),
  amountCents: z.number(),
  channels: z.array(alertChannelSchema),
  recipientUserId: z.string(),
  recipientName: z.string().nullable(),
})

export const listRulesSchema = {
  tags: ['Alerts'],
  description: 'List alert rules for organization',
  operationId: 'listAlertRules',
  params: z.object({ slug: z.string().nonempty() }),
  querystring: z.object({
    scope: alertRuleScopeSchema.optional(),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      rules: z.array(alertRuleDtoSchema),
    }),
  },
}

export const createRuleSchema = {
  tags: ['Alerts'],
  description: 'Create alert rule',
  operationId: 'createAlertRule',
  params: z.object({ slug: z.string().nonempty() }),
  body: z.object({
    scope: alertRuleScopeSchema,
    target: alertRuleTargetSchema.optional().default('transaction'),
    seriesId: z.string().nullable().optional(),
    kind: alertRuleKindSchema,
    config: z.union([upcomingConfigSchema, overdueConfigSchema]),
    channels: z.array(alertChannelSchema).min(1).default(['in_app', 'whatsapp', 'extension']),
    recipients: alertRecipientSchema.default('pay_to'),
  }),
  response: {
    [StatusCodes.CREATED]: z.object({
      rule: alertRuleDtoSchema,
    }),
  },
}

export const updateRuleSchema = {
  tags: ['Alerts'],
  description: 'Update alert rule',
  operationId: 'updateAlertRule',
  params: z.object({
    slug: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  body: z
    .object({
      config: z.union([upcomingConfigSchema, overdueConfigSchema]).optional(),
      channels: z.array(alertChannelSchema).min(1).optional(),
      recipients: alertRecipientSchema.optional(),
      active: z.boolean().optional(),
    })
    .refine(data => Object.keys(data).length > 0, { message: 'At least one field required' }),
  response: {
    [StatusCodes.OK]: z.object({
      rule: alertRuleDtoSchema,
    }),
  },
}

export const deleteRuleSchema = {
  tags: ['Alerts'],
  description: 'Delete alert rule',
  operationId: 'deleteAlertRule',
  params: z.object({
    slug: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  response: {
    [StatusCodes.NO_CONTENT]: z.null(),
  },
}

export const upsertSeriesRuleSchema = {
  tags: ['Alerts'],
  description: 'Upsert series alert rule override',
  operationId: 'upsertSeriesAlertRule',
  params: z.object({
    slug: z.string().nonempty(),
    seriesId: z.string().nonempty(),
  }),
  body: z.object({
    useOrgDefaults: z.boolean(),
    upcoming: upcomingConfigSchema.nullable().optional(),
    overdue: z
      .object({
        frequency: z.enum(['daily', 'weekly', 'monthly', 'never']),
        interval: z.number().int().min(1).max(365).optional(),
      })
      .nullable()
      .optional(),
    channels: z.array(alertChannelSchema).min(1).optional(),
    recipients: alertRecipientSchema.optional(),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      rules: z.array(alertRuleDtoSchema),
      useOrgDefaults: z.boolean(),
    }),
  },
}

export type ListRulesSchemaParams = z.infer<typeof listRulesSchema.params>
export type ListRulesSchemaQuery = z.infer<typeof listRulesSchema.querystring>
export type CreateRuleSchemaBody = z.infer<typeof createRuleSchema.body>
export type UpdateRuleSchemaBody = z.infer<typeof updateRuleSchema.body>
export type UpsertSeriesRuleSchemaBody = z.infer<typeof upsertSeriesRuleSchema.body>

export { rulePreviewItemSchema }

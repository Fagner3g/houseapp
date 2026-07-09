import z from 'zod'

const alertRuleScopeSchema = z.enum(['organization', 'account', 'recurring'])
const alertRuleTriggerTypeSchema = z.enum(['upcoming', 'overdue'])
const alertRuleChannelSchema = z.enum(['in_app', 'whatsapp', 'extension'])

const upcomingConfigSchema = z.object({
  daysBefore: z.array(z.number().int().min(0)).min(1),
})

const overdueConfigSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().min(1),
})

export const alertRuleResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  scope: alertRuleScopeSchema,
  accountId: z.string().nullable(),
  recurringTransactionId: z.string().nullable(),
  triggerType: alertRuleTriggerTypeSchema,
  config: z.union([upcomingConfigSchema, overdueConfigSchema]),
  channels: z.array(alertRuleChannelSchema),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const slugParams = z.object({ slug: z.string() })
const alertRuleParams = slugParams.extend({ id: z.string() })

const createAlertRuleBody = z
  .object({
    scope: alertRuleScopeSchema,
    accountId: z.string().nullable().optional(),
    recurringTransactionId: z.string().nullable().optional(),
    triggerType: alertRuleTriggerTypeSchema,
    config: z.union([upcomingConfigSchema, overdueConfigSchema]),
    channels: z.array(alertRuleChannelSchema).min(1),
  })
  .superRefine((body, ctx) => {
    if (body.triggerType === 'upcoming' && !('daysBefore' in body.config)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Upcoming rules require config.daysBefore',
        path: ['config'],
      })
    }

    if (body.triggerType === 'overdue' && !('frequency' in body.config)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Overdue rules require config.frequency',
        path: ['config'],
      })
    }
  })

const updateAlertRuleBody = z.object({
  config: z.union([upcomingConfigSchema, overdueConfigSchema]).optional(),
  channels: z.array(alertRuleChannelSchema).min(1).optional(),
  isActive: z.boolean().optional(),
})

export const listAlertRulesSchema = {
  tags: ['Alert Rules'],
  description: 'List organization alert rules',
  operationId: 'listAlertRules',
  params: slugParams,
  response: {
    200: z.object({ rules: z.array(alertRuleResponseSchema) }),
  },
}

export const createAlertRuleSchema = {
  tags: ['Alert Rules'],
  description: 'Create alert rule',
  operationId: 'createAlertRule',
  params: slugParams,
  body: createAlertRuleBody,
  response: {
    201: z.object({ rule: alertRuleResponseSchema }),
  },
}

export const updateAlertRuleSchema = {
  tags: ['Alert Rules'],
  description: 'Update alert rule',
  operationId: 'updateAlertRule',
  params: alertRuleParams,
  body: updateAlertRuleBody,
  response: {
    200: z.object({ rule: alertRuleResponseSchema }),
  },
}

export const deleteAlertRuleSchema = {
  tags: ['Alert Rules'],
  description: 'Delete alert rule',
  operationId: 'deleteAlertRule',
  params: alertRuleParams,
  response: {
    204: z.null(),
  },
}

const evaluateAlertRulesBody = z.object({
  mode: z.enum(['all', 'upcoming', 'overdue']).default('all'),
})

export const evaluateAlertRulesSchema = {
  tags: ['Alert Rules'],
  description: 'Manually evaluate alert rules for the organization',
  operationId: 'evaluateAlertRules',
  params: slugParams,
  body: evaluateAlertRulesBody,
  response: {
    200: z.object({
      processed: z.number(),
      errors: z.number(),
      mode: z.enum(['all', 'upcoming', 'overdue']),
    }),
  },
}

export type CreateAlertRuleBody = z.infer<typeof createAlertRuleBody>
export type UpdateAlertRuleBody = z.infer<typeof updateAlertRuleBody>
export type EvaluateAlertRulesBody = z.infer<typeof evaluateAlertRulesBody>

const manualAlertTargetSchema = z.object({
  key: z.string(),
  name: z.string(),
  type: z.enum(['member', 'contact']),
  phone: z.string().nullable(),
  userId: z.string().nullable(),
})

export const listManualAlertTargetsSchema = {
  tags: ['Alert Rules'],
  description: 'List members and split contacts available for manual alerts',
  operationId: 'listManualAlertTargets',
  params: slugParams,
  response: {
    200: z.object({
      targets: z.array(manualAlertTargetSchema),
    }),
  },
}

const sendManualAlertBody = z
  .object({
    targetKey: z.string().optional(),
    userId: z.string().optional(),
    type: z.enum(['overdue', 'upcoming', 'monthly-summary']),
    sendWhatsapp: z.boolean().optional().default(true),
  })
  .superRefine((body, ctx) => {
    if (!body.targetKey && !body.userId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Either targetKey or userId is required',
        path: ['targetKey'],
      })
    }
  })

export const sendManualAlertSchema = {
  tags: ['Alert Rules'],
  description: 'Manually send alerts for a specific organization member or split contact',
  operationId: 'sendManualAlert',
  params: slugParams,
  body: sendManualAlertBody,
  response: {
    200: z.object({
      sent: z.number(),
      errors: z.number(),
      type: z.enum(['overdue', 'upcoming', 'monthly-summary']),
    }),
  },
}

export type SendManualAlertBody = z.infer<typeof sendManualAlertBody>

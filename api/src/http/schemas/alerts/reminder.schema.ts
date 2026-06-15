import { StatusCodes } from 'http-status-codes'
import z from 'zod'

const reminderChannelSchema = z.enum(['in_app', 'whatsapp', 'extension'])
const recurrenceTypeSchema = z.enum(['weekly', 'monthly', 'yearly'])
const notifyHourSchema = z.number().int().min(0).max(23).nullable()
const notifyMinuteSchema = z.number().int().min(0).max(59).nullable()

export const reminderDtoSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  createdBy: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  dueDate: z.string(),
  amountCents: z.number().nullable(),
  daysBefore: z.array(z.number()),
  useOrgAlertDefaults: z.boolean(),
  overdueAlertFrequency: z.enum(['daily', 'weekly', 'monthly']).nullable(),
  overdueAlertInterval: z.number().int().min(1),
  channels: z.array(reminderChannelSchema),
  recipientUserId: z.string(),
  recipientName: z.string().nullable(),
  active: z.boolean(),
  completedAt: z.string().nullable(),
  isRecurring: z.boolean(),
  recurrenceType: recurrenceTypeSchema.nullable(),
  recurrenceInterval: z.number().int().min(1),
  recurrenceUntil: z.string().nullable(),
  notifyHour: notifyHourSchema,
  notifyMinute: notifyMinuteSchema,
  linkedSeriesId: z.string().nullable(),
  snoozedUntil: z.string().nullable(),
  lastCompletedPeriodKey: z.string().nullable(),
  generatesTransaction: z.boolean(),
  defaultPayToId: z.string().nullable(),
  transactionType: z.enum(['expense', 'income']),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const transactionTypeSchema = z.enum(['expense', 'income'])

const reminderBodyFields = {
  title: z.string().min(1).max(200),
  notes: z.string().max(1000).nullable().optional(),
  dueDate: z.string().datetime(),
  amountCents: z.number().int().nonnegative().nullable().optional(),
  daysBefore: z.array(z.number().int().min(0).max(365)).min(1).default([1, 0]),
  useOrgAlertDefaults: z.boolean().optional().default(true),
  overdueAlertFrequency: z.enum(['daily', 'weekly', 'monthly']).nullable().optional(),
  overdueAlertInterval: z.number().int().min(1).optional().default(1),
  channels: z.array(reminderChannelSchema).min(1).default(['in_app', 'whatsapp', 'extension']),
  recipientUserId: z.string(),
  linkedSeriesId: z.string().nullable().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceType: recurrenceTypeSchema.nullable().optional(),
  recurrenceInterval: z.number().int().min(1).optional().default(1),
  recurrenceUntil: z.string().datetime().nullable().optional(),
  notifyHour: notifyHourSchema.optional(),
  notifyMinute: notifyMinuteSchema.optional(),
  generatesTransaction: z.boolean().optional().default(false),
  defaultPayToId: z.string().nullable().optional(),
  transactionType: transactionTypeSchema.optional().default('expense'),
}

const generatesTransactionRefinement = <
  T extends { generatesTransaction?: boolean; defaultPayToId?: string | null },
>(
  data: T
) => !data.generatesTransaction || !!data.defaultPayToId

const recurringRefinement = <T extends { isRecurring?: boolean; recurrenceType?: string | null }>(
  data: T
) => !data.isRecurring || !!data.recurrenceType

export const listRemindersSchema = {
  tags: ['Alerts'],
  description: 'List custom reminders for organization',
  operationId: 'listReminders',
  params: z.object({ slug: z.string().nonempty() }),
  querystring: z.object({
    includeCompleted: z.coerce.boolean().optional(),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      reminders: z.array(reminderDtoSchema),
    }),
  },
}

export const createReminderSchema = {
  tags: ['Alerts'],
  description: 'Create custom reminder',
  operationId: 'createReminder',
  params: z.object({ slug: z.string().nonempty() }),
  body: z
    .object(reminderBodyFields)
    .refine(recurringRefinement, {
      message: 'recurrenceType is required when isRecurring is true',
    })
    .refine(generatesTransactionRefinement, {
      message: 'defaultPayToId is required when generatesTransaction is true',
    }),
  response: {
    [StatusCodes.CREATED]: z.object({
      reminder: reminderDtoSchema,
    }),
  },
}

export const updateReminderSchema = {
  tags: ['Alerts'],
  description: 'Update custom reminder',
  operationId: 'updateReminder',
  params: z.object({
    slug: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  body: z
    .object({
      title: z.string().min(1).max(200).optional(),
      notes: z.string().max(1000).nullable().optional(),
      dueDate: z.string().datetime().optional(),
      amountCents: z.number().int().nonnegative().nullable().optional(),
      daysBefore: z.array(z.number().int().min(0).max(365)).min(1).optional(),
      useOrgAlertDefaults: z.boolean().optional(),
      overdueAlertFrequency: z.enum(['daily', 'weekly', 'monthly']).nullable().optional(),
      overdueAlertInterval: z.number().int().min(1).optional(),
      channels: z.array(reminderChannelSchema).min(1).optional(),
      recipientUserId: z.string().optional(),
      active: z.boolean().optional(),
      linkedSeriesId: z.string().nullable().optional(),
      isRecurring: z.boolean().optional(),
      recurrenceType: recurrenceTypeSchema.nullable().optional(),
      recurrenceInterval: z.number().int().min(1).optional(),
      recurrenceUntil: z.string().datetime().nullable().optional(),
      notifyHour: notifyHourSchema.optional(),
      notifyMinute: notifyMinuteSchema.optional(),
      generatesTransaction: z.boolean().optional(),
      defaultPayToId: z.string().nullable().optional(),
      transactionType: transactionTypeSchema.optional(),
    })
    .refine(data => Object.keys(data).length > 0, { message: 'At least one field required' })
    .refine(data => recurringRefinement(data), {
      message: 'recurrenceType is required when isRecurring is true',
    })
    .refine(data => generatesTransactionRefinement(data), {
      message: 'defaultPayToId is required when generatesTransaction is true',
    }),
  response: {
    [StatusCodes.OK]: z.object({
      reminder: reminderDtoSchema,
    }),
  },
}

export const completeReminderSchema = {
  tags: ['Alerts'],
  description: 'Permanently end reminder (deactivate)',
  operationId: 'completeReminder',
  params: z.object({
    slug: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      reminder: reminderDtoSchema,
    }),
  },
}

export const completeReminderPeriodSchema = {
  tags: ['Alerts'],
  description: 'Mark reminder as done for current period and advance due date',
  operationId: 'completeReminderPeriod',
  params: z.object({
    slug: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      reminder: reminderDtoSchema,
    }),
  },
}

export const uncompleteReminderPeriodSchema = {
  tags: ['Alerts'],
  description: 'Undo completion for a reminder occurrence and roll back due date',
  operationId: 'uncompleteReminderPeriod',
  params: z.object({
    slug: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  body: z.object({
    occurrenceDate: z
      .string()
      .refine(value => !Number.isNaN(Date.parse(value)), {
        message: 'occurrenceDate must be a valid date',
      }),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      reminder: reminderDtoSchema,
    }),
  },
}

export const completeReminderPeriodWithTransactionSchema = {
  tags: ['Alerts'],
  description: 'Complete reminder period and register a one-off transaction',
  operationId: 'completeReminderPeriodWithTransaction',
  params: z.object({
    slug: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  body: z.object({
    amount: z
      .string()
      .regex(
        /^-?\d+(\.\d{1,2})?$/,
        'Use ponto como separador decimal e no máximo 2 casas (ex.: 1234.56)'
      ),
    date: z
      .string()
      .refine(value => !Number.isNaN(Date.parse(value)), {
        message: 'date must be a valid date',
      })
      .optional(),
    payToEmail: z.string().email().optional(),
    description: z.string().max(1000).optional(),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      reminder: reminderDtoSchema,
      seriesId: z.string(),
      occurrenceId: z.string(),
    }),
  },
}

export const deleteReminderSchema = {
  tags: ['Alerts'],
  description: 'Delete custom reminder',
  operationId: 'deleteReminder',
  params: z.object({
    slug: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  response: {
    [StatusCodes.NO_CONTENT]: z.null(),
  },
}

export const snoozeReminderSchema = {
  tags: ['Alerts'],
  description: 'Snooze custom reminder',
  operationId: 'snoozeReminder',
  params: z.object({
    slug: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  body: z
    .object({
      days: z.number().int().min(1).max(365).optional(),
      until: z.string().datetime().optional(),
    })
    .refine(data => data.days != null || data.until != null, {
      message: 'Either days or until is required',
    }),
  response: {
    [StatusCodes.OK]: z.object({
      reminder: reminderDtoSchema,
    }),
  },
}

export type ListRemindersSchemaParams = z.infer<typeof listRemindersSchema.params>
export type ListRemindersSchemaQuery = z.infer<typeof listRemindersSchema.querystring>
export type CreateReminderSchemaParams = z.infer<typeof createReminderSchema.params>
export type CreateReminderSchemaBody = z.infer<typeof createReminderSchema.body>
export type UpdateReminderSchemaParams = z.infer<typeof updateReminderSchema.params>
export type UpdateReminderSchemaBody = z.infer<typeof updateReminderSchema.body>
export type CompleteReminderSchemaParams = z.infer<typeof completeReminderSchema.params>
export type CompleteReminderPeriodSchemaParams = z.infer<
  typeof completeReminderPeriodSchema.params
>
export type UncompleteReminderPeriodSchemaParams = z.infer<
  typeof uncompleteReminderPeriodSchema.params
>
export type UncompleteReminderPeriodSchemaBody = z.infer<
  typeof uncompleteReminderPeriodSchema.body
>
export type CompleteReminderPeriodWithTransactionSchemaParams = z.infer<
  typeof completeReminderPeriodWithTransactionSchema.params
>
export type CompleteReminderPeriodWithTransactionSchemaBody = z.infer<
  typeof completeReminderPeriodWithTransactionSchema.body
>
export type DeleteReminderSchemaParams = z.infer<typeof deleteReminderSchema.params>
export type SnoozeReminderSchemaParams = z.infer<typeof snoozeReminderSchema.params>
export type SnoozeReminderSchemaBody = z.infer<typeof snoozeReminderSchema.body>

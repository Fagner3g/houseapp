import z from 'zod'

import { toCentsStrict } from '@/http/utils/format'

export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use o formato YYYY-MM')

export const moneyStringSchema = z
  .string()
  .regex(
    /^-?\d+(\.\d{1,2})?$/,
    'Use ponto como separador decimal e no máximo 2 casas (ex.: 1234.56)'
  )
  .transform(val => toCentsStrict(val))

export const quotePreferenceSchema = z.enum(['auto', 'manual', 'auto_with_manual_fallback'])
export const planModeSchema = z.enum(['amount', 'quantity'])
export const progressionTypeSchema = z.enum(['fixed', 'linear_step'])

export const investmentAssetResponseSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  displayName: z.string(),
  assetClass: z.string(),
  quotePreference: quotePreferenceSchema,
  notes: z.string(),
  quantity: z.number(),
  totalInvested: z.number(),
  averagePrice: z.number(),
  currentPrice: z.number(),
  currentPriceSource: z.enum(['auto', 'manual']),
  currentPriceCapturedAt: z.string().nullable(),
  marketValue: z.number(),
  yieldAmount: z.number(),
  yieldPercent: z.number(),
  isActive: z.boolean(),
})

export const investmentPlanResponseSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  assetSymbol: z.string(),
  assetName: z.string(),
  frequency: z.literal('monthly'),
  mode: planModeSchema,
  progressionType: progressionTypeSchema,
  initialAmount: z.number().nullable(),
  initialQuantity: z.number().nullable(),
  stepAmount: z.number().nullable(),
  stepQuantity: z.number().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  active: z.boolean(),
})

export const reminderItemResponseSchema = z.object({
  assetId: z.string(),
  assetSymbol: z.string(),
  assetName: z.string(),
  planId: z.string(),
  referenceMonth: monthKeySchema,
  dueDate: z.string(),
  plannedAmount: z.number().nullable(),
  plannedQuantity: z.number().nullable(),
  status: z.enum(['pending', 'overdue']),
})

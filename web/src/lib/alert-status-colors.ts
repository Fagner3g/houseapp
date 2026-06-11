import type { VariantProps } from 'class-variance-authority'

import { badgeVariants } from '@/components/ui/badge'

export type AlertStatusBadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

/** Shared alert/transaction status colors (matches chrome-extension/popup.css). */
export const ALERT_STATUS_HEX = {
  overdue: '#ef4444',
  upcoming: '#f59e0b',
  reminder: '#8b5cf6',
  partial: '#d97706',
} as const

export const alertStatusIconClass = {
  overdue: 'text-red-500',
  upcoming: 'text-amber-500',
  reminder: 'text-violet-500',
  partial: 'text-amber-500',
} as const

export const alertStatusDotClass = {
  overdue: 'bg-red-500',
  upcoming: 'bg-amber-500',
  reminder: 'bg-violet-500',
  partial: 'bg-amber-500',
} as const

export function getAlertKindBadgeVariant(kind: string): AlertStatusBadgeVariant {
  if (kind.includes('overdue')) return 'destructive'
  if (kind.includes('reminder')) return 'reminder'
  if (kind.includes('upcoming') || kind.endsWith('_due')) return 'warning'
  return 'outline'
}

export function getRuleKindBadgeVariant(kind: 'upcoming' | 'overdue'): AlertStatusBadgeVariant {
  return kind === 'overdue' ? 'destructive' : 'warning'
}

export function getAlertKindIconClass(kind: string): string {
  if (kind.includes('overdue')) return alertStatusIconClass.overdue
  if (kind.includes('reminder')) return alertStatusIconClass.reminder
  if (kind.includes('upcoming') || kind.endsWith('_due')) return alertStatusIconClass.upcoming
  return 'text-muted-foreground'
}

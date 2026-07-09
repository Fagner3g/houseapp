import type { GetTransaction200Transaction } from '@/api/generated/model'
import { formatPhoneInput, normalizePhoneDigits } from '@/lib/phone'

export type NotifyTargetMode = 'member' | 'contact'
export type NotifyDaysMode = 'organization' | 'custom'
export type OverdueNotifyMode = 'organization' | 'custom' | 'disabled'

export type OrgNotifyDefaults = {
  upcomingDays: number[]
  overdueFrequency?: 'daily' | 'weekly' | 'monthly'
  overdueInterval?: number
  hasOverdueRule: boolean
}

export type TransactionNotifyState = {
  notifyEnabled: boolean
  targetMode: NotifyTargetMode
  notifyUserId: string | null
  notifyContactName: string
  notifyContactPhone: string
  notifyDaysMode: NotifyDaysMode
  notifyDaysBefore: number[]
  overdueMode: OverdueNotifyMode
  overdueFrequency: 'daily' | 'weekly' | 'monthly'
  overdueInterval: number
}

export type TransactionNotifyOverdueConfig =
  | { frequency: 'daily' | 'weekly' | 'monthly'; interval: number }
  | { disabled: true }

export const DEFAULT_UPCOMING_DAYS = [1, 3, 7]

export const defaultOrgNotifyDefaults = (): OrgNotifyDefaults => ({
  upcomingDays: DEFAULT_UPCOMING_DAYS,
  hasOverdueRule: false,
  overdueFrequency: 'daily',
  overdueInterval: 1,
})

export const defaultNotifyState = (
  orgDefaults: OrgNotifyDefaults = defaultOrgNotifyDefaults()
): TransactionNotifyState => ({
  notifyEnabled: false,
  targetMode: 'member',
  notifyUserId: null,
  notifyContactName: '',
  notifyContactPhone: '',
  notifyDaysMode: 'organization',
  notifyDaysBefore: orgDefaults.upcomingDays,
  overdueMode: 'organization',
  overdueFrequency: orgDefaults.overdueFrequency ?? 'daily',
  overdueInterval: orgDefaults.overdueInterval ?? 1,
})

function parseOverdueConfig(
  config: TransactionNotifyOverdueConfig | null | undefined,
  orgDefaults: OrgNotifyDefaults
): Pick<TransactionNotifyState, 'overdueMode' | 'overdueFrequency' | 'overdueInterval'> {
  if (config && 'disabled' in config) {
    return {
      overdueMode: 'disabled',
      overdueFrequency: orgDefaults.overdueFrequency ?? 'daily',
      overdueInterval: orgDefaults.overdueInterval ?? 1,
    }
  }

  if (config && 'frequency' in config) {
    return {
      overdueMode: 'custom',
      overdueFrequency: config.frequency,
      overdueInterval: config.interval,
    }
  }

  return {
    overdueMode: 'organization',
    overdueFrequency: orgDefaults.overdueFrequency ?? 'daily',
    overdueInterval: orgDefaults.overdueInterval ?? 1,
  }
}

export function orgNotifyDefaultsFromRules(
  rules: Array<{
    scope: string
    triggerType: string
    isActive: boolean
    config: Record<string, unknown>
  }> | undefined,
  fallback: OrgNotifyDefaults = defaultOrgNotifyDefaults()
): OrgNotifyDefaults {
  const orgRules = rules?.filter(rule => rule.scope === 'organization' && rule.isActive) ?? []

  const upcoming = orgRules.find(rule => rule.triggerType === 'upcoming')
  const overdue = orgRules.find(rule => rule.triggerType === 'overdue')

  const upcomingDays =
    upcoming?.config && 'daysBefore' in upcoming.config && Array.isArray(upcoming.config.daysBefore)
      ? (upcoming.config.daysBefore as number[])
      : fallback.upcomingDays

  const hasOverdueRule = Boolean(overdue?.config && 'frequency' in overdue.config)

  return {
    upcomingDays,
    hasOverdueRule,
    overdueFrequency:
      overdue?.config && 'frequency' in overdue.config
        ? (overdue.config.frequency as OrgNotifyDefaults['overdueFrequency'])
        : fallback.overdueFrequency,
    overdueInterval:
      overdue?.config && 'interval' in overdue.config
        ? (overdue.config.interval as number)
        : fallback.overdueInterval,
  }
}

export function notifyStateFromTransaction(
  tx: Pick<
    GetTransaction200Transaction,
    | 'notifyEnabled'
    | 'notifyTargetType'
    | 'notifyUserId'
    | 'notifyContactName'
    | 'notifyContactPhone'
    | 'notifyDaysBefore'
    | 'notifyOverdueConfig'
  >,
  orgDefaults: OrgNotifyDefaults
): TransactionNotifyState {
  if (!tx.notifyEnabled) {
    return defaultNotifyState(orgDefaults)
  }

  const hasCustomDays = tx.notifyDaysBefore != null && tx.notifyDaysBefore.length > 0
  const overdue = parseOverdueConfig(
    tx.notifyOverdueConfig as TransactionNotifyOverdueConfig | undefined,
    orgDefaults
  )

  return {
    notifyEnabled: true,
    targetMode: tx.notifyTargetType === 'contact' ? 'contact' : 'member',
    notifyUserId: tx.notifyUserId ?? null,
    notifyContactName: tx.notifyContactName ?? '',
    notifyContactPhone: formatPhoneInput(tx.notifyContactPhone ?? ''),
    notifyDaysMode: hasCustomDays ? 'custom' : 'organization',
    notifyDaysBefore: hasCustomDays ? (tx.notifyDaysBefore as number[]) : orgDefaults.upcomingDays,
    ...overdue,
  }
}

export function buildNotifyApiPayload(state: TransactionNotifyState) {
  if (!state.notifyEnabled) {
    return { notifyEnabled: false as const }
  }

  const notifyDaysBefore =
    state.notifyDaysMode === 'organization' ? null : state.notifyDaysBefore

  const notifyOverdueConfig =
    state.overdueMode === 'disabled'
      ? ({ disabled: true } as const)
      : state.overdueMode === 'custom'
        ? {
            frequency: state.overdueFrequency,
            interval: state.overdueInterval,
          }
        : null

  if (state.targetMode === 'member' && state.notifyUserId) {
    return {
      notifyEnabled: true as const,
      notifyTargetType: 'member' as const,
      notifyUserId: state.notifyUserId,
      notifyContactName: null,
      notifyContactPhone: null,
      notifyDaysBefore,
      notifyOverdueConfig,
    }
  }

  if (state.targetMode === 'contact' && state.notifyContactName.trim()) {
    return {
      notifyEnabled: true as const,
      notifyTargetType: 'contact' as const,
      notifyUserId: null,
      notifyContactName: state.notifyContactName.trim(),
      notifyContactPhone: normalizePhoneDigits(state.notifyContactPhone) || null,
      notifyDaysBefore,
      notifyOverdueConfig,
    }
  }

  return { notifyEnabled: false as const }
}

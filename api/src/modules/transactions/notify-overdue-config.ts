import { badRequest } from '@/core/errors'
import type { TransactionNotifyOverdueConfig } from '@/db/schemas/transactions'

export function validateNotifyOverdueConfig(
  config: TransactionNotifyOverdueConfig | null | undefined
): TransactionNotifyOverdueConfig | null {
  if (config == null) return null

  if ('disabled' in config) {
    if (config.disabled !== true) {
      throw badRequest('notifyOverdueConfig.disabled must be true when set')
    }
    return { disabled: true }
  }

  if (!('frequency' in config)) {
    throw badRequest('notifyOverdueConfig must include frequency or disabled')
  }

  const validFrequencies = ['daily', 'weekly', 'monthly'] as const
  if (!validFrequencies.includes(config.frequency)) {
    throw badRequest('notifyOverdueConfig.frequency must be daily, weekly, or monthly')
  }

  if (!Number.isInteger(config.interval) || config.interval < 1) {
    throw badRequest('notifyOverdueConfig.interval must be an integer >= 1')
  }

  return {
    frequency: config.frequency,
    interval: config.interval,
  }
}

export function isOverdueNotifyDisabled(
  config: TransactionNotifyOverdueConfig | null | undefined
): boolean {
  return config != null && 'disabled' in config && config.disabled === true
}

export function isCustomOverdueNotifyConfig(
  config: TransactionNotifyOverdueConfig | null | undefined
): config is { frequency: 'daily' | 'weekly' | 'monthly'; interval: number } {
  return config != null && 'frequency' in config
}

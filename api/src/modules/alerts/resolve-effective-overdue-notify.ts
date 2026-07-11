import type { AlertRuleChannel, OverdueAlertConfig } from '@/db/schemas/alertRules'
import type { TransactionNotifyOverdueConfig } from '@/db/schemas/transactions'
import { isOverdueConfig } from '@/modules/alerts/alert-rule.repository'

import {
  isCustomOverdueNotifyConfig,
  isOverdueNotifyDisabled,
} from '@/modules/transactions/notify-overdue-config'

const DEFAULT_OVERDUE_CHANNELS: AlertRuleChannel[] = ['in_app', 'whatsapp', 'extension']

export type ResolvedOverdueNotify = {
  config: OverdueAlertConfig
  channels: AlertRuleChannel[]
  ruleId: string
}

export function resolveEffectiveOverdueNotify(params: {
  txOverride: TransactionNotifyOverdueConfig | null | undefined
  orgRuleConfig: unknown
  orgRuleId?: string | null
  orgRuleChannels?: AlertRuleChannel[]
}): ResolvedOverdueNotify | null {
  if (isOverdueNotifyDisabled(params.txOverride)) return null

  if (isCustomOverdueNotifyConfig(params.txOverride)) {
    return {
      config: params.txOverride,
      channels: params.orgRuleChannels?.length
        ? params.orgRuleChannels
        : DEFAULT_OVERDUE_CHANNELS,
      ruleId: params.orgRuleId ?? 'tx-overdue-override',
    }
  }

  if (params.orgRuleConfig && isOverdueConfig(params.orgRuleConfig) && params.orgRuleId) {
    return {
      config: params.orgRuleConfig,
      channels: params.orgRuleChannels?.length
        ? params.orgRuleChannels
        : DEFAULT_OVERDUE_CHANNELS,
      ruleId: params.orgRuleId,
    }
  }

  return null
}

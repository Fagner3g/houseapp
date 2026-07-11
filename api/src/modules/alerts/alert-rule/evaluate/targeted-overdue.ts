import { centavosToString } from '@/core/money'

import {
  buildOverdueRuleDedupeKey,
  buildOverdueTitle,
  getOverduePeriodKey,
} from '../../alert-utils'
import type { AlertRuleRecord } from '../../alert-rule.repository'
import { resolveEffectiveOverdueNotify } from '../../resolve-effective-overdue-notify'
import { resolveDueDateForTransaction } from '../due'
import {
  createExternalNotification,
  createNotificationsForOrgMembers,
  createNotificationsForUser,
} from '../notifications'
import type { PendingTransactionRow } from '../types'
import type { EvaluateNotifyDeps } from './deps'
import { buildOverdueDispatchRule, resolveRule } from './resolve-rule'

export async function evaluateTargetedOverdueTransaction(
  deps: EvaluateNotifyDeps,
  params: {
    rules: AlertRuleRecord[]
    transaction: PendingTransactionRow
    daysUntilDue: number
    skipDedupe?: boolean
    limitToUserId?: string
  }
): Promise<number> {
  if (params.daysUntilDue >= 0) return 0

  const pseudoRow = {
    id: params.transaction.id,
    organizationId: params.transaction.organizationId,
    accountId: params.transaction.accountId,
    recurringTransactionId: params.transaction.recurringTransactionId,
    title: params.transaction.title,
    amount: params.transaction.amount,
    date: params.transaction.date,
  }

  const orgRule = resolveRule(params.rules, pseudoRow, 'overdue')
  const resolved = resolveEffectiveOverdueNotify({
    txOverride: params.transaction.notifyOverdueConfig,
    orgRuleConfig: orgRule?.config,
    orgRuleId: orgRule?.id,
    orgRuleChannels: orgRule?.channels,
  })
  if (!resolved) return 0

  const rule = buildOverdueDispatchRule({
    organizationId: params.transaction.organizationId,
    resolved,
  })

  const overdueDays = Math.abs(params.daysUntilDue)
  const periodKey = getOverduePeriodKey(resolved.config.frequency, resolved.config.interval)
  const amount = centavosToString(params.transaction.amount)
  const dueDate = resolveDueDateForTransaction(params.transaction).toISOString()
  const title = buildOverdueTitle(params.transaction.title, overdueDays)
  const body = amount ? `Valor: R$ ${amount} · Vencimento: ${dueDate}` : `Vencimento: ${dueDate}`

  if (params.transaction.notifyTargetType === 'member') {
    return createNotificationsForOrgMembers({
      organizationId: params.transaction.organizationId,
      limitToUserId: params.limitToUserId,
      createForUser: userId =>
        createNotificationsForUser(deps.notificationRepository, {
          rule,
          userId,
          transactionId: params.transaction.id,
          accountId: params.transaction.accountId,
          organizationId: params.transaction.organizationId,
          title,
          body,
          daysUntilDue: params.daysUntilDue,
          daysBefore: 0,
          dedupeKeyBuilder: (memberId, channel) =>
            buildOverdueRuleDedupeKey(
              rule.id,
              params.transaction.id,
              periodKey,
              memberId,
              channel
            ),
          metadata: {
            kind: 'overdue',
            daysUntilDue: params.daysUntilDue,
            overdueDays,
            amount,
            dueDate,
          },
          skipDedupe: params.skipDedupe,
        }),
    })
  }

  if (
    params.transaction.notifyTargetType === 'contact' &&
    params.transaction.notifyContactPhone
  ) {
    return createExternalNotification(deps.notificationRepository, {
      rule,
      transactionId: params.transaction.id,
      phone: params.transaction.notifyContactPhone,
      contactName: params.transaction.notifyContactName,
      title,
      body,
      dedupeKey: `external:${params.transaction.id}:period-${periodKey}:${params.transaction.notifyContactPhone}:whatsapp`,
      metadata: {
        kind: 'overdue',
        daysUntilDue: params.daysUntilDue,
        overdueDays,
        amount,
        dueDate,
        externalPhone: params.transaction.notifyContactPhone,
        externalName: params.transaction.notifyContactName,
      },
    })
  }

  return 0
}

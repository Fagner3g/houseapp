import { centavosToString } from '@/core/money'
import type { SplitRepository } from '@/modules/splits/split.repository'

import {
  buildSplitDebtTitle,
  buildSplitUpcomingDedupeKey,
} from '../../alert-utils'
import { isUpcomingConfig } from '../../alert-rule.repository'
import type { AlertRuleRecord } from '../../alert-rule.repository'
import { resolveDaysUntilDueForSplit, resolveDueDateForSplit } from '../due'
import { createExternalNotification, createNotificationsForUser } from '../notifications'
import type { EvaluateNotifyDeps } from './deps'
import { resolveRule } from './resolve-rule'

export async function evaluateSplitReminders(
  deps: EvaluateNotifyDeps,
  params: {
    rules: AlertRuleRecord[]
    splits: Awaited<ReturnType<SplitRepository['listNotifyEnabledPending']>>
    targetUserId?: string
    skipDedupe?: boolean
  }
): Promise<number> {
  let created = 0

  for (const split of params.splits) {
    if (params.targetUserId) {
      if (split.userId !== params.targetUserId) continue
    }
    const daysUntilDue = resolveDaysUntilDueForSplit(split)
    if (daysUntilDue < 0) continue

    const pseudoTransaction = {
      id: split.transactionId,
      organizationId: split.organizationId,
      accountId: null,
      recurringTransactionId: null,
      title: split.transactionTitle,
      amount: split.amount,
      date: split.transactionDate,
    }

    const rule = resolveRule(params.rules, pseudoTransaction, 'upcoming')
    if (!rule || !isUpcomingConfig(rule.config)) continue

    const matchingDay = rule.config.daysBefore.find(day => day === daysUntilDue)
    if (matchingDay === undefined) continue

    const splitAmount = centavosToString(split.amount)
    const dueDate = resolveDueDateForSplit(split).toISOString()
    const title = buildSplitDebtTitle(split.transactionTitle, daysUntilDue)
    const body = splitAmount
      ? `Valor: R$ ${splitAmount} · Vencimento: ${dueDate}`
      : `Vencimento: ${dueDate}`

    if (split.userId) {
      created += await createNotificationsForUser(deps.notificationRepository, {
        rule,
        userId: split.userId,
        transactionId: split.transactionId,
        accountId: null,
        organizationId: split.organizationId,
        title,
        body,
        daysUntilDue,
        daysBefore: matchingDay,
        dedupeKeyBuilder: (userId, channel) =>
          buildSplitUpcomingDedupeKey(split.id, matchingDay, userId, channel),
        metadata: {
          kind: 'split_upcoming',
          splitId: split.id,
          daysUntilDue,
          daysBefore: matchingDay,
          amount: splitAmount,
          dueDate,
        },
        skipDedupe: params.skipDedupe,
      })
    } else if (split.contactPhone && !params.targetUserId) {
      created += await createExternalNotification(deps.notificationRepository, {
        rule,
        transactionId: split.transactionId,
        phone: split.contactPhone,
        contactName: split.contactName,
        title,
        body,
        dedupeKey: buildSplitUpcomingDedupeKey(
          split.id,
          matchingDay,
          split.contactPhone,
          'whatsapp'
        ),
        metadata: {
          kind: 'split_external',
          splitId: split.id,
          daysUntilDue,
          daysBefore: matchingDay,
          amount: splitAmount,
          dueDate,
          externalPhone: split.contactPhone,
          externalName: split.contactName,
        },
        onSent: async () => {
          await deps.splitRepository.update(split.id, {
            isNotified: true,
            lastNotifiedAt: new Date(),
          })
        },
      })
    }
  }

  return created
}

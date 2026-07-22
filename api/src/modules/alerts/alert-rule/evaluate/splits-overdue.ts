import { centavosToString } from '@/core/money'
import type { SplitRepository } from '@/modules/splits/split.repository'

import {
  buildOverdueTitle,
  buildSplitChargeModeLabel,
  buildSplitOverdueDedupeKey,
  getOverduePeriodKey,
} from '../../alert-utils'
import { stripInstallmentBaseTitle } from '@/core/expense-title'
import { isOverdueConfig } from '../../alert-rule.repository'
import type { AlertRuleRecord } from '../../alert-rule.repository'
import { resolveDaysUntilDueForSplit, resolveDueDateForSplit } from '../due'
import { createExternalNotification, createNotificationsForUser } from '../notifications'
import type { EvaluateNotifyDeps } from './deps'
import { resolveRule } from './resolve-rule'

export async function evaluateSplitOverdueReminders(
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
    if (params.targetUserId && split.userId !== params.targetUserId) continue

    const daysUntilDue = resolveDaysUntilDueForSplit(split)
    if (daysUntilDue >= 0) continue

    const pseudoTransaction = {
      id: split.transactionId,
      organizationId: split.organizationId,
      accountId: null,
      recurringTransactionId: null,
      title: split.transactionTitle,
      amount: split.amount,
      date: split.transactionDate,
    }

    const rule = resolveRule(params.rules, pseudoTransaction, 'overdue')
    if (!rule || !isOverdueConfig(rule.config)) continue

    const overdueDays = Math.abs(daysUntilDue)
    const periodKey = getOverduePeriodKey(rule.config.frequency, rule.config.interval)
    const splitAmount = centavosToString(split.amount)
    const dueDate = resolveDueDateForSplit(split).toISOString()
    const displayTitle = split.collectLumpSum
      ? stripInstallmentBaseTitle(split.transactionTitle)
      : split.transactionTitle
    const title = buildOverdueTitle(displayTitle, overdueDays)
    const chargeMode = buildSplitChargeModeLabel({
      collectLumpSum: split.collectLumpSum,
      collectInstallmentNumber: split.collectInstallmentNumber,
      collectInstallmentsTotal: split.collectInstallmentsTotal,
      installmentNumber: split.installmentNumber,
      installmentsTotal: split.installmentsTotal,
    })
    const body = [
      splitAmount ? `Valor: R$ ${splitAmount}` : null,
      chargeMode ? `Cobrança: ${chargeMode}` : null,
      `Vencimento: ${dueDate}`,
    ]
      .filter(Boolean)
      .join(' · ')

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
        daysBefore: 0,
        dedupeKeyBuilder: (userId, channel) =>
          buildSplitOverdueDedupeKey(split.id, periodKey, userId, channel),
        metadata: {
          kind: 'split_overdue',
          splitId: split.id,
          daysUntilDue,
          overdueDays,
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
        dedupeKey: buildSplitOverdueDedupeKey(
          split.id,
          periodKey,
          split.contactPhone,
          'whatsapp'
        ),
        metadata: {
          kind: 'split_external_overdue',
          splitId: split.id,
          daysUntilDue,
          overdueDays,
          amount: splitAmount,
          dueDate,
          externalPhone: split.contactPhone,
          externalName: split.contactName,
        },
      })
    }
  }

  return created
}

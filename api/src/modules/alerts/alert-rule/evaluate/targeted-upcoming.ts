import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { transactions } from '@/db/schemas/transactions'
import { centavosToString } from '@/core/money'

import {
  buildDebtReminderTitle,
  buildUpcomingRuleDedupeKey,
} from '../../alert-utils'
import { isUpcomingConfig } from '../../alert-rule.repository'
import type { AlertRuleRecord } from '../../alert-rule.repository'
import { resolveDueDateForTransaction } from '../due'
import {
  createExternalNotification,
  createNotificationsForOrgMembers,
  createNotificationsForUser,
} from '../notifications'
import type { PendingTransactionRow } from '../types'
import type { EvaluateNotifyDeps } from './deps'
import { resolveRule } from './resolve-rule'

export async function dispatchTargetedNotification(
  deps: EvaluateNotifyDeps,
  params: {
    rule: AlertRuleRecord
    transaction: PendingTransactionRow
    daysUntilDue: number
    daysBefore: number
    skipDedupe?: boolean
    limitToUserId?: string
  }
): Promise<number> {
  const amount = centavosToString(params.transaction.amount)
  const dueDate = resolveDueDateForTransaction(params.transaction).toISOString()
  const title = buildDebtReminderTitle(params.transaction.title, params.daysUntilDue)
  const body = amount ? `Valor: R$ ${amount} · Vencimento: ${dueDate}` : `Vencimento: ${dueDate}`

  if (params.transaction.notifyTargetType === 'member') {
    return createNotificationsForOrgMembers({
      organizationId: params.transaction.organizationId,
      limitToUserId: params.limitToUserId,
      createForUser: userId =>
        createNotificationsForUser(deps.notificationRepository, {
          rule: params.rule,
          userId,
          transactionId: params.transaction.id,
          accountId: params.transaction.accountId,
          organizationId: params.transaction.organizationId,
          title,
          body,
          daysUntilDue: params.daysUntilDue,
          daysBefore: params.daysBefore,
          dedupeKeyBuilder: (memberId, channel) =>
            buildUpcomingRuleDedupeKey(
              params.rule.id,
              params.transaction.id,
              params.daysBefore,
              memberId,
              channel
            ),
          metadata: {
            kind: 'targeted_upcoming',
            daysUntilDue: params.daysUntilDue,
            daysBefore: params.daysBefore,
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
      rule: params.rule,
      transactionId: params.transaction.id,
      phone: params.transaction.notifyContactPhone,
      contactName: params.transaction.notifyContactName,
      title,
      body,
      dedupeKey: `external:${params.transaction.id}:day-${params.daysBefore}:${params.transaction.notifyContactPhone}:whatsapp`,
      metadata: {
        kind: 'target_external',
        daysUntilDue: params.daysUntilDue,
        daysBefore: params.daysBefore,
        amount,
        dueDate,
        externalPhone: params.transaction.notifyContactPhone,
        externalName: params.transaction.notifyContactName,
      },
      onSent: async () => {
        await db
          .update(transactions)
          .set({ notifyLastNotifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(transactions.id, params.transaction.id))
      },
    })
  }

  return 0
}

export async function evaluateTargetedTransaction(
  deps: EvaluateNotifyDeps,
  params: {
    rules: AlertRuleRecord[]
    transaction: PendingTransactionRow
    daysUntilDue: number
    skipDedupe?: boolean
    limitToUserId?: string
  }
): Promise<number> {
  if (params.daysUntilDue < 0) return 0

  const pseudoRow = {
    id: params.transaction.id,
    organizationId: params.transaction.organizationId,
    accountId: params.transaction.accountId,
    recurringTransactionId: params.transaction.recurringTransactionId,
    title: params.transaction.title,
    amount: params.transaction.amount,
    date: params.transaction.date,
  }

  const rule = resolveRule(params.rules, pseudoRow, 'upcoming')
  if (!rule || !isUpcomingConfig(rule.config)) return 0

  const daysBeforeList = params.transaction.notifyDaysBefore ?? rule.config.daysBefore
  const matchingDay = daysBeforeList.find(day => day === params.daysUntilDue)
  if (matchingDay === undefined) return 0

  return dispatchTargetedNotification(deps, {
    rule,
    transaction: params.transaction,
    daysUntilDue: params.daysUntilDue,
    daysBefore: matchingDay,
    skipDedupe: params.skipDedupe,
    limitToUserId: params.limitToUserId,
  })
}

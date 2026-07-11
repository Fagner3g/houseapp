import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organizations'

import type { AlertRuleRecord } from '../../alert-rule.repository'
import {
  buildOwnerResidualCreateInputs,
  collectOwnerResidualAlerts,
} from '../../owner-residual-alerts'
import {
  loadCreditCardLedgerByAccount,
  loadResidualTransactions,
  loadStatementsByAccount,
} from '../loaders'
import { createNotificationsForUser } from '../notifications'
import type { AlertEvaluateMode } from '../types'
import type { EvaluateNotifyDeps } from './deps'

export async function evaluateOwnerResidualAlerts(
  deps: Pick<EvaluateNotifyDeps, 'notificationRepository'>,
  params: {
    organizationId: string
    rules: AlertRuleRecord[]
    mode: AlertEvaluateMode
    delegatedTransactionIds: Set<string>
    targetUserId?: string
    skipDedupe?: boolean
  }
): Promise<number> {
  const [org] = await db
    .select({ ownerId: organizations.ownerId, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, params.organizationId))
    .limit(1)

  if (!org?.ownerId) return 0
  if (params.targetUserId && params.targetUserId !== org.ownerId) return 0

  const { markPurchasesPaidForPaidStatements } = await import(
    '@/modules/statements/settle-paid-statements'
  )
  await markPurchasesPaidForPaidStatements(params.organizationId)

  const residualRows = await loadResidualTransactions(params.organizationId)
  const [creditCardLedgerByAccountId, statementsByAccountId] = await Promise.all([
    loadCreditCardLedgerByAccount(params.organizationId),
    loadStatementsByAccount(params.organizationId),
  ])
  const collected = collectOwnerResidualAlerts(residualRows, params.delegatedTransactionIds, {
    creditCardLedgerByAccountId,
    statementsByAccountId,
  })
  const inputs = buildOwnerResidualCreateInputs({
    mode: params.mode,
    rules: params.rules,
    invoices: collected.invoices,
    transactions: collected.transactions,
    organizationName: org.name,
  })

  let created = 0
  for (const input of inputs) {
    created += await createNotificationsForUser(deps.notificationRepository, {
      rule: input.rule,
      userId: org.ownerId,
      transactionId: input.transactionId,
      accountId: input.accountId,
      organizationId: params.organizationId,
      title: input.title,
      body: input.body,
      daysUntilDue: input.daysUntilDue,
      daysBefore: input.daysBefore,
      dedupeKeyBuilder: input.dedupeKeyBuilder,
      metadata: input.metadata,
      skipDedupe: params.skipDedupe,
    })
  }

  return created
}

import { and, eq, inArray } from 'drizzle-orm'
import {
  computeInvoiceMetrics,
  isInvoicePaymentTitle,
  parseInvoicePaymentMonthKey,
  resolvePurchasesPeriod,
} from '@houseapp/finance-core'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import { statements } from '@/db/schemas/statements'
import { transactions } from '@/db/schemas/transactions'
import { getBillingCycle } from '@/core/billing-cycle'

import {
  findPreviousStatementForCycle,
  findStatementForCycle,
} from '@/modules/alerts/owner-residual-alerts/statement-match'
import {
  toStatementLike,
  toTransactionLike,
  residualStatementFromRow,
} from '@/modules/alerts/owner-residual-alerts/metric-map'
import { markNonSplitCyclePurchasesPaid } from './mark-cycle-purchases-paid'

/** After manual "Pagamento Fatura" income, mark non-split purchases when remaining hits 0. */
export async function maybeMarkPurchasesAfterInvoicePayment(params: {
  organizationId: string
  accountId: string
  title: string
  type: 'income' | 'expense' | 'transfer'
  paidAt?: Date | null
}): Promise<void> {
  if (params.type !== 'income' || !isInvoicePaymentTitle(params.title)) return

  const monthKey = parseInvoicePaymentMonthKey(params.title)
  if (!monthKey) return

  const [account] = await db
    .select({
      id: accounts.id,
      closingDay: accounts.closingDay,
      dueDay: accounts.dueDay,
      type: accounts.type,
    })
    .from(accounts)
    .where(
      and(eq(accounts.id, params.accountId), eq(accounts.organizationId, params.organizationId))
    )
    .limit(1)

  if (
    !account ||
    account.type !== 'credit_card' ||
    account.closingDay == null ||
    account.dueDay == null
  ) {
    return
  }

  const cycle = getBillingCycle(account.closingDay, account.dueDay, monthKey)
  const accountStatements = (await db.select().from(statements).where(eq(statements.accountId, account.id))).map(
    residualStatementFromRow
  )

  const statement = findStatementForCycle(accountStatements, cycle, {
    closingDay: account.closingDay,
    dueDay: account.dueDay,
  })
  const previousStatement = findPreviousStatementForCycle(
    accountStatements,
    cycle,
    account.closingDay,
    account.dueDay
  )

  const ledgerRows = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      title: transactions.title,
      amount: transactions.amount,
      type: transactions.type,
      date: transactions.date,
      competenceDate: transactions.competenceDate,
      statementId: transactions.statementId,
      source: transactions.source,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, params.organizationId),
        eq(transactions.accountId, account.id),
        inArray(transactions.type, ['expense', 'income'])
      )
    )

  const metrics = computeInvoiceMetrics(
    cycle,
    statement ? toStatementLike(statement) : null,
    ledgerRows
      .filter((row): row is typeof row & { accountId: string } => Boolean(row.accountId))
      .map(row =>
        toTransactionLike({
          id: row.id,
          accountId: row.accountId,
          title: row.title,
          amount: row.amount,
          type: row.type,
          date: row.date,
          competenceDate: row.competenceDate,
          statementId: row.statementId,
          source: row.source,
        })
      ),
    {
      previousStatement: previousStatement ? toStatementLike(previousStatement) : null,
      closingDay: account.closingDay,
      dueDay: account.dueDay,
    }
  )

  if (metrics.remaining > 0n) return

  const purchasesPeriod = resolvePurchasesPeriod(
    cycle,
    statement ? toStatementLike(statement) : null
  )

  await markNonSplitCyclePurchasesPaid({
    organizationId: params.organizationId,
    accountId: account.id,
    statementId: statement?.id ?? null,
    periodStart: purchasesPeriod.start,
    periodEnd: purchasesPeriod.end,
    paidAt: params.paidAt ?? new Date(),
  })

  if (statement && !statement.isPaid) {
    await db.update(statements).set({ isPaid: true }).where(eq(statements.id, statement.id))
  }
}

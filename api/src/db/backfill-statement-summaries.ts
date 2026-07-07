import { and, eq, isNull } from 'drizzle-orm'

import { centavosToString, parseCentavos } from '@/core/money'
import { client, db } from '@/db'
import { statements } from '@/db/schemas/statements'
import { transactions } from '@/db/schemas/transactions'
import { resolveImportedSummaryForImport } from '@/modules/statements/statement-invoice-summary'

async function backfillStatementSummaries() {
  const rows = await db
    .select({
      id: statements.id,
      fileName: statements.fileName,
      isClosed: statements.isClosed,
      totalAmount: statements.totalAmount,
      periodStart: statements.periodStart,
      periodEnd: statements.periodEnd,
      dueDate: statements.dueDate,
      purchasesTotal: statements.purchasesTotal,
      previousBalance: statements.previousBalance,
      paymentsReceived: statements.paymentsReceived,
    })
    .from(statements)
    .where(
      and(
        eq(statements.isClosed, true),
        isNull(statements.purchasesTotal)
      )
    )

  let updated = 0

  for (const row of rows) {
    if (!row.totalAmount || !row.periodStart || !row.periodEnd || !row.dueDate) {
      console.warn(`Pulando ${row.fileName ?? row.id}: datas ou total ausentes`)
      continue
    }

    const txRows = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .where(eq(transactions.statementId, row.id))

    const summary = resolveImportedSummaryForImport({
      isClosed: true,
      totalAmount: centavosToString(row.totalAmount)!,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      dueDate: row.dueDate.toISOString(),
      transactions: txRows.map(tx => ({
        type: tx.type,
        amount: centavosToString(tx.amount)!,
        date: tx.date.toISOString(),
      })),
      previousBalance: centavosToString(row.previousBalance),
      purchasesTotal: centavosToString(row.purchasesTotal),
      paymentsReceived: centavosToString(row.paymentsReceived),
    })

    if (!summary.purchasesTotal) continue

    await db
      .update(statements)
      .set({
        purchasesTotal: parseCentavos(summary.purchasesTotal),
        previousBalance:
          summary.previousBalance != null ? parseCentavos(summary.previousBalance) : null,
        paymentsReceived:
          summary.paymentsReceived != null ? parseCentavos(summary.paymentsReceived) : null,
      })
      .where(eq(statements.id, row.id))

    console.log(
      `${row.fileName ?? row.id}: compras ${summary.purchasesTotal}, saldo ant. ${summary.previousBalance}, pagtos ${summary.paymentsReceived}`
    )
    updated += 1
  }

  console.log(`Faturas atualizadas: ${updated}`)
}

backfillStatementSummaries()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => client.end())

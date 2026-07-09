import { eq, inArray, sql } from 'drizzle-orm'

import { DrizzleStatementRepository } from '@/modules/statements/statement.repository'
import { billingDaysFromStatementDates } from '@/core/billing-cycle'
import { client, db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import { statements } from '@/db/schemas/statements'
import { transactions } from '@/db/schemas/transactions'

const MONTH_MAP: Record<string, number> = {
  JAN: 1,
  FEV: 2,
  MAR: 3,
  ABR: 4,
  MAI: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SET: 9,
  OUT: 10,
  NOV: 11,
  DEZ: 12,
}

function paymentDateFromTitle(title: string, fallbackYear: number): Date | null {
  const match = title.match(/Pagamento em (\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/i)
  if (!match) return null

  const day = Number.parseInt(match[1] as string, 10)
  const month = MONTH_MAP[(match[2] as string).toUpperCase()]
  if (!month) return null

  return new Date(Date.UTC(fallbackYear, month - 1, day, 12, 0, 0))
}

async function removeManualInvoicePaymentsForOfxAccounts() {
  const manualRows = await db
    .select({
      id: transactions.id,
      transferPairId: transactions.transferPairId,
    })
    .from(transactions)
    .where(
      sql`${transactions.source} = 'manual'
        and ${transactions.externalId} is null
        and ${transactions.title} ilike 'Pagamento Fatura %'
        and ${transactions.accountId} in (
          select distinct ${statements.accountId}
          from ${statements}
          where ${statements.importSource} in ('ofx', 'csv')
        )`
    )

  const idsToDelete = new Set<string>()

  for (const row of manualRows) {
    idsToDelete.add(row.id)
    if (row.transferPairId) {
      idsToDelete.add(row.transferPairId)
    }
  }

  if (idsToDelete.size === 0) {
    console.log('Pagamentos manuais duplicados removidos: 0')
    return 0
  }

  const idList = [...idsToDelete]
  await db.delete(transactions).where(inArray(transactions.id, idList))

  console.log(`Pagamentos manuais duplicados removidos: ${idList.length}`)
  return idList.length
}

async function removeSyntheticPaymentsFromStructuredImports() {
  const syntheticRows = await db
    .select({
      id: transactions.id,
      transferPairId: transactions.transferPairId,
      statementId: transactions.statementId,
    })
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(
      sql`${statements.importSource} in ('ofx', 'csv')
        and ${transactions.source} in ('import', 'manual')
        and ${transactions.externalId} is null
        and (
          ${transactions.title} ilike 'Pagamento Fatura %'
          or ${transactions.title} ilike 'Pagamento de fatura importada%'
        )`
    )

  const idsToDelete = new Set<string>()

  for (const row of syntheticRows) {
    idsToDelete.add(row.id)
    if (row.transferPairId) {
      idsToDelete.add(row.transferPairId)
    }
  }

  if (idsToDelete.size === 0) {
    console.log('Pagamentos sintéticos removidos: 0')
    return 0
  }

  const idList = [...idsToDelete]

  await db.delete(transactions).where(inArray(transactions.id, idList))

  const affectedStatements = new Set(syntheticRows.map(row => row.statementId))

  for (const statementId of affectedStatements) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(eq(transactions.statementId, statementId))

    await db
      .update(statements)
      .set({ transactionsCount: count })
      .where(eq(statements.id, statementId))
  }

  console.log(`Pagamentos sintéticos removidos: ${idList.length}`)
  return idList.length
}

async function repairCrossInvoicePayments() {
  const ofxAccounts = await db
    .selectDistinct({ accountId: statements.accountId })
    .from(statements)
    .where(eq(statements.importSource, 'ofx'))

  const repository = new DrizzleStatementRepository()
  let moved = 0

  for (const row of ofxAccounts) {
    moved += await repository.reconcileCrossInvoicePayments(row.accountId)
  }

  return moved
}

async function syncBillingDaysFromStructuredImports() {
  const structuredStatements = await db
    .select({
      accountId: statements.accountId,
      closingDate: statements.closingDate,
      dueDate: statements.dueDate,
    })
    .from(statements)
    .where(inArray(statements.importSource, ['pdf', 'ofx']))

  const latestByAccount = new Map<
    string,
    { closingDate: Date; dueDate: Date }
  >()

  for (const statement of structuredStatements) {
    if (!statement.closingDate || !statement.dueDate) continue

    const existing = latestByAccount.get(statement.accountId)
    if (!existing || statement.closingDate > existing.closingDate) {
      latestByAccount.set(statement.accountId, {
        closingDate: statement.closingDate,
        dueDate: statement.dueDate,
      })
    }
  }

  let accountsUpdated = 0

  for (const [accountId, dates] of latestByAccount) {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1)

    if (!account || account.type !== 'credit_card') continue

    const { closingDay, dueDay } = billingDaysFromStatementDates(
      dates.closingDate,
      dates.dueDate
    )

    if (account.closingDay !== closingDay || account.dueDay !== dueDay) {
      await db
        .update(accounts)
        .set({ closingDay, dueDay, updatedAt: new Date() })
        .where(eq(accounts.id, account.id))
      accountsUpdated += 1
    }
  }

  return accountsUpdated
}

async function repairImportedStatements() {
  const crossInvoiceMoved = await repairCrossInvoicePayments()
  let accountsUpdated = await syncBillingDaysFromStructuredImports()
  let paymentsFixed = 0
  let incomeMarkedPaid = 0

  const manualRemoved = await removeManualInvoicePaymentsForOfxAccounts()
  const syntheticRemoved = await removeSyntheticPaymentsFromStructuredImports()

  const pdfStatements = await db
    .select({
      id: statements.id,
      accountId: statements.accountId,
      closingDate: statements.closingDate,
      dueDate: statements.dueDate,
      periodStart: statements.periodStart,
      isClosed: statements.isClosed,
    })
    .from(statements)
    .where(eq(statements.importSource, 'pdf'))

  for (const statement of pdfStatements) {
    if (!statement.closingDate || !statement.dueDate) continue

    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, statement.accountId))
      .limit(1)

    if (!account || account.type !== 'credit_card') continue

    const { closingDay, dueDay } = billingDaysFromStatementDates(
      statement.closingDate,
      statement.dueDate
    )

    if (account.closingDay !== closingDay || account.dueDay !== dueDay) {
      await db
        .update(accounts)
        .set({ closingDay, dueDay, updatedAt: new Date() })
        .where(eq(accounts.id, account.id))
      accountsUpdated += 1
    }

    const fallbackYear = statement.periodStart?.getUTCFullYear() ?? statement.dueDate.getUTCFullYear()

    const rows = await db
      .select({
        id: transactions.id,
        title: transactions.title,
        type: transactions.type,
        status: transactions.status,
        date: transactions.date,
        amount: transactions.amount,
      })
      .from(transactions)
      .where(eq(transactions.statementId, statement.id))

    for (const row of rows) {
      if (row.type === 'income') {
        const correctedDate = paymentDateFromTitle(row.title, fallbackYear)

        if (correctedDate && row.date.getTime() !== correctedDate.getTime()) {
          await db
            .update(transactions)
            .set({
              date: correctedDate,
              status: 'paid',
              paidAt: correctedDate,
              paidAmount: row.amount,
              updatedAt: new Date(),
            })
            .where(eq(transactions.id, row.id))
          paymentsFixed += 1
          continue
        }

        if (statement.isClosed && row.status === 'pending') {
          await db
            .update(transactions)
            .set({
              status: 'paid',
              paidAt: row.date,
              paidAmount: row.amount,
              updatedAt: new Date(),
            })
            .where(eq(transactions.id, row.id))
          incomeMarkedPaid += 1
        }
      }
    }
  }

  console.log(`Pagamentos OFX realocados entre faturas: ${crossInvoiceMoved}`)
  console.log(`Contas atualizadas: ${accountsUpdated}`)
  console.log(`Pagamentos manuais duplicados removidos (OFX/CSV): ${manualRemoved}`)
  console.log(`Pagamentos sintéticos removidos (OFX/CSV): ${syntheticRemoved}`)
  console.log(`Pagamentos com data corrigida: ${paymentsFixed}`)
  console.log(`Créditos marcados como pagos: ${incomeMarkedPaid}`)
}

repairImportedStatements()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => client.end())

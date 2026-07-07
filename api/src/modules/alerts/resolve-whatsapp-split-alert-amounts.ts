import { and, eq, inArray } from 'drizzle-orm'

import { centavosToString } from '@/core/money'
import { db } from '@/db'
import { transactionSplits } from '@/db/schemas/transactionSplits'
import { transactions } from '@/db/schemas/transactions'
import {
  buildSplitDebtSummary,
  personKey,
  resolvePersonShareInstallmentAmountCentavos,
} from '@/modules/splits/split-debt-summary.logic'
import type { TransactionRecord } from '@/modules/transactions/transaction.repository'

import { loadInstallmentSiblingTransactions } from './load-installment-siblings'
import type { WhatsAppAlertAmounts } from './resolve-whatsapp-alert-amounts'
import {
  filterInstallmentSiblings,
  resolveWhatsAppAlertAmounts,
} from './resolve-whatsapp-alert-amounts'

type SplitAlertContextInput = {
  transactionId: string
  splitId?: string | null
  amountOverride?: string | null
}

export async function resolveWhatsAppSplitAlertAmounts(
  input: SplitAlertContextInput
): Promise<WhatsAppAlertAmounts | null> {
  const [anchor] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, input.transactionId))
    .limit(1)

  if (!anchor) return null

  const siblingRows = await loadInstallmentSiblingTransactions(anchor)
  const siblingCandidates = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, anchor.organizationId),
        anchor.installmentsTotal != null && anchor.installmentsTotal >= 2
          ? eq(transactions.installmentsTotal, anchor.installmentsTotal)
          : eq(transactions.id, anchor.id)
      )
    )

  const siblings = filterInstallmentSiblings(siblingCandidates, anchor as TransactionRecord)
  const transactionIds = (siblings.length > 0 ? siblings : [anchor]).map(row => row.id)

  const splitRows = await db
    .select({
      split: transactionSplits,
      installmentNumber: transactions.installmentNumber,
      transactionAmount: transactions.amount,
    })
    .from(transactionSplits)
    .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
    .where(inArray(transactionSplits.transactionId, transactionIds))

  const relevantSplits = splitRows.map(row => ({
    ...row.split,
    installmentNumber: row.installmentNumber,
    transactionAmount: row.transactionAmount,
    userName: null,
  }))

  const targetSplit =
    (input.splitId
      ? relevantSplits.find(split => split.id === input.splitId)
      : relevantSplits.find(split => split.transactionId === input.transactionId)) ?? null

  if (!targetSplit) {
    return resolveWhatsAppAlertAmounts({
      transaction: anchor,
      siblingTransactions: siblingRows,
      isSplit: true,
      amountOverride: input.amountOverride,
    })
  }

  const personSplits = relevantSplits.filter(
    split => personKey(split) === personKey(targetSplit)
  )

  const summary = buildSplitDebtSummary({
    anchorTransaction: anchor as TransactionRecord,
    siblingTransactions: (siblings.length > 0 ? siblings : [anchor]) as TransactionRecord[],
    splits: personSplits,
    resolvePersonName: () => 'Membro',
  })

  const person = summary.persons.find(
    item => personKey(item) === personKey(targetSplit)
  )

  if (!person) return null

  const totalOwedCentavos = personSplits.reduce((sum, split) => sum + split.amount, 0n)
  const totalPaidCentavos = personSplits.reduce((sum, split) => sum + split.paidAmount, 0n)
  const shareInstallmentCentavos = resolvePersonShareInstallmentAmountCentavos({
    totalOwedCentavos,
    installmentsTotal: anchor.installmentsTotal,
    installmentNumber: anchor.installmentNumber,
    currentSplitAmountCentavos: targetSplit.amount,
    materializedInstallmentSplits: person.installments.length,
  })

  const baseAmounts = resolveWhatsAppAlertAmounts({
    transaction: anchor,
    siblingTransactions: siblingRows,
    isSplit: true,
  })

  const totalRemainingCentavos = totalOwedCentavos - totalPaidCentavos

  return {
    ...baseAmounts,
    splitAmount: centavosToString(totalOwedCentavos),
    splitShareInstallmentAmount: centavosToString(shareInstallmentCentavos),
    splitPaidAmount: centavosToString(totalPaidCentavos),
    splitRemainingAmount: centavosToString(
      totalRemainingCentavos < 0n ? 0n : totalRemainingCentavos
    ),
    amount: centavosToString(totalRemainingCentavos < 0n ? 0n : totalRemainingCentavos),
  }
}

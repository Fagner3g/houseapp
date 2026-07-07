import dayjs from 'dayjs'

import { parseCentavos } from '@/core/money'

import type { ImportStatementBody } from './statement.schema'

export type StatementTransactionDuplicateMatch = {
  isDuplicate: boolean
  duplicateTransactionId: string | null
  duplicateTransactionTitle: string | null
}

export type ExistingTransactionCandidate = {
  id: string
  title: string
  amount: bigint
  date: Date
  externalId: string | null
}

export function findTransactionDuplicateMatch(
  item: {
    amount: string
    date: string
    externalId?: string
  },
  existingExternalIds: Set<string>,
  candidates: ExistingTransactionCandidate[]
): StatementTransactionDuplicateMatch {
  if (item.externalId && existingExternalIds.has(item.externalId)) {
    const byExternalId = candidates.find(candidate => candidate.externalId === item.externalId)
    return {
      isDuplicate: true,
      duplicateTransactionId: byExternalId?.id ?? null,
      duplicateTransactionTitle: byExternalId?.title ?? null,
    }
  }

  const amount = parseCentavos(item.amount)
  const date = new Date(item.date)

  const byAmountDate = candidates.find(candidate => {
    if (candidate.amount !== amount) return false
    const diffDays = Math.abs(dayjs(candidate.date).diff(dayjs(date), 'day'))
    return diffDays <= 2
  })

  if (byAmountDate) {
    return {
      isDuplicate: true,
      duplicateTransactionId: byAmountDate.id,
      duplicateTransactionTitle: byAmountDate.title,
    }
  }

  return {
    isDuplicate: false,
    duplicateTransactionId: null,
    duplicateTransactionTitle: null,
  }
}

export function annotateTransactionDuplicates(
  transactions: ImportStatementBody['transactions'],
  existingExternalIds: Set<string>,
  candidates: ExistingTransactionCandidate[]
): Array<
  ImportStatementBody['transactions'][number] & StatementTransactionDuplicateMatch
> {
  return transactions.map(tx =>
    Object.assign(tx, findTransactionDuplicateMatch(tx, existingExternalIds, candidates))
  )
}

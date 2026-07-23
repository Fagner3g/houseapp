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

export type ImportDuplicateLookup = {
  amount: string
  date: string
  title?: string
  externalId?: string
  alternateExternalIds?: string[]
}

export function normalizeImportTitle(title: string): string {
  return title.trim().toLowerCase()
}

export function collectExternalIdLookups(
  item: Pick<ImportDuplicateLookup, 'externalId' | 'alternateExternalIds'>
): string[] {
  const ids = [item.externalId, ...(item.alternateExternalIds ?? [])].filter(
    (id): id is string => !!id
  )
  return [...new Set(ids)]
}

export function findFuzzyDuplicateCandidate(
  item: ImportDuplicateLookup,
  candidates: ExistingTransactionCandidate[]
): ExistingTransactionCandidate | null {
  const amount = parseCentavos(item.amount)
  const date = new Date(item.date)
  const title = item.title ? normalizeImportTitle(item.title) : null

  const matches = candidates.filter(candidate => {
    if (candidate.amount !== amount) return false
    if (title && normalizeImportTitle(candidate.title) !== title) return false
    const diffDays = Math.abs(dayjs(candidate.date).diff(dayjs(date), 'day'))
    return diffDays <= 2
  })

  if (matches.length === 0) return null

  matches.sort(
    (a, b) =>
      Math.abs(dayjs(a.date).diff(dayjs(date), 'day')) -
      Math.abs(dayjs(b.date).diff(dayjs(date), 'day'))
  )

  return matches[0] ?? null
}

export function findTransactionDuplicateMatch(
  item: ImportDuplicateLookup,
  existingExternalIds: Set<string>,
  candidates: ExistingTransactionCandidate[]
): StatementTransactionDuplicateMatch {
  const lookupIds = collectExternalIdLookups(item)

  for (const id of lookupIds) {
    if (!existingExternalIds.has(id)) continue
    const byExternalId = candidates.find(candidate => candidate.externalId === id)
    return {
      isDuplicate: true,
      duplicateTransactionId: byExternalId?.id ?? null,
      duplicateTransactionTitle: byExternalId?.title ?? null,
    }
  }

  const fuzzy = findFuzzyDuplicateCandidate(item, candidates)
  if (fuzzy) {
    return {
      isDuplicate: true,
      duplicateTransactionId: fuzzy.id,
      duplicateTransactionTitle: fuzzy.title,
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

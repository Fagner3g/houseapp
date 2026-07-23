import { centavosToString } from '@/core/money'

import {
  collectExternalIdLookups,
  findFuzzyDuplicateCandidate,
  type ExistingTransactionCandidate,
} from './statement-duplicate-detection'

export type ImportDedupeDecision =
  | { action: 'insert' }
  | {
      action: 'skip'
      existingId: string
      /** Bank corrected DTPOSTED and/or we migrate to a stable external id. */
      patch?: { date: Date; externalId: string | null }
    }

export function decideImportedTransaction(
  item: {
    title: string
    amount: bigint
    date: Date
    externalId?: string | null
    alternateExternalIds?: string[]
  },
  existingByExternalId: Map<string, ExistingTransactionCandidate>,
  fuzzyCandidates: ExistingTransactionCandidate[],
  claimedExistingIds: Set<string>
): ImportDedupeDecision {
  const lookupIds = collectExternalIdLookups(item)

  for (const id of lookupIds) {
    const existing = existingByExternalId.get(id)
    if (!existing || claimedExistingIds.has(existing.id)) continue

    const needsPatch =
      existing.date.getTime() !== item.date.getTime() ||
      (item.externalId != null && existing.externalId !== item.externalId)

    return {
      action: 'skip',
      existingId: existing.id,
      patch: needsPatch
        ? { date: item.date, externalId: item.externalId ?? existing.externalId }
        : undefined,
    }
  }

  const amountString = centavosToString(item.amount)
  if (!amountString) return { action: 'insert' }

  const fuzzy = findFuzzyDuplicateCandidate(
    {
      title: item.title,
      amount: amountString,
      date: item.date.toISOString(),
      externalId: item.externalId ?? undefined,
      alternateExternalIds: item.alternateExternalIds,
    },
    fuzzyCandidates.filter(candidate => !claimedExistingIds.has(candidate.id))
  )

  if (!fuzzy) return { action: 'insert' }

  const needsPatch =
    fuzzy.date.getTime() !== item.date.getTime() ||
    (item.externalId != null && fuzzy.externalId !== item.externalId)

  return {
    action: 'skip',
    existingId: fuzzy.id,
    patch: needsPatch
      ? { date: item.date, externalId: item.externalId ?? fuzzy.externalId }
      : undefined,
  }
}

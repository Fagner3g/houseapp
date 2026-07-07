import type { ImportStatementBody } from './statement.schema'

export type StatementSplitHint = {
  mode: 'half' | 'custom' | 'full_other'
  userId?: string | null
  contactName?: string | null
  contactPhone?: string | null
  amount?: string
}

export function normalizeTitleForSplit(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*-\s*parcela\s+\d+\/\d+/gi, '')
    .replace(/\s+parcela\s+\d+\/\d+/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

export function inferModeFromAmounts(
  splitAmount: bigint,
  txAmount: bigint
): StatementSplitHint['mode'] {
  if (txAmount <= 0n) return 'full_other'
  if (splitAmount * 2n === txAmount) return 'half'
  if (splitAmount === txAmount) return 'full_other'
  return 'custom'
}

export function sanitizeSplitHint(hint: StatementSplitHint): StatementSplitHint {
  return {
    mode: hint.mode,
    amount: hint.amount,
  }
}

export function inferSplitsFromCardOwners(
  userId: string,
  items: Array<{
    cardLastFour?: string | null
    splitHint?: StatementSplitHint | null
    [key: string]: unknown
  }>,
  cardUserByLastFour: Map<string, string | null>
) {
  return items.map(item => {
    if (item.splitHint != null || !item.cardLastFour) {
      return item
    }

    const cardUserId = cardUserByLastFour.get(item.cardLastFour)
    if (!cardUserId || cardUserId === userId) {
      return item
    }

    return {
      ...item,
      splitHint: {
        mode: 'full_other' as const,
        userId: cardUserId,
      },
    }
  })
}

export function applySplitHintsToTransactions(
  items: ImportStatementBody['transactions']
): ImportStatementBody['transactions'] {
  return items
}

export function countInferredSplits(transactions: ImportStatementBody['transactions']): number {
  return transactions.filter(transaction => transaction.splitHint != null).length
}
